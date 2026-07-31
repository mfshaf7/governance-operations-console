import type {
  DevIntegrationProfile,
  DevIntegrationProfileAction,
  DevIntegrationPromoteCheckState,
  DevIntegrationRuntimeObservationState,
  DevIntegrationStageHandoffCheckResult,
} from "./dev-integration-profile.ts";
import type {
  DevIntegrationProfileRequest,
} from "./dev-integration-profile-request.ts";
import type {
  ProductReleaseAction,
  ProductReleaseStepPosture,
  ProductRuntimeLifecycleVerificationEffect,
} from "./product-release-capability.ts";

export type EnvironmentLifecycleOperationState =
  | "cancelled"
  | "failed"
  | "queued"
  | "requested"
  | "running"
  | "succeeded";

export type EnvironmentLifecycleCommandIdentity = Readonly<{
  actorRef: string;
  adapterRef: string;
  attempt: number;
  causationId: string | null;
  commandId: string;
  correlationId: string;
  expectedSourceVersion: string;
  idempotencyKey: string;
  requestedAt: string;
  requiredCapability: string;
  workflowOwner: string;
}>;

export type EnvironmentLifecycleCommandRequest =
  | (EnvironmentLifecycleCommandIdentity &
      Readonly<{
        action: DevIntegrationProfileAction;
        profileId: string;
        subjectKind: "dev-integration-profile";
      }>)
  | (EnvironmentLifecycleCommandIdentity &
      Readonly<{
        action: Exclude<
          ProductReleaseAction,
          "change-runtime-lifecycle"
        >;
        input: Readonly<Record<string, string>>;
        productId: string;
        stepId: string;
        subjectKind: "product-release";
      }>)
  | (EnvironmentLifecycleCommandIdentity &
      Readonly<{
        action: "change-runtime-lifecycle";
        incidentRef: string | null;
        productId: string;
        reason: string;
        sourceRuntimeLifecycleState: string;
        subjectKind: "product-runtime-lifecycle";
        targetRuntimeLifecycleState: string;
      }>)
  | (EnvironmentLifecycleCommandIdentity &
      Readonly<{
        action: "submit-profile-request";
        request: DevIntegrationProfileRequest;
        subjectKind: "profile-request";
      }>);

export type EnvironmentLifecycleOperationEvent = Readonly<{
  eventId: string;
  occurredAt: string;
  sequence: number;
  state: EnvironmentLifecycleOperationState;
  summary: string;
}>;

export type EnvironmentLifecycleOperation = Readonly<{
  action: EnvironmentLifecycleCommandRequest["action"];
  actorRef: string;
  adapterRef: string;
  attempt: number;
  causationId: string | null;
  commandId: string;
  completedAt: string | null;
  correlationId: string;
  events: readonly EnvironmentLifecycleOperationEvent[];
  failureCode: string | null;
  failureDetail: string | null;
  label: string;
  operationId: string;
  receiptRef: string | null;
  requiredCapability: string;
  requestedAt: string;
  safeLogRef: string | null;
  startedAt: string | null;
  state: EnvironmentLifecycleOperationState;
  subjectRef: string;
  workflowOwner: string;
}>;

export type EnvironmentLifecycleReceiptEffect =
  | Readonly<{
      kind: "profile-action";
      observedAt: string;
      observationSourceRef: string | null;
      runtimeState: DevIntegrationRuntimeObservationState | null;
      smokeSummaryRef: string | null;
    }>
  | Readonly<{
      checkResults: readonly DevIntegrationStageHandoffCheckResult[];
      kind: "profile-handoff";
      promotionReportRef: string | null;
      result: DevIntegrationPromoteCheckState;
      sessionManifestRef: string | null;
      smokeSummaryRef: string | null;
    }>
  | Readonly<{
      kind: "profile-request";
      profile: DevIntegrationProfile;
    }>
  | Readonly<{
      canonicalStatus: string;
      kind: "product-release";
      stepId: string;
      stepPosture: ProductReleaseStepPosture;
    }>
  | Readonly<{
      kind: "product-runtime-lifecycle";
      sourceState: string;
      targetState: string;
      verificationEffect: ProductRuntimeLifecycleVerificationEffect;
    }>;

export type EnvironmentLifecycleReceiptCommandInput =
  | Readonly<{
      kind: "dev-integration-profile";
      profileId: string;
    }>
  | Readonly<{
      kind: "profile-request";
      request: DevIntegrationProfileRequest;
    }>
  | Readonly<{
      input: Readonly<Record<string, string>>;
      kind: "product-release";
      productId: string;
      stepId: string;
    }>
  | Readonly<{
      incidentRef: string | null;
      kind: "product-runtime-lifecycle";
      productId: string;
      reason: string;
      sourceState: string;
      targetState: string;
    }>;

export type EnvironmentLifecycleOperationReceipt = Readonly<{
  action: EnvironmentLifecycleCommandRequest["action"];
  actorRef: string;
  adapterRef: string;
  commandId: string;
  commandInput: EnvironmentLifecycleReceiptCommandInput;
  correlationId: string;
  durability: "prototype-local";
  effect: EnvironmentLifecycleReceiptEffect | null;
  failureCode: string | null;
  failureDetail: string | null;
  operationId: string;
  outcome: "failed" | "succeeded";
  receiptRef: string;
  recordedAt: string;
  requiredCapability: string;
  safeLogRef: string;
  sequence: number;
  sourceVersion: string;
  subjectRef: string;
  workflowOwner: string;
}>;

export function environmentLifecycleOperationCanRetry(
  operation: EnvironmentLifecycleOperation,
): boolean {
  return (
    operation.state === "failed" &&
    operation.failureCode !== "command-contract-invalid"
  );
}
