import type { OperationTone } from "../../operation-contracts/operation-state.ts";

export type OrchestrationRunLifecycle =
  | "blocked"
  | "cancelled"
  | "completed"
  | "failed"
  | "queued"
  | "running"
  | "waiting";

export type OrchestrationRunEffectPosture =
  "none" | "partial" | "possible" | "verified";

export type OrchestrationRunNodeType = "activity" | "subworkflow" | "wait";

export type OrchestrationRunNodeState =
  | "blocked"
  | "cancelled"
  | "completed"
  | "failed"
  | "queued"
  | "running"
  | "skipped"
  | "waiting";

export type OrchestrationRunControlId =
  "cancel" | "defer" | "provide-signal" | "resume" | "retry";

export type OrchestrationRunSource = {
  authority: string;
  freshness: "current" | "stale" | "unknown";
  mode: "prototype-local" | "synthetic-scenario";
  observedAt: string;
  ref: string;
  schemaVersion: string;
  sourceVersion: string;
};

export type OrchestrationRunNode = {
  artifactRefs: string[];
  attempt: number;
  completedAt: string | null;
  duration: string | null;
  id: string;
  inputRefs: string[];
  label: string;
  logRefs: string[];
  outputRefs: string[];
  owner: string;
  parallelGroup: string | null;
  receiptRefs: string[];
  skipReason: string | null;
  startedAt: string | null;
  state: OrchestrationRunNodeState;
  type: OrchestrationRunNodeType;
};

export type OrchestrationRunWait = {
  deadline: string | null;
  enteredAt: string;
  expectedRef: string;
  id: string;
  kind: "authority-decision" | "dependency" | "external-event" | "timer";
  owner: string;
  reason: string;
  requiresOperatorAction: boolean;
  timeoutBehavior: string;
};

export type OrchestrationRunBlocker = {
  detail: string;
  evidenceRefs: string[];
  id: string;
  owner: string;
  remediation: string;
  supportedDispositions: Array<
    "accept-risk" | "defer" | "remove" | "workaround"
  >;
};

export type OrchestrationRunFailure = {
  detail: string;
  failedNodeId: string;
  id: string;
  owner: string;
  retryExhausted: boolean;
  retryable: boolean;
};

export type OrchestrationRunRetry = {
  attempts: number;
  available: boolean;
  backoff: string;
  maxAttempts: number;
  nextEligibleAt: string | null;
};

export type OrchestrationRunControl = {
  available: boolean;
  disabledReason: string | null;
  expectedEffect: string;
  id: OrchestrationRunControlId;
  idempotencyPosture: string;
  label: string;
  owner: string;
};

export type OrchestrationRunEvent = {
  eventId: string;
  material: boolean;
  nodeId: string | null;
  occurredAt: string;
  sequence: number;
  state: OrchestrationRunLifecycle;
  summary: string;
};

export type OrchestrationRunReceipt = {
  outcome:
    | "cancelled_with_effects"
    | "completed"
    | "failed_no_effect"
    | "failed_with_effects";
  receiptId: string;
  recordedAt: string;
  ref: string;
  verified: boolean;
};

export type OrchestrationRuntimeDiagnostics = {
  adapter: string;
  detail: string;
  liveRuntimeClaimed: false;
  state: "synthetic" | "unavailable";
  worker: string;
};

export type OrchestrationRunRecord = {
  artifactRefs: string[];
  blocker: OrchestrationRunBlocker | null;
  businessState: {
    label: string;
    sourceDomain: string;
  };
  causationRef: string;
  completedAt: string | null;
  controls: OrchestrationRunControl[];
  correlationRef: string;
  createdAt: string;
  currentNodeId: string | null;
  definitionFamilyId: string | null;
  definitionId: string;
  definitionVersion: string;
  effectPosture: OrchestrationRunEffectPosture;
  evidenceRefs: string[];
  events: OrchestrationRunEvent[];
  failure: OrchestrationRunFailure | null;
  id: string;
  logRefs: string[];
  nodes: OrchestrationRunNode[];
  receipt: OrchestrationRunReceipt | null;
  requestId: string;
  retry: OrchestrationRunRetry;
  runId: string;
  runtimeDiagnostics: OrchestrationRuntimeDiagnostics;
  scenarioKind:
    | "blocked-partial-effects"
    | "cancelled-retained-effects"
    | "completed-verified-effects"
    | "failed-retry-available"
    | "healthy-wait"
    | "queued-no-effects"
    | "running-possible-effects";
  source: OrchestrationRunSource;
  sourceDomain: string;
  sourceProjectionRef: string;
  sourceProjectionVersion: string;
  sourceRecordRef: string;
  state: OrchestrationRunLifecycle;
  updatedAt: string;
  wait: OrchestrationRunWait | null;
};

export type OrchestrationRunSummaryMetric = {
  id: string;
  label: "Active" | "Blocked" | "Completed" | "Failed" | "Waiting";
  tone: OperationTone;
  value: string;
};

export type OrchestrationRunFilters = {
  definitionId: "all" | string;
  query: string;
  sourceDomain: "all" | string;
  state: "all" | OrchestrationRunLifecycle;
};

export type OrchestrationRunPosture = {
  detail: string;
  label: string;
  tone: OperationTone;
};
