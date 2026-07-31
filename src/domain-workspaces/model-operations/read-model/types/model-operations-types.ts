import type {
  OperationSurfaceStatusModel,
  OperationTone,
} from "../../../operation-projections/index.ts";

export type ModelProfileLifecycle =
  "active" | "exception" | "retired" | "suspended";

export type ModelProfileAvailability =
  "available" | "blocked" | "exception" | "retired" | "suspended";

export type ModelProjectionFreshness = "current" | "stale" | "unknown";

export type ModelReadinessState =
  "blocked" | "ready" | "stale" | "suspended" | "unknown";

export type ModelConsumerEligibilityState =
  "blocked" | "eligible" | "stale" | "suspended" | "unknown";

export type ModelProjectionSource = {
  authority: string;
  freshness: ModelProjectionFreshness;
  observedAt: string;
  ref: string;
  schemaVersion: string;
  sourceVersion: string;
};

export type ModelProfilePolicyProjection = {
  allowedCallers: string[];
  allowedDataScope: string[];
  directProviderAccessAllowed: boolean;
  humanApprovalRequired: boolean;
  invocationPath: string;
  lifecycle: ModelProfileLifecycle;
  outputSchemaRef: string;
  profileId: string;
  provider: string;
  purpose: string;
  source: ModelProjectionSource;
  upstreamModel: string;
};

export type ModelConsumerBlocker = {
  detail: string;
  id: string;
  label: string;
  owner: string;
  sourceRef: string;
};

export type ModelProfileConsumerProjection = {
  allowedDataScope: string[];
  blockers: ModelConsumerBlocker[];
  callerId: string;
  callerRepo: string;
  callerWorkflow: string;
  environments: string[];
  eligibility: ModelConsumerEligibilityState;
  liveConsumptionAllowed: boolean;
  outputSchemaRef: string;
  owner: string;
  profileId: string;
  purpose: string;
  source: ModelProjectionSource;
};

export type ModelAccessPlaneProjection = {
  activationAllowed: boolean;
  auditSinkStatus: string;
  credentialOwner: string;
  directProviderPassthroughAllowed: boolean;
  id: string;
  reason: string;
  source: ModelProjectionSource;
  state: ModelReadinessState;
  status: string;
};

export type ModelRuntimeGateProjection = {
  detail: string;
  id: string;
  label: string;
  state: ModelReadinessState;
};

export type ModelRuntimeProjection = {
  contractId: string;
  gates: ModelRuntimeGateProjection[];
  provider: string;
  source: ModelProjectionSource;
  state: ModelReadinessState;
  status: string;
  upstreamModel: string;
};

export type ModelSecurityProjection = {
  exceptionRef: string | null;
  reviewRefs: string[];
  source: ModelProjectionSource;
  state: ModelReadinessState;
  summary: string;
};

export type ModelLatestAuditProjection = {
  eventRef: string | null;
  observedAt: string | null;
  source: ModelProjectionSource;
  state: ModelReadinessState;
  summary: string;
};

export type ModelRequiredMoveProjection = {
  detail: string;
  label: string;
  owner: string;
  state: ModelReadinessState;
  tone: OperationTone;
};

export type ModelProfileRecord = {
  accessPlane: ModelAccessPlaneProjection;
  consumers: ModelProfileConsumerProjection[];
  latestAudit: ModelLatestAuditProjection;
  policy: ModelProfilePolicyProjection;
  requiredMove: ModelRequiredMoveProjection;
  runtime: ModelRuntimeProjection;
  security: ModelSecurityProjection;
};

export type ModelProfileCheckId =
  | "access-plane"
  | "consumer-contract"
  | "profile-policy"
  | "runtime-controls"
  | "security-acceptance";

export type ModelProfileCheckProjection = {
  detail: string;
  facts: Array<{ label: string; value: string }>;
  id: ModelProfileCheckId;
  label: string;
  source: ModelProjectionSource;
  state: ModelReadinessState;
  tone: OperationTone;
};

export type ModelOperationsSummaryMetric = {
  id: string;
  label: "Available" | "Blocked" | "Exception" | "Retired" | "Suspended";
  tone: OperationTone;
  value: string;
};

export type LocalExceptionRuntimeProjection = {
  endpoint: string;
  models: Array<{
    capabilities: string[];
    digest: string | null;
    family: string | null;
    name: string;
    parameterSize: string | null;
  }>;
  observedAt: string | null;
  provider: string;
  source: ModelProjectionSource;
  state: "available" | "offline" | "probing" | "unknown";
};

export type ModelOperationsReadModel = {
  localExceptionRuntime: LocalExceptionRuntimeProjection;
  profiles: ModelProfileRecord[];
  summary: ModelOperationsSummaryMetric[];
  workspaceStatus: OperationSurfaceStatusModel;
};
