import {
  devIntegrationProfileActionLabel,
  devIntegrationProfileAllowsAction,
  type DevIntegrationProfile,
} from "../model/dev-integration-profile.ts";
import {
  validateDevIntegrationProfileRequest,
} from "../model/dev-integration-profile-request.ts";
import type {
  EnvironmentLifecycleCommandRequest,
  EnvironmentLifecycleOperation,
  EnvironmentLifecycleOperationEvent,
  EnvironmentLifecycleOperationReceipt,
  EnvironmentLifecycleReceiptCommandInput,
  EnvironmentLifecycleReceiptEffect,
} from "../model/environment-lifecycle-command.ts";
import type {
  ProductReleaseCapability,
} from "../model/product-release-capability.ts";
import {
  productReleaseStepActionAvailability,
  selectProductRuntimeLifecycleTransition,
} from "../model/product-release-capability.ts";
import {
  projectPrototypeLocalProfileRequest,
} from "../work-model/profile-request/dev-integration-profile-request-projection.ts";
import {
  validateProductReleaseActionDraft,
  validateProductRuntimeLifecycleDraft,
} from "../work-model/product-release/product-release-action-draft.ts";
import {
  environmentCommandSubjectRef,
} from "../work-model/commands/environment-lifecycle-command-factory.ts";

export type EnvironmentLifecycleForcedFailure = Readonly<{
  code: string;
  detail: string;
}>;

export type EnvironmentLifecycleSimulationResult = Readonly<{
  operation: EnvironmentLifecycleOperation;
  receipt: EnvironmentLifecycleOperationReceipt;
}>;

export function simulateEnvironmentLifecycleCommand({
  command,
  currentSourceVersion,
  forcedFailure = null,
  products,
  profiles,
  receiptSequence,
}: {
  command: EnvironmentLifecycleCommandRequest;
  currentSourceVersion: string;
  forcedFailure?: EnvironmentLifecycleForcedFailure | null;
  products: readonly ProductReleaseCapability[];
  profiles: readonly DevIntegrationProfile[];
  receiptSequence: number;
}): EnvironmentLifecycleSimulationResult {
  assertCommandIdentity(command);
  const subjectRef = environmentCommandSubjectRef(command);
  const operationId = `environment-operation-${command.idempotencyKey.replace(
    /^environment:/,
    "",
  )}`;
  const receiptRef =
    `prototype-local://environment-lifecycle/receipts/${operationId}`;
  const safeLogRef =
    `prototype-local://environment-lifecycle/logs/${operationId}`;
  const actionLabel = environmentCommandLabel(command, profiles, products);
  const failure =
    command.expectedSourceVersion !== currentSourceVersion
      ? {
          code: "source-version-conflict",
          detail:
            "The subject projection changed after this command draft opened.",
        }
      : forcedFailure;

  if (failure) {
    return terminalResult({
      actionLabel,
      command,
      effect: null,
      failure,
      operationId,
      receiptRef,
      receiptSequence,
      safeLogRef,
      subjectRef,
    });
  }

  try {
    const effect = buildReceiptEffect(command, profiles, products);

    return terminalResult({
      actionLabel,
      command,
      effect,
      failure: null,
      operationId,
      receiptRef,
      receiptSequence,
      safeLogRef,
      subjectRef,
    });
  } catch (error) {
    return terminalResult({
      actionLabel,
      command,
      effect: null,
      failure: {
        code: "command-contract-invalid",
        detail:
          error instanceof Error
            ? error.message
            : "The command did not satisfy its declared contract.",
      },
      operationId,
      receiptRef,
      receiptSequence,
      safeLogRef,
      subjectRef,
    });
  }
}

function buildReceiptEffect(
  command: EnvironmentLifecycleCommandRequest,
  profiles: readonly DevIntegrationProfile[],
  products: readonly ProductReleaseCapability[],
): EnvironmentLifecycleReceiptEffect {
  switch (command.subjectKind) {
    case "profile-request": {
      const errors = validateDevIntegrationProfileRequest(
        command.request,
        {
          disposableProfileIds: profiles
            .filter(
              (profile) =>
                profile.runtime.stateModel === "disposable",
            )
            .map((profile) => profile.profileId),
          existingProfileIds: profiles.map(
            (profile) => profile.profileId,
          ),
        },
      );
      if (errors.length > 0) {
        throw new Error(errors[0]);
      }

      return {
        kind: "profile-request",
        profile: projectPrototypeLocalProfileRequest(command.request),
      };
    }
    case "dev-integration-profile": {
      const profile = profiles.find(
        (candidate) => candidate.profileId === command.profileId,
      );
      if (
        !profile ||
        !devIntegrationProfileAllowsAction(profile, command.action)
      ) {
        throw new Error(
          "The selected profile no longer allows this action.",
        );
      }

      if (command.action === "promote-check") {
        const artifactBase =
          `prototype-local://environment-lifecycle/handoff/${profile.profileId}/${command.commandId}`;
        const prerequisitesReady =
          profile.runtime.observation.state === "running" &&
          Boolean(profile.stageHandoff.smokeSummaryRef);
        const checkResults = profile.stageHandoff.requiredChecks.map(
          (check) => ({
            checkId: check.id,
            evidenceRef: `${artifactBase}/checks/${check.id}`,
            status: prerequisitesReady
              ? ("passed" as const)
              : ("blocked" as const),
          }),
        );
        const ready =
          checkResults.length > 0 &&
          checkResults.every((result) => result.status === "passed");

        return {
          checkResults,
          kind: "profile-handoff",
          promotionReportRef: `${artifactBase}/promotion-report`,
          result: ready ? "ready" : "not-ready",
          sessionManifestRef: `${artifactBase}/session-manifest`,
          smokeSummaryRef: ready
            ? `${artifactBase}/smoke-summary`
            : profile.stageHandoff.smokeSummaryRef,
        };
      }

      const runtimeState =
        command.action === "up"
          ? "running"
          : command.action === "down" || command.action === "reset"
            ? "stopped"
            : command.action === "status"
              ? profile.runtime.observation.state
              : null;
      const artifactBase =
        `prototype-local://environment-lifecycle/profile/${profile.profileId}/${command.commandId}`;

      return {
        kind: "profile-action",
        observedAt: command.requestedAt,
        observationSourceRef: runtimeState
          ? `${artifactBase}/status`
          : null,
        runtimeState,
        smokeSummaryRef:
          command.action === "smoke"
            ? `${artifactBase}/smoke-summary`
            : null,
      };
    }
    case "product-release": {
      const product = products.find(
        (candidate) => candidate.productId === command.productId,
      );
      const step = product?.releasePath.find(
        (candidate) => candidate.id === command.stepId,
      );
      const operation = product?.releaseOperations.find(
        (candidate) => candidate.action === command.action,
      );
      if (
        !product ||
        !step ||
        !operation ||
        step.action !== command.action ||
        !productReleaseStepActionAvailability(product, step).allowed
      ) {
        throw new Error(
          "The selected product release step is no longer actionable.",
        );
      }

      const errors = validateProductReleaseActionDraft(
        { values: command.input },
        operation,
      );
      if (errors.length > 0) {
        throw new Error(errors[0]);
      }

      return productReleaseEffect(command);
    }
    case "product-runtime-lifecycle": {
      const product = products.find(
        (candidate) => candidate.productId === command.productId,
      );
      if (!product?.runtimeLifecycle) {
        throw new Error(
          "The selected product has no runtime lifecycle contract.",
        );
      }
      if (
        product.runtimeLifecycle.currentState !==
        command.sourceRuntimeLifecycleState
      ) {
        throw new Error(
          "The runtime lifecycle changed after this command draft opened.",
        );
      }

      const transition = selectProductRuntimeLifecycleTransition(
        product.runtimeLifecycle,
        command.targetRuntimeLifecycleState,
      );
      if (!transition) {
        throw new Error(
          "The selected runtime lifecycle transition is no longer allowed.",
        );
      }

      const errors = validateProductRuntimeLifecycleDraft(
        {
          incidentRef: command.incidentRef ?? "",
          reason: command.reason,
          targetState: command.targetRuntimeLifecycleState,
        },
        product.runtimeLifecycle,
      );
      if (errors.length > 0) {
        throw new Error(errors[0]);
      }

      return {
        kind: "product-runtime-lifecycle",
        sourceState: command.sourceRuntimeLifecycleState,
        targetState: command.targetRuntimeLifecycleState,
        verificationEffect: transition.verificationEffect,
      };
    }
  }
}

function productReleaseEffect(
  command: Extract<
    EnvironmentLifecycleCommandRequest,
    { subjectKind: "product-release" }
  >,
): EnvironmentLifecycleReceiptEffect {
  switch (command.action) {
    case "record-release-candidate":
      return {
        canonicalStatus: "candidate",
        kind: "product-release",
        stepId: command.stepId,
        stepPosture: "complete",
      };
    case "record-stage-verification":
      return {
        canonicalStatus: "recorded",
        kind: "product-release",
        stepId: command.stepId,
        stepPosture: "complete",
      };
    case "record-readiness": {
      const approved = command.input["readiness-decision"] === "approve";

      return {
        canonicalStatus: approved ? "approved" : "reset",
        kind: "product-release",
        stepId: command.stepId,
        stepPosture: approved ? "complete" : "current",
      };
    }
    case "request-prod-promotion":
      return {
        canonicalStatus: "promoted",
        kind: "product-release",
        stepId: command.stepId,
        stepPosture: "complete",
      };
    case "record-prod-verification":
      return {
        canonicalStatus: "recorded",
        kind: "product-release",
        stepId: command.stepId,
        stepPosture: "complete",
      };
  }
}

function terminalResult({
  actionLabel,
  command,
  effect,
  failure,
  operationId,
  receiptRef,
  receiptSequence,
  safeLogRef,
  subjectRef,
}: {
  actionLabel: string;
  command: EnvironmentLifecycleCommandRequest;
  effect: EnvironmentLifecycleReceiptEffect | null;
  failure: EnvironmentLifecycleForcedFailure | null;
  operationId: string;
  receiptRef: string;
  receiptSequence: number;
  safeLogRef: string;
  subjectRef: string;
}): EnvironmentLifecycleSimulationResult {
  const terminalState = failure ? "failed" : "succeeded";
  const events: readonly EnvironmentLifecycleOperationEvent[] = [
    event(
      operationId,
      1,
      "requested",
      command.requestedAt,
      `${actionLabel} requested.`,
    ),
    event(
      operationId,
      2,
      "queued",
      command.requestedAt,
      "Prototype-local adapter accepted the command.",
    ),
    event(
      operationId,
      3,
      "running",
      command.requestedAt,
      "Command contract and source version checked.",
    ),
    event(
      operationId,
      4,
      terminalState,
      command.requestedAt,
      failure
        ? failure.detail
        : `${actionLabel} completed with prototype-local evidence.`,
    ),
  ];
  const operation: EnvironmentLifecycleOperation = {
    action: command.action,
    actorRef: command.actorRef,
    adapterRef: command.adapterRef,
    attempt: command.attempt,
    causationId: command.causationId,
    commandId: command.commandId,
    completedAt: command.requestedAt,
    correlationId: command.correlationId,
    events,
    failureCode: failure?.code ?? null,
    failureDetail: failure?.detail ?? null,
    label: actionLabel,
    operationId,
    receiptRef,
    requiredCapability: command.requiredCapability,
    requestedAt: command.requestedAt,
    safeLogRef,
    startedAt: command.requestedAt,
    state: terminalState,
    subjectRef,
    workflowOwner: command.workflowOwner,
  };
  const receipt: EnvironmentLifecycleOperationReceipt = {
    action: command.action,
    actorRef: command.actorRef,
    adapterRef: command.adapterRef,
    commandId: command.commandId,
    commandInput: receiptCommandInput(command),
    correlationId: command.correlationId,
    durability: "prototype-local",
    effect,
    failureCode: failure?.code ?? null,
    failureDetail: failure?.detail ?? null,
    operationId,
    outcome: failure ? "failed" : "succeeded",
    receiptRef,
    recordedAt: command.requestedAt,
    requiredCapability: command.requiredCapability,
    safeLogRef,
    sequence: receiptSequence,
    sourceVersion: command.expectedSourceVersion,
    subjectRef,
    workflowOwner: command.workflowOwner,
  };

  return { operation, receipt };
}

function receiptCommandInput(
  command: EnvironmentLifecycleCommandRequest,
): EnvironmentLifecycleReceiptCommandInput {
  switch (command.subjectKind) {
    case "dev-integration-profile":
      return {
        kind: command.subjectKind,
        profileId: command.profileId,
      };
    case "profile-request":
      return {
        kind: command.subjectKind,
        request: {
          ...command.request,
          dependencies: [...command.request.dependencies],
          expectedWrites: {
            ...command.request.expectedWrites,
            targets: [...command.request.expectedWrites.targets],
          },
          participatingRepos: [...command.request.participatingRepos],
          persistence: command.request.persistence
            ? { ...command.request.persistence }
            : null,
          securityTriggers: [...command.request.securityTriggers],
        },
      };
    case "product-release":
      return {
        input: { ...command.input },
        kind: command.subjectKind,
        productId: command.productId,
        stepId: command.stepId,
      };
    case "product-runtime-lifecycle":
      return {
        incidentRef: command.incidentRef,
        kind: command.subjectKind,
        productId: command.productId,
        reason: command.reason,
        sourceState: command.sourceRuntimeLifecycleState,
        targetState: command.targetRuntimeLifecycleState,
      };
  }
}

function event(
  operationId: string,
  sequence: number,
  state: EnvironmentLifecycleOperationEvent["state"],
  occurredAt: string,
  summary: string,
): EnvironmentLifecycleOperationEvent {
  return {
    eventId: `${operationId}:event:${sequence}`,
    occurredAt,
    sequence,
    state,
    summary,
  };
}

function environmentCommandLabel(
  command: EnvironmentLifecycleCommandRequest,
  profiles: readonly DevIntegrationProfile[],
  products: readonly ProductReleaseCapability[],
): string {
  switch (command.subjectKind) {
    case "profile-request":
      return "Profile request";
    case "dev-integration-profile": {
      const profile = profiles.find(
        (candidate) => candidate.profileId === command.profileId,
      );
      return profile
        ? devIntegrationProfileActionLabel(profile, command.action)
        : "Profile command";
    }
    case "product-release":
      return (
        products
          .find(
            (candidate) => candidate.productId === command.productId,
          )
          ?.releasePath.find((step) => step.id === command.stepId)
          ?.label ?? "Product release command"
      );
    case "product-runtime-lifecycle":
      return `Change runtime lifecycle to ${
        products
          .find(
            (candidate) => candidate.productId === command.productId,
          )
          ?.runtimeLifecycle?.states.find(
            (state) =>
              state.id === command.targetRuntimeLifecycleState,
          )?.label ?? command.targetRuntimeLifecycleState
      }`;
  }
}

function assertCommandIdentity(
  command: EnvironmentLifecycleCommandRequest,
): void {
  const requiredValues = [
    command.actorRef,
    command.adapterRef,
    command.commandId,
    command.correlationId,
    command.expectedSourceVersion,
    command.idempotencyKey,
    command.requestedAt,
    command.requiredCapability,
    command.workflowOwner,
  ];

  if (
    requiredValues.some((value) => !value.trim()) ||
    Number.isNaN(Date.parse(command.requestedAt)) ||
    command.attempt < 1 ||
    (command.attempt === 1 && command.causationId !== null) ||
    (command.attempt > 1 && command.causationId === null)
  ) {
    throw new Error(
      "Environment command identity is incomplete.",
    );
  }
}
