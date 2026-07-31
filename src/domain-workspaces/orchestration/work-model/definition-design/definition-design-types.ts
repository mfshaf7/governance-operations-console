import type {
  OrchestrationDefinitionClassification,
  OrchestrationDefinitionNodeType,
} from "../../domain/orchestration-definition-types.ts";

export type OrchestrationQualificationDecision = Exclude<
  OrchestrationDefinitionClassification,
  "admitted-durable"
>;

export type OrchestrationDefinitionDesignStage =
  "define" | "qualify" | "review-request";

export type OrchestrationDefinitionDesignSection =
  | "delivery-versioning"
  | "evidence-security"
  | "execution-plan"
  | "failure-controls"
  | "identity-ownership"
  | "qualification"
  | "trigger-result";

export type OrchestrationQualificationDraft = {
  cancellationRequired: boolean;
  classification: OrchestrationQualificationDecision | null;
  completionCondition: string;
  correlatedHistoryRequired: boolean;
  durableRetryRequired: boolean;
  executionOwner: string;
  executionProblem: string;
  externalWaitRequired: boolean;
  nonAtomicEffects: boolean;
  rationale: string;
  reconciliationRequired: boolean;
  reevaluationCondition: string;
  restartSurvivalRequired: boolean;
  sourceDomain: string;
  sourceRecordType: string;
  synchronousAlternative: string;
  title: string;
  trigger: string;
};

export type OrchestrationIdentityOwnershipDraft = {
  businessOwner: string;
  definitionFamilyId: string;
  definitionId: string;
  executionNodeOwners: string[];
  executionOwner: string;
  implementationRepo: string;
  purpose: string;
  sourceDomain: string;
  sourceRecordType: string;
  title: string;
  version: string;
};

export type OrchestrationTriggerResultDraft = {
  approvalRequirements: string[];
  completionCondition: string;
  expectedReceipt: string;
  idempotencyStrategy: string;
  immutableInputRefs: string[];
  returnProjection: string;
  sourceLockStrategy: string;
  targetLockStrategy: string;
  trigger: string;
};

export type OrchestrationExecutionNodeDraft = {
  adapter: string;
  branchCondition: string;
  dependencies: string[];
  id: string;
  idempotency: string;
  label: string;
  optional: boolean;
  owner: string;
  parallelGroup: string;
  skipReason: string;
  timeout: string;
  type: OrchestrationDefinitionNodeType;
};

export type OrchestrationExecutionPlanDraft = {
  nodes: OrchestrationExecutionNodeDraft[];
  resultSummary: string;
};

export type OrchestrationFailureControlsDraft = {
  cancellationBoundary: string;
  compensationStrategy: string;
  operatorRemediation: string;
  retryExhaustion: string;
  retryPolicy: string;
  signalAvailability: string[];
  supportedDispositions: Array<
    "accept-risk" | "defer" | "remove" | "workaround"
  >;
  terminalFailureCondition: string;
};

export type OrchestrationEvidenceSecurityDraft = {
  approvalAttribution: string;
  causationStrategy: string;
  correlationStrategy: string;
  credentialReferences: string[];
  eventRequirements: string[];
  evidenceReferences: string[];
  redactionPolicy: string;
  retentionPolicy: string;
  securityReviewTriggers: string[];
  sensitiveDataClassification: string;
};

export type OrchestrationDeliveryVersioningDraft = {
  cancellationTests: string;
  compatibilityPlan: string;
  failureInjectionTests: string;
  idempotencyTests: string;
  retirementPlan: string;
  rollbackPlan: string;
  rolloutPlan: string;
  signalTests: string;
  suspensionPlan: string;
  timeoutTests: string;
  workflowReplayTests: string;
};

export type OrchestrationDefinitionRequestRouteDraft = {
  operatorApproved: boolean;
  target: "delivery-art" | "workspace-proposals" | null;
  targetRef: string;
};

export type OrchestrationDefinitionDesignDraft = {
  activeSection: OrchestrationDefinitionDesignSection;
  activeStage: OrchestrationDefinitionDesignStage;
  baselineRecordId: string | null;
  deliveryVersioning: OrchestrationDeliveryVersioningDraft;
  draftId: string;
  evidenceSecurity: OrchestrationEvidenceSecurityDraft;
  executionPlan: OrchestrationExecutionPlanDraft;
  failureControls: OrchestrationFailureControlsDraft;
  identityOwnership: OrchestrationIdentityOwnershipDraft;
  qualification: OrchestrationQualificationDraft;
  requestRoute: OrchestrationDefinitionRequestRouteDraft;
  savedAt: string;
  schemaVersion: 1;
  triggerResult: OrchestrationTriggerResultDraft;
};

export type OrchestrationDefinitionValidationFinding = {
  detail: string;
  field: string;
  id: string;
  section: OrchestrationDefinitionDesignSection | "request-route";
  severity: "error" | "warning";
};

export type OrchestrationDefinitionDesignReadiness = {
  canAdvanceFromQualify: boolean;
  canRecordQualification: boolean;
  canRequestImplementation: boolean;
  findings: OrchestrationDefinitionValidationFinding[];
};

export type OrchestrationDefinitionAdvisorPatch =
  | advisorPatch<"delivery-versioning", "rollbackPlan" | "rolloutPlan">
  | advisorPatch<"evidence-security", "redactionPolicy" | "retentionPolicy">
  | advisorPatch<"execution-plan", "resultSummary">
  | advisorPatch<"failure-controls", "operatorRemediation" | "retryPolicy">
  | advisorPatch<"identity-ownership", "purpose" | "title">
  | advisorPatch<
      "qualification",
      "executionProblem" | "rationale" | "reevaluationCondition"
    >
  | advisorPatch<"trigger-result", "completionCondition" | "trigger">;

type advisorPatch<
  TSection extends OrchestrationDefinitionDesignSection,
  TField extends string,
> = {
  field: TField;
  patchId: string;
  rationale: string;
  section: TSection;
  source: "governed-advisor" | "synthetic-advisor";
  value: string;
};

export type OrchestrationDefinitionAdvisorPatchResolution = {
  patchId: string;
  recordedAt: string;
  result: "applied" | "rejected";
};

export type OrchestrationQualificationReceipt = {
  classification: OrchestrationQualificationDecision;
  draftId: string;
  idempotencyKey: string;
  recordedAt: string;
  receiptId: string;
  resultState: "recorded";
  schemaVersion: 1;
};

export type OrchestrationImplementationRequestReceipt = {
  definitionId: string;
  definitionVersion: string;
  draftId: string;
  idempotencyKey: string;
  recordedAt: string;
  receiptId: string;
  resultState: "recorded";
  routeTarget: "delivery-art" | "workspace-proposals";
  targetRef: string;
  schemaVersion: 1;
};

export type OrchestrationDefinitionDesignReceipt =
  OrchestrationImplementationRequestReceipt | OrchestrationQualificationReceipt;
