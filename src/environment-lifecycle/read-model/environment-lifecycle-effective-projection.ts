import type {
  DevIntegrationProfile,
} from "../model/dev-integration-profile.ts";
import type {
  EnvironmentLifecycleOperationReceipt,
} from "../model/environment-lifecycle-command.ts";
import type {
  ProductReleaseCapability,
} from "../model/product-release-capability.ts";
import {
  environmentProductSubjectRef,
  environmentProfileSubjectRef,
} from "../work-model/commands/environment-lifecycle-command-factory.ts";
import {
  selectProductReleaseNextMove,
} from "./product-release-selectors.ts";

export type EnvironmentLifecycleEffectiveProjection = Readonly<{
  products: readonly ProductReleaseCapability[];
  profiles: readonly DevIntegrationProfile[];
  subjectVersions: Readonly<Record<string, string>>;
  unappliedReceiptRefs: readonly string[];
}>;

export function projectEnvironmentLifecycleEffectiveState({
  receipts,
  sourceProducts,
  sourceProfiles,
}: {
  receipts: readonly EnvironmentLifecycleOperationReceipt[];
  sourceProducts: readonly ProductReleaseCapability[];
  sourceProfiles: readonly DevIntegrationProfile[];
}): EnvironmentLifecycleEffectiveProjection {
  let profiles = [...sourceProfiles];
  let products = [...sourceProducts];
  const subjectVersions = new Map<string, string>();
  const unappliedReceiptRefs: string[] = [];

  for (const profile of sourceProfiles) {
    subjectVersions.set(
      environmentProfileSubjectRef(profile.profileId),
      profile.source.version,
    );
  }
  for (const product of sourceProducts) {
    subjectVersions.set(
      environmentProductSubjectRef(product.productId),
      product.source.version,
    );
  }

  const orderedReceipts = [...receipts].sort(
    (left, right) =>
      left.sequence - right.sequence ||
      left.receiptRef.localeCompare(right.receiptRef),
  );

  for (const receipt of orderedReceipts) {
    const currentVersion =
      subjectVersions.get(receipt.subjectRef) ?? "unregistered";

    if (
      receipt.outcome !== "succeeded" ||
      receipt.effect === null
    ) {
      continue;
    }
    if (receipt.sourceVersion !== currentVersion) {
      unappliedReceiptRefs.push(receipt.receiptRef);
      continue;
    }

    const effect = receipt.effect;

    switch (effect.kind) {
      case "profile-request":
        profiles = [
          ...profiles.filter(
            (profile) =>
              profile.profileId !== effect.profile.profileId,
          ),
          effect.profile,
        ];
        break;
      case "profile-action":
        profiles = profiles.map((profile) => {
          if (
            environmentProfileSubjectRef(profile.profileId) !==
            receipt.subjectRef
          ) {
            return profile;
          }

          return {
            ...profile,
            nextMove: projectProfileActionNextMove(
              profile,
              receipt.action,
              effect.runtimeState,
            ),
            runtime:
              effect.runtimeState
                ? {
                    ...profile.runtime,
                    observation: {
                      observedAt: effect.observedAt,
                      sourceRef:
                        effect.observationSourceRef ??
                        profile.runtime.observation.sourceRef,
                      state: effect.runtimeState,
                    },
                  }
                : profile.runtime,
            stageHandoff: projectProfileActionStageHandoff(
              profile,
              receipt.action,
              effect.smokeSummaryRef,
            ),
          };
        });
        break;
      case "profile-handoff":
        profiles = profiles.map((profile) =>
          environmentProfileSubjectRef(profile.profileId) ===
          receipt.subjectRef
            ? {
                ...profile,
                nextMove:
                  effect.result === "ready"
                    ? {
                        actionId: "review-stage-handoff",
                        label: "Review stage handoff",
                        ownerRef: profile.stageHandoff.ownerRepo,
                        reason:
                          "The latest prototype-local promote check is ready for operator review.",
                      }
                    : {
                        actionId: "review-promote-check",
                        label: "Review promote check",
                        ownerRef: profile.ownerRepo,
                        reason:
                          "The latest prototype-local promote check is not ready.",
                      },
                stageHandoff: {
                  ...profile.stageHandoff,
                  checkResults: effect.checkResults,
                  promotionReportRef: effect.promotionReportRef,
                  result: effect.result,
                  sessionManifestRef: effect.sessionManifestRef,
                  smokeSummaryRef: effect.smokeSummaryRef,
                },
              }
            : profile,
        );
        break;
      case "product-release":
        products = products.map((product) =>
          environmentProductSubjectRef(product.productId) ===
          receipt.subjectRef
            ? applyProductReleaseReceipt(product, receipt)
            : product,
        );
        break;
      case "product-runtime-lifecycle":
        products = products.map((product) =>
          environmentProductSubjectRef(product.productId) ===
            receipt.subjectRef && product.runtimeLifecycle
            ? projectProductRuntimeLifecycleReceipt(
                product,
                effect,
              )
            : product,
        );
        break;
    }

    subjectVersions.set(receipt.subjectRef, receipt.receiptRef);
  }

  return {
    products,
    profiles,
    subjectVersions: Object.fromEntries(subjectVersions),
    unappliedReceiptRefs,
  };
}

function applyProductReleaseReceipt(
  product: ProductReleaseCapability,
  receipt: EnvironmentLifecycleOperationReceipt,
): ProductReleaseCapability {
  const effect = receipt.effect;

  if (effect?.kind !== "product-release") {
    return product;
  }

  const targetIndex = product.releasePath.findIndex(
    (step) => step.id === effect.stepId,
  );
  if (targetIndex < 0) {
    return product;
  }

  let releasePath = product.releasePath.map((step, index) =>
    index === targetIndex
      ? {
          ...step,
          canonicalStatus: effect.canonicalStatus,
          posture: effect.stepPosture,
        }
      : step,
  );

  if (effect.stepPosture === "complete") {
    const nextIndex = releasePath.findIndex(
      (step, index) =>
        index > targetIndex && step.posture !== "complete",
    );

    if (nextIndex >= 0) {
      releasePath = releasePath.map((step, index) =>
        index === nextIndex
          ? { ...step, posture: "current" }
          : step,
      );
    }
  }

  const projectedProduct = {
    ...product,
    releasePath,
  };

  return {
    ...projectedProduct,
    nextMove: selectProductReleaseNextMove(projectedProduct),
  };
}

function projectProductRuntimeLifecycleReceipt(
  product: ProductReleaseCapability,
  effect: Extract<
    NonNullable<EnvironmentLifecycleOperationReceipt["effect"]>,
    { kind: "product-runtime-lifecycle" }
  >,
): ProductReleaseCapability {
  if (!product.runtimeLifecycle) {
    return product;
  }

  const projectedProduct = {
    ...product,
    releasePath:
      effect.verificationEffect === "preserve"
        ? product.releasePath
        : product.releasePath.map((step) =>
            step.id === "production-verification"
              ? {
                  ...step,
                  canonicalStatus: effect.verificationEffect,
                }
              : step,
          ),
    runtimeLifecycle: {
      ...product.runtimeLifecycle,
      currentState: effect.targetState,
    },
  };

  return {
    ...projectedProduct,
    nextMove: selectProductReleaseNextMove(projectedProduct),
  };
}

function projectProfileActionNextMove(
  profile: DevIntegrationProfile,
  action: EnvironmentLifecycleOperationReceipt["action"],
  runtimeState: DevIntegrationProfile["runtime"]["observation"]["state"] | null,
): DevIntegrationProfile["nextMove"] {
  if (action === "access") {
    return profile.nextMove;
  }

  if (action === "reset" && profile.lifecycle !== "active") {
    return profile.nextMove;
  }

  if (action === "down" || action === "reset") {
    return {
      actionId: "up",
      label:
        profile.runtime.stateModel === "persistent"
          ? "Resume local runtime"
          : "Start local runtime",
      ownerRef: profile.ownerRepo,
      reason:
        "The latest prototype-local command left this runtime stopped.",
    };
  }

  if (action === "smoke") {
    return {
      actionId: "promote-check",
      label: "Run promote check",
      ownerRef: profile.ownerRepo,
      reason:
        "The latest prototype-local smoke evidence is available for handoff review.",
    };
  }

  if (action === "status") {
    return projectProfileStatusNextMove(profile, runtimeState);
  }

  if (action === "up") {
    return {
      actionId: "smoke",
      label: "Run profile smoke",
      ownerRef: profile.ownerRepo,
      reason:
        "The runtime is running and requires current smoke evidence.",
    };
  }

  if (runtimeState === "stopped") {
    return {
      actionId: "up",
      label:
        profile.runtime.stateModel === "persistent"
          ? "Resume local runtime"
          : "Start local runtime",
      ownerRef: profile.ownerRepo,
      reason:
        "The latest prototype-local status observation is stopped.",
    };
  }

  return profile.nextMove;
}

function projectProfileStatusNextMove(
  profile: DevIntegrationProfile,
  runtimeState: DevIntegrationProfile["runtime"]["observation"]["state"] | null,
): DevIntegrationProfile["nextMove"] {
  if (profile.lifecycle !== "active") {
    return profile.nextMove;
  }

  if (profile.stageHandoff.result === "ready") {
    return {
      actionId: "review-stage-handoff",
      label: "Review stage handoff",
      ownerRef: profile.stageHandoff.ownerRepo,
      reason:
        "The latest prototype-local promote check is ready for operator review.",
    };
  }

  if (
    profile.stageHandoff.result === "not-ready" ||
    profile.stageHandoff.result === "failed"
  ) {
    return {
      actionId: "review-promote-check",
      label: "Review promote check",
      ownerRef: profile.ownerRepo,
      reason:
        "The latest prototype-local promote check requires operator review.",
    };
  }

  if (runtimeState === "stopped") {
    return {
      actionId: "up",
      label:
        profile.runtime.stateModel === "persistent"
          ? "Resume local runtime"
          : "Start local runtime",
      ownerRef: profile.ownerRepo,
      reason: "The latest prototype-local status observation is stopped.",
    };
  }

  if (
    runtimeState === "running" &&
    profile.stageHandoff.result !== "stale" &&
    profile.stageHandoff.smokeSummaryRef
  ) {
    return {
      actionId: "promote-check",
      label: "Run promote check",
      ownerRef: profile.ownerRepo,
      reason:
        "Current smoke evidence remains available for handoff review.",
    };
  }

  if (runtimeState === "running") {
    return {
      actionId: "smoke",
      label: "Run profile smoke",
      ownerRef: profile.ownerRepo,
      reason:
        "The runtime is running and requires current smoke evidence.",
    };
  }

  return profile.nextMove;
}

function projectProfileActionStageHandoff(
  profile: DevIntegrationProfile,
  action: EnvironmentLifecycleOperationReceipt["action"],
  smokeSummaryRef: string | null,
): DevIntegrationProfile["stageHandoff"] {
  if (action === "smoke" && smokeSummaryRef) {
    return {
      ...profile.stageHandoff,
      checkResults: [],
      promotionReportRef: null,
      result: "not-run",
      sessionManifestRef: null,
      smokeSummaryRef,
    };
  }

  if (action === "up" || action === "down" || action === "reset") {
    const hadCurrentEvidence =
      profile.stageHandoff.result !== "not-run" ||
      Boolean(profile.stageHandoff.promotionReportRef) ||
      Boolean(profile.stageHandoff.sessionManifestRef) ||
      Boolean(profile.stageHandoff.smokeSummaryRef);

    return {
      ...profile.stageHandoff,
      checkResults: [],
      promotionReportRef: null,
      result: hadCurrentEvidence ? "stale" : "not-run",
      sessionManifestRef: null,
      smokeSummaryRef: null,
    };
  }

  return profile.stageHandoff;
}
