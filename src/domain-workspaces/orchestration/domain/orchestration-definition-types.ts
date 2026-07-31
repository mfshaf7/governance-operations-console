import type { OperationTone } from "../../operation-contracts/operation-state.ts";

export type OrchestrationDefinitionClassification =
  "admitted-durable" | "conditional" | "durable-candidate" | "synchronous";

export type OrchestrationDefinitionLifecycle =
  | "active"
  | "admission-review"
  | "candidate"
  | "definition-ready"
  | "implementation-requested"
  | "qualified"
  | "retired"
  | "suspended";

export type OrchestrationDefinitionSourceMode =
  "contract-derived" | "prototype-local" | "synthetic-scenario";

export type OrchestrationDefinitionSource = {
  authority: string;
  freshness: "current" | "stale" | "unknown";
  mode: OrchestrationDefinitionSourceMode;
  observedAt: string;
  ref: string;
  schemaVersion: string;
  sourceVersion: string;
};

export type OrchestrationDefinitionNodeType =
  "activity" | "subworkflow" | "wait";

export type OrchestrationDefinitionNode = {
  adapter: string;
  artifactRefs: string[];
  branchCondition: string | null;
  dependencies: string[];
  id: string;
  idempotency: string;
  inputRefs: string[];
  label: string;
  logRefs: string[];
  optional: boolean;
  outputRefs: string[];
  owner: string;
  parallelGroup: string | null;
  receiptRefs: string[];
  skipReason: string | null;
  timeout: string;
  type: OrchestrationDefinitionNodeType;
};

export type OrchestrationAdmissionArea =
  "implementation" | "platform" | "runtime" | "security" | "validation";

export type OrchestrationAdmissionCheckState =
  "blocked" | "not-required" | "pending" | "ready" | "synthetic";

export type OrchestrationAdmissionCheck = {
  area: OrchestrationAdmissionArea;
  detail: string;
  evidenceRefs: string[];
  owner: string;
  state: OrchestrationAdmissionCheckState;
  tone: OperationTone;
};

export type OrchestrationDefinitionVersionHistoryEntry = {
  lifecycle: OrchestrationDefinitionLifecycle;
  recordedAt: string;
  summary: string;
  version: string;
};

export type OrchestrationQualificationProjection = {
  decidedAt: string | null;
  decidedBy: string | null;
  decision: OrchestrationDefinitionClassification | null;
  rationale: string;
  reevaluationCondition: string | null;
  status: "in-progress" | "recorded";
  suggestedClassification: OrchestrationDefinitionClassification | null;
};

export type OrchestrationDefinitionRecord = {
  admissionChecks: OrchestrationAdmissionCheck[];
  approvalRequirements: string[];
  businessOwner: string;
  cancellationBoundary: string;
  classification: OrchestrationDefinitionClassification | null;
  completionCondition: string;
  definitionFamilyId: string | null;
  definitionId: string;
  evidenceRequirements: string[];
  executionNodes: OrchestrationDefinitionNode[];
  executionOwner: string;
  expectedReceipt: string;
  failureStrategy: string;
  id: string;
  implementationRepo: string;
  lifecycle: OrchestrationDefinitionLifecycle | null;
  purpose: string;
  qualification: OrchestrationQualificationProjection;
  recordKind: "definition" | "qualification";
  returnProjection: string;
  scenarioKind:
    | "active-definition"
    | "admission-review"
    | "conditional-qualification"
    | "definition-ready"
    | "durable-qualification"
    | "retired-definition"
    | "suspended-definition"
    | "synchronous-qualification";
  securityClassification: string;
  source: OrchestrationDefinitionSource;
  sourceDomain: string;
  sourceRecordType: string;
  title: string;
  trigger: string;
  updatedAt: string;
  version: string | null;
  versionHistory: OrchestrationDefinitionVersionHistoryEntry[];
};

export type OrchestrationDefinitionSummaryMetric = {
  id: string;
  label: "Active" | "Candidates" | "In Review" | "Qualified" | "Ready";
  tone: OperationTone;
  value: string;
};

export type OrchestrationDefinitionPosture = {
  detail: string;
  label: string;
  tone: OperationTone;
};

export type OrchestrationDefinitionFilters = {
  classification:
    "all" | "unclassified" | OrchestrationDefinitionClassification;
  query: string;
  recordState: "all" | "qualification" | OrchestrationDefinitionLifecycle;
  sourceDomain: "all" | string;
};
