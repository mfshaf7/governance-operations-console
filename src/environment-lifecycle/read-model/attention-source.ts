import type {
  ConsoleAttentionCandidate,
  ConsoleAttentionSource,
  ConsoleAttentionSourceMode,
} from "../../console-integration/attention-contract";
import { consoleAttentionSourceRegistrations } from "../../console-integration/attention-source-registry";
import {
  devIntegrationProfileFixtures,
} from "../fixtures/dev-integration-profiles.fixture";
import {
  productReleaseCapabilityFixtures,
} from "../fixtures/product-release-capabilities.fixture";
import { getEnvironmentLifecycleLocalRuntime } from "../local-runtime/environment-lifecycle-runtime-provider.ts";
import type { DevIntegrationProfile } from "../model/dev-integration-profile";
import type { ProductReleaseCapability } from "../model/product-release-capability";
import { selectProductReleaseNextMove } from "./product-release-selectors";

const devRegistration =
  consoleAttentionSourceRegistrations.devIntegration;
const releaseRegistration =
  consoleAttentionSourceRegistrations.governedReleases;
const environmentRuntime = getEnvironmentLifecycleLocalRuntime({
  products: productReleaseCapabilityFixtures,
  profiles: devIntegrationProfileFixtures,
});
let cachedRuntimeSnapshot = environmentRuntime.getSnapshot();
let cachedDevAttentionSnapshot = devIntegrationAttentionSnapshot(
  cachedRuntimeSnapshot,
);
let cachedReleaseAttentionSnapshot = governedReleaseAttentionSnapshot(
  cachedRuntimeSnapshot,
);

export const devIntegrationAttentionSource: ConsoleAttentionSource = {
  getSnapshot() {
    refreshEnvironmentAttentionSnapshots();
    return cachedDevAttentionSnapshot;
  },
  registration: devRegistration,
  subscribe: environmentRuntime.subscribe,
};

export const governedReleaseAttentionSource: ConsoleAttentionSource = {
  getSnapshot() {
    refreshEnvironmentAttentionSnapshots();
    return cachedReleaseAttentionSnapshot;
  },
  registration: releaseRegistration,
  subscribe: environmentRuntime.subscribe,
};

function devIntegrationAttentionCandidate(
  profile: DevIntegrationProfile,
  projectedAt: string,
): ConsoleAttentionCandidate {
  const nextMove = profile.nextMove;
  if (!nextMove) {
    throw new Error(
      `Dev Integration profile ${profile.profileId} has no next move.`,
    );
  }

  const failed =
    profile.runtime.observation.state === "failed" ||
    profile.stageHandoff.result === "failed";
  const blocked =
    profile.runtime.observation.state === "unavailable" ||
    profile.stageHandoff.result === "not-ready";
  const requiredMoveId = `dev-integration.${nextMove.actionId}`;

  return {
    attentionClass: failed || blocked ? "recovery" : "required-action",
    candidateId: `dev-integration:${profile.profileId}:${nextMove.actionId}`,
    correlationRef: profile.requestRecordRef,
    dedupeKey: `${profile.profileId}:${requiredMoveId}`,
    dueAt: null,
    evidenceRefs: [
      ...profile.admissionRefs,
      ...profile.stageHandoff.checkResults.map(
        (result) => result.evidenceRef,
      ),
    ],
    owner: {
      label: nextMove.ownerRef,
      ref: nextMove.ownerRef,
    },
    ownerRank: failed ? 5 : blocked ? 10 : 30,
    reason: nextMove.reason,
    receiptRefs: [
      profile.stageHandoff.promotionReportRef,
      profile.stageHandoff.sessionManifestRef,
      profile.stageHandoff.smokeSummaryRef,
    ].filter((reference): reference is string => Boolean(reference)),
    requiredMove: {
      id: requiredMoveId,
      label: nextMove.label,
    },
    reviewAt: null,
    route: {
      availability: "available",
      entryIntent: {
        mode: failed || blocked ? "resolve" : "review",
        requiredMoveRef: requiredMoveId,
        subjectRef: profile.profileId,
        target: {
          id: "dev-integration",
          kind: "workspace",
          workspaceId: "dev-integration",
        },
      },
      externalHref: null,
      label: "Open Dev Integration",
      unavailableReason: null,
    },
    schemaVersion: 1,
    source: {
      authority: profile.source.source,
      freshness: "current",
      mode: environmentSourceMode(profile.source.provenance),
      observedAt: profile.source.observedAt,
      projectedAt,
      ref: profile.source.ref,
      version: profile.source.version,
    },
    subject: {
      kind: "dev-integration-profile",
      ref: profile.profileId,
      title: profile.profileId,
    },
    urgency: failed ? "critical" : blocked ? "high" : "normal",
  };
}

function governedReleaseAttentionCandidate(
  product: ProductReleaseCapability,
  nextMove: NonNullable<ProductReleaseCapability["nextMove"]>,
  projectedAt: string,
): ConsoleAttentionCandidate {
  const failedStep = product.releasePath.find(
    (step) => step.posture === "failed",
  );
  const requiredMoveId = `governed-release.${nextMove.actionId}`;

  return {
    attentionClass: failedStep ? "recovery" : "required-action",
    candidateId: `governed-release:${product.productId}:${nextMove.actionId}`,
    correlationRef: product.operatorRoute.ref,
    dedupeKey: `${product.productId}:${requiredMoveId}`,
    dueAt: null,
    evidenceRefs: product.supportingEvidenceRefs,
    owner: {
      label: nextMove.ownerRef,
      ref: nextMove.ownerRef,
    },
    ownerRank: failedStep ? 10 : 30,
    reason: nextMove.reason,
    receiptRefs: [],
    requiredMove: {
      id: requiredMoveId,
      label: nextMove.label,
    },
    reviewAt: null,
    route: {
      availability: "available",
      entryIntent: {
        mode: failedStep ? "resolve" : "review",
        requiredMoveRef: requiredMoveId,
        subjectRef: product.productId,
        target: {
          id: "governed-releases",
          kind: "workspace",
          workspaceId: "governed-releases",
        },
      },
      externalHref: null,
      label: "Open Governed Releases",
      unavailableReason: null,
    },
    schemaVersion: 1,
    source: {
      authority: product.source.source,
      freshness: "current",
      mode: environmentSourceMode(product.source.provenance),
      observedAt: product.source.observedAt,
      projectedAt,
      ref: product.source.ref,
      version: product.source.version,
    },
    subject: {
      kind: "governed-release-product",
      ref: product.productId,
      title: product.productLabel,
    },
    urgency: failedStep ? "high" : "normal",
  };
}

function refreshEnvironmentAttentionSnapshots() {
  const runtimeSnapshot = environmentRuntime.getSnapshot();
  if (runtimeSnapshot === cachedRuntimeSnapshot) {
    return;
  }

  cachedRuntimeSnapshot = runtimeSnapshot;
  cachedDevAttentionSnapshot =
    devIntegrationAttentionSnapshot(runtimeSnapshot);
  cachedReleaseAttentionSnapshot =
    governedReleaseAttentionSnapshot(runtimeSnapshot);
}

function devIntegrationAttentionSnapshot(
  runtimeSnapshot: ReturnType<typeof environmentRuntime.getSnapshot>,
) {
  const projectedAt = environmentProjectedAt(runtimeSnapshot);
  const profiles = runtimeSnapshot.effective.profiles;

  return {
    candidates: profiles.flatMap((profile) =>
      profile.nextMove
        ? [devIntegrationAttentionCandidate(profile, projectedAt)]
        : [],
    ),
    registration: devRegistration,
    schemaVersion: 1 as const,
    source: {
      authority: "workspace-developer-integration-contract",
      freshness: "current" as const,
      mode: "source-projected" as const,
      observedAt: projectedAt,
      projectedAt,
      ref: "dev-integration://attention-projection",
      version: `dev-integration-attention-v1:${profiles.length}:${runtimeSnapshot.revision}`,
    },
  };
}

function governedReleaseAttentionSnapshot(
  runtimeSnapshot: ReturnType<typeof environmentRuntime.getSnapshot>,
) {
  const projectedAt = environmentProjectedAt(runtimeSnapshot);
  const products = runtimeSnapshot.effective.products;

  return {
    candidates: products.flatMap((product) => {
      const nextMove = selectProductReleaseNextMove(product);
      return nextMove
        ? [
            governedReleaseAttentionCandidate(
              product,
              nextMove,
              projectedAt,
            ),
          ]
        : [];
    }),
    registration: releaseRegistration,
    schemaVersion: 1 as const,
    source: {
      authority: "platform-release-contract",
      freshness: "current" as const,
      mode: "source-projected" as const,
      observedAt: projectedAt,
      projectedAt,
      ref: "governed-release://attention-projection",
      version: `governed-release-attention-v1:${products.length}:${runtimeSnapshot.revision}`,
    },
  };
}

function environmentProjectedAt(
  runtimeSnapshot: ReturnType<typeof environmentRuntime.getSnapshot>,
) {
  return (
    [
      ...runtimeSnapshot.effective.profiles.map(
        (profile) => profile.source.observedAt,
      ),
      ...runtimeSnapshot.effective.products.map(
        (product) => product.source.observedAt,
      ),
      ...runtimeSnapshot.receipts.map((receipt) => receipt.recordedAt),
    ]
      .sort()
      .at(-1) ?? "2026-07-28T00:00:00.000Z"
  );
}

function environmentSourceMode(
  provenance:
    | DevIntegrationProfile["source"]["provenance"]
    | ProductReleaseCapability["source"]["provenance"],
): ConsoleAttentionSourceMode {
  switch (provenance) {
    case "authority-snapshot":
      return "source-projected";
    case "prototype-local":
      return "prototype-local";
    case "synthetic-scenario":
      return "synthetic";
  }
}
