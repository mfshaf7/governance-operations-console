import { createBrowserOperationDraftStore } from "../../../operation-runtime/browser-draft-store.ts";
import type {
  OrchestrationDefinitionDesignDraft,
  OrchestrationDefinitionDesignSection,
  OrchestrationDefinitionDesignStage,
  OrchestrationExecutionNodeDraft,
  OrchestrationQualificationDecision,
} from "../../work-model/definition-design/definition-design-types.ts";

const draftStore = createBrowserOperationDraftStore();

export function orchestrationDefinitionDraftKey(draftId: string) {
  return `orchestration-definition-design:${draftId}:v1`;
}

export function loadOrchestrationDefinitionDraft(
  draftId: string,
): OrchestrationDefinitionDesignDraft | null {
  return draftStore.readJson(
    orchestrationDefinitionDraftKey(draftId),
    normalizeOrchestrationDefinitionDraft,
  );
}

export function saveOrchestrationDefinitionDraft(
  draft: OrchestrationDefinitionDesignDraft,
) {
  draftStore.writeJson(orchestrationDefinitionDraftKey(draft.draftId), draft);
}

export function discardOrchestrationDefinitionDraft(draftId: string) {
  draftStore.remove(orchestrationDefinitionDraftKey(draftId));
}

export function normalizeOrchestrationDefinitionDraft(
  value: unknown,
): OrchestrationDefinitionDesignDraft | null {
  if (!isRecord(value) || value.schemaVersion !== 1) {
    return null;
  }

  const candidate = value as Partial<OrchestrationDefinitionDesignDraft>;

  if (
    !isString(candidate.draftId) ||
    !isString(candidate.savedAt) ||
    !isNullableString(candidate.baselineRecordId) ||
    !isDefinitionDesignStage(candidate.activeStage) ||
    !isDefinitionDesignSection(candidate.activeSection) ||
    !isQualificationDraft(candidate.qualification) ||
    !isIdentityOwnershipDraft(candidate.identityOwnership) ||
    !isTriggerResultDraft(candidate.triggerResult) ||
    !isExecutionPlanDraft(candidate.executionPlan) ||
    !isFailureControlsDraft(candidate.failureControls) ||
    !isEvidenceSecurityDraft(candidate.evidenceSecurity) ||
    !isDeliveryVersioningDraft(candidate.deliveryVersioning) ||
    !isRequestRouteDraft(candidate.requestRoute)
  ) {
    return null;
  }

  return candidate as OrchestrationDefinitionDesignDraft;
}

function isQualificationDraft(value: unknown) {
  return (
    isRecord(value) &&
    hasBooleanFields(value, [
      "cancellationRequired",
      "correlatedHistoryRequired",
      "durableRetryRequired",
      "externalWaitRequired",
      "nonAtomicEffects",
      "reconciliationRequired",
      "restartSurvivalRequired",
    ]) &&
    hasStringFields(value, [
      "completionCondition",
      "executionOwner",
      "executionProblem",
      "rationale",
      "reevaluationCondition",
      "sourceDomain",
      "sourceRecordType",
      "synchronousAlternative",
      "title",
      "trigger",
    ]) &&
    isQualificationDecision(value.classification)
  );
}

function isIdentityOwnershipDraft(value: unknown) {
  return (
    isRecord(value) &&
    hasStringFields(value, [
      "businessOwner",
      "definitionFamilyId",
      "definitionId",
      "executionOwner",
      "implementationRepo",
      "purpose",
      "sourceDomain",
      "sourceRecordType",
      "title",
      "version",
    ]) &&
    isStringArray(value.executionNodeOwners)
  );
}

function isTriggerResultDraft(value: unknown) {
  return (
    isRecord(value) &&
    hasStringFields(value, [
      "completionCondition",
      "expectedReceipt",
      "idempotencyStrategy",
      "returnProjection",
      "sourceLockStrategy",
      "targetLockStrategy",
      "trigger",
    ]) &&
    isStringArray(value.approvalRequirements) &&
    isStringArray(value.immutableInputRefs)
  );
}

function isExecutionPlanDraft(value: unknown) {
  return (
    isRecord(value) &&
    isString(value.resultSummary) &&
    Array.isArray(value.nodes) &&
    value.nodes.every(isExecutionNodeDraft)
  );
}

function isExecutionNodeDraft(
  value: unknown,
): value is OrchestrationExecutionNodeDraft {
  return (
    isRecord(value) &&
    hasStringFields(value, [
      "adapter",
      "branchCondition",
      "id",
      "idempotency",
      "label",
      "owner",
      "parallelGroup",
      "skipReason",
      "timeout",
    ]) &&
    typeof value.optional === "boolean" &&
    isStringArray(value.dependencies) &&
    (value.type === "activity" ||
      value.type === "subworkflow" ||
      value.type === "wait")
  );
}

function isFailureControlsDraft(value: unknown) {
  return (
    isRecord(value) &&
    hasStringFields(value, [
      "cancellationBoundary",
      "compensationStrategy",
      "operatorRemediation",
      "retryExhaustion",
      "retryPolicy",
      "terminalFailureCondition",
    ]) &&
    isStringArray(value.signalAvailability) &&
    Array.isArray(value.supportedDispositions) &&
    value.supportedDispositions.every(
      (entry) =>
        entry === "accept-risk" ||
        entry === "defer" ||
        entry === "remove" ||
        entry === "workaround",
    )
  );
}

function isEvidenceSecurityDraft(value: unknown) {
  return (
    isRecord(value) &&
    hasStringFields(value, [
      "approvalAttribution",
      "causationStrategy",
      "correlationStrategy",
      "redactionPolicy",
      "retentionPolicy",
      "sensitiveDataClassification",
    ]) &&
    isStringArray(value.credentialReferences) &&
    isStringArray(value.eventRequirements) &&
    isStringArray(value.evidenceReferences) &&
    isStringArray(value.securityReviewTriggers)
  );
}

function isDeliveryVersioningDraft(value: unknown) {
  return (
    isRecord(value) &&
    hasStringFields(value, [
      "cancellationTests",
      "compatibilityPlan",
      "failureInjectionTests",
      "idempotencyTests",
      "retirementPlan",
      "rollbackPlan",
      "rolloutPlan",
      "signalTests",
      "suspensionPlan",
      "timeoutTests",
      "workflowReplayTests",
    ])
  );
}

function isRequestRouteDraft(value: unknown) {
  return (
    isRecord(value) &&
    typeof value.operatorApproved === "boolean" &&
    (value.target === null ||
      value.target === "delivery-art" ||
      value.target === "workspace-proposals") &&
    isString(value.targetRef)
  );
}

function isDefinitionDesignStage(
  value: unknown,
): value is OrchestrationDefinitionDesignStage {
  return (
    value === "define" || value === "qualify" || value === "review-request"
  );
}

function isDefinitionDesignSection(
  value: unknown,
): value is OrchestrationDefinitionDesignSection {
  return (
    value === "delivery-versioning" ||
    value === "evidence-security" ||
    value === "execution-plan" ||
    value === "failure-controls" ||
    value === "identity-ownership" ||
    value === "qualification" ||
    value === "trigger-result"
  );
}

function isQualificationDecision(
  value: unknown,
): value is OrchestrationQualificationDecision | null {
  return (
    value === null ||
    value === "conditional" ||
    value === "durable-candidate" ||
    value === "synchronous"
  );
}

function hasStringFields(value: Record<string, unknown>, fields: string[]) {
  return fields.every((field) => isString(value[field]));
}

function hasBooleanFields(value: Record<string, unknown>, fields: string[]) {
  return fields.every((field) => typeof value[field] === "boolean");
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || isString(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
