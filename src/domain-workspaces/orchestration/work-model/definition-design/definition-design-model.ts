import type { OrchestrationDefinitionRecord } from "../../domain/orchestration-definition-types.ts";
import type {
  OrchestrationDefinitionAdvisorPatch,
  OrchestrationDefinitionAdvisorPatchResolution,
  OrchestrationDefinitionDesignDraft,
  OrchestrationDefinitionDesignReadiness,
  OrchestrationDefinitionDesignStage,
  OrchestrationDefinitionValidationFinding,
  OrchestrationQualificationDecision,
} from "./definition-design-types.ts";

export function createOrchestrationDefinitionDesignDraft({
  draftId,
  record = null,
  savedAt,
}: {
  draftId: string;
  record?: OrchestrationDefinitionRecord | null;
  savedAt: string;
}): OrchestrationDefinitionDesignDraft {
  return {
    activeSection: "qualification",
    activeStage: "qualify",
    baselineRecordId: record?.id ?? null,
    deliveryVersioning: {
      cancellationTests: "",
      compatibilityPlan: "",
      failureInjectionTests: "",
      idempotencyTests: "",
      retirementPlan: "",
      rollbackPlan: "",
      rolloutPlan: "",
      signalTests: "",
      suspensionPlan: "",
      timeoutTests: "",
      workflowReplayTests: "",
    },
    draftId,
    evidenceSecurity: {
      approvalAttribution: "",
      causationStrategy: "",
      correlationStrategy: "",
      credentialReferences: [],
      eventRequirements: [],
      evidenceReferences: [],
      redactionPolicy: "",
      retentionPolicy: "",
      securityReviewTriggers: [],
      sensitiveDataClassification: "",
    },
    executionPlan: {
      nodes:
        record?.executionNodes.map((node) => ({
          adapter: node.adapter,
          branchCondition: node.branchCondition ?? "",
          dependencies: [...node.dependencies],
          id: node.id,
          idempotency: node.idempotency,
          label: node.label,
          optional: node.optional,
          owner: node.owner,
          parallelGroup: node.parallelGroup ?? "",
          skipReason: node.skipReason ?? "",
          timeout: node.timeout,
          type: node.type,
        })) ?? [],
      resultSummary: record?.completionCondition ?? "",
    },
    failureControls: {
      cancellationBoundary: record?.cancellationBoundary ?? "",
      compensationStrategy: "",
      operatorRemediation: "",
      retryExhaustion: "",
      retryPolicy: "",
      signalAvailability: [],
      supportedDispositions: [],
      terminalFailureCondition: record?.failureStrategy ?? "",
    },
    identityOwnership: {
      businessOwner: record?.businessOwner ?? "",
      definitionFamilyId: record?.definitionFamilyId ?? "",
      definitionId: record?.definitionId ?? "",
      executionNodeOwners: record
        ? [...new Set(record.executionNodes.map((node) => node.owner))]
        : [],
      executionOwner: record?.executionOwner ?? "",
      implementationRepo: record?.implementationRepo ?? "",
      purpose: record?.purpose ?? "",
      sourceDomain: record?.sourceDomain ?? "",
      sourceRecordType: record?.sourceRecordType ?? "",
      title: record?.title ?? "",
      version: record?.version ?? "1",
    },
    qualification: {
      cancellationRequired: false,
      classification: qualificationDecision(record?.classification ?? null),
      completionCondition: record?.completionCondition ?? "",
      correlatedHistoryRequired: false,
      durableRetryRequired: false,
      executionOwner: record?.executionOwner ?? "",
      executionProblem: record?.purpose ?? "",
      externalWaitRequired: false,
      nonAtomicEffects: record ? record.executionNodes.length > 1 : false,
      rationale: record?.qualification.rationale ?? "",
      reconciliationRequired: false,
      reevaluationCondition: record?.qualification.reevaluationCondition ?? "",
      restartSurvivalRequired: false,
      sourceDomain: record?.sourceDomain ?? "",
      sourceRecordType: record?.sourceRecordType ?? "",
      synchronousAlternative: "",
      title: record?.title ?? "",
      trigger: record?.trigger ?? "",
    },
    requestRoute: {
      operatorApproved: false,
      target: null,
      targetRef: "",
    },
    savedAt,
    schemaVersion: 1,
    triggerResult: {
      approvalRequirements: record?.approvalRequirements ?? [],
      completionCondition: record?.completionCondition ?? "",
      expectedReceipt: record?.expectedReceipt ?? "",
      idempotencyStrategy: "",
      immutableInputRefs: [],
      returnProjection: record?.returnProjection ?? "",
      sourceLockStrategy: "",
      targetLockStrategy: "",
      trigger: record?.trigger ?? "",
    },
  };
}

export function orchestrationDefinitionDesignStages(
  classification: OrchestrationQualificationDecision | null,
): OrchestrationDefinitionDesignStage[] {
  if (classification === "durable-candidate") {
    return ["qualify", "define", "review-request"];
  }

  if (classification === "conditional" || classification === "synchronous") {
    return ["qualify", "review-request"];
  }

  return ["qualify"];
}

export function orchestrationDefinitionDesignReadiness(
  draft: OrchestrationDefinitionDesignDraft,
): OrchestrationDefinitionDesignReadiness {
  const findings = qualificationFindings(draft);
  const classification = draft.qualification.classification;

  if (classification === "durable-candidate") {
    findings.push(...durableDefinitionFindings(draft));
  }

  const qualificationClear = !findings.some(
    (finding) =>
      finding.severity === "error" && finding.section === "qualification",
  );
  const definitionClear = !findings.some(
    (finding) =>
      finding.severity === "error" &&
      finding.section !== "qualification" &&
      finding.section !== "request-route",
  );
  const requestClear = !findings.some(
    (finding) =>
      finding.severity === "error" && finding.section === "request-route",
  );

  return {
    canAdvanceFromQualify: qualificationClear && classification !== null,
    canRecordQualification:
      qualificationClear &&
      (classification === "conditional" || classification === "synchronous"),
    canRequestImplementation:
      qualificationClear &&
      definitionClear &&
      requestClear &&
      classification === "durable-candidate",
    findings,
  };
}

export function orchestrationDefinitionDesignIsDirty(
  baseline: OrchestrationDefinitionDesignDraft,
  current: OrchestrationDefinitionDesignDraft,
) {
  return (
    JSON.stringify(editableDefinitionDraft(baseline)) !==
    JSON.stringify(editableDefinitionDraft(current))
  );
}

export function applyOrchestrationDefinitionAdvisorPatch(
  draft: OrchestrationDefinitionDesignDraft,
  patch: OrchestrationDefinitionAdvisorPatch,
  recordedAt: string,
): {
  draft: OrchestrationDefinitionDesignDraft;
  resolution: OrchestrationDefinitionAdvisorPatchResolution;
} {
  const next = structuredClone(draft);

  switch (patch.section) {
    case "qualification":
      next.qualification[patch.field] = patch.value;
      break;
    case "identity-ownership":
      next.identityOwnership[patch.field] = patch.value;
      break;
    case "trigger-result":
      next.triggerResult[patch.field] = patch.value;
      break;
    case "execution-plan":
      next.executionPlan[patch.field] = patch.value;
      break;
    case "failure-controls":
      next.failureControls[patch.field] = patch.value;
      break;
    case "evidence-security":
      next.evidenceSecurity[patch.field] = patch.value;
      break;
    case "delivery-versioning":
      next.deliveryVersioning[patch.field] = patch.value;
      break;
  }

  return {
    draft: next,
    resolution: {
      patchId: patch.patchId,
      recordedAt,
      result: "applied",
    },
  };
}

export function rejectOrchestrationDefinitionAdvisorPatch(
  patch: OrchestrationDefinitionAdvisorPatch,
  recordedAt: string,
): OrchestrationDefinitionAdvisorPatchResolution {
  return {
    patchId: patch.patchId,
    recordedAt,
    result: "rejected",
  };
}

function qualificationFindings(
  draft: OrchestrationDefinitionDesignDraft,
): OrchestrationDefinitionValidationFinding[] {
  const findings: OrchestrationDefinitionValidationFinding[] = [];
  required(
    findings,
    "qualification-title",
    "title",
    draft.qualification.title,
    "Name the backend operation being qualified.",
    "qualification",
  );
  required(
    findings,
    "qualification-source-domain",
    "sourceDomain",
    draft.qualification.sourceDomain,
    "Identify the source domain.",
    "qualification",
  );
  required(
    findings,
    "qualification-source-record",
    "sourceRecordType",
    draft.qualification.sourceRecordType,
    "Identify the source record or command type.",
    "qualification",
  );
  required(
    findings,
    "qualification-problem",
    "executionProblem",
    draft.qualification.executionProblem,
    "Describe the accepted backend execution problem.",
    "qualification",
  );
  required(
    findings,
    "qualification-trigger",
    "trigger",
    draft.qualification.trigger,
    "Define the accepted trigger.",
    "qualification",
  );
  required(
    findings,
    "qualification-completion",
    "completionCondition",
    draft.qualification.completionCondition,
    "Define the completion condition.",
    "qualification",
  );
  required(
    findings,
    "qualification-owner",
    "executionOwner",
    draft.qualification.executionOwner,
    "Identify the execution owner.",
    "qualification",
  );
  required(
    findings,
    "qualification-alternative",
    "synchronousAlternative",
    draft.qualification.synchronousAlternative,
    "Explain why one bounded synchronous command is or is not sufficient.",
    "qualification",
  );
  required(
    findings,
    "qualification-rationale",
    "rationale",
    draft.qualification.rationale,
    "Record the operator-approved classification rationale.",
    "qualification",
  );

  if (draft.qualification.classification === null) {
    findings.push({
      detail: "Record a qualification decision.",
      field: "classification",
      id: "qualification-classification",
      section: "qualification",
      severity: "error",
    });
  }

  if (
    draft.qualification.classification === "conditional" &&
    !draft.qualification.reevaluationCondition.trim()
  ) {
    findings.push({
      detail:
        "Conditional qualification requires a concrete reevaluation condition.",
      field: "reevaluationCondition",
      id: "qualification-reevaluation",
      section: "qualification",
      severity: "error",
    });
  }

  return findings;
}

function durableDefinitionFindings(
  draft: OrchestrationDefinitionDesignDraft,
): OrchestrationDefinitionValidationFinding[] {
  const findings: OrchestrationDefinitionValidationFinding[] = [];
  const sectionFields: Array<{
    field: string;
    id: string;
    section: OrchestrationDefinitionValidationFinding["section"];
    value: string;
  }> = [
    {
      field: "title",
      id: "identity-title",
      section: "identity-ownership",
      value: draft.identityOwnership.title,
    },
    {
      field: "definitionId",
      id: "identity-definition-id",
      section: "identity-ownership",
      value: draft.identityOwnership.definitionId,
    },
    {
      field: "definitionFamilyId",
      id: "identity-family-id",
      section: "identity-ownership",
      value: draft.identityOwnership.definitionFamilyId,
    },
    {
      field: "version",
      id: "identity-version",
      section: "identity-ownership",
      value: draft.identityOwnership.version,
    },
    {
      field: "purpose",
      id: "identity-purpose",
      section: "identity-ownership",
      value: draft.identityOwnership.purpose,
    },
    {
      field: "businessOwner",
      id: "identity-business-owner",
      section: "identity-ownership",
      value: draft.identityOwnership.businessOwner,
    },
    {
      field: "sourceDomain",
      id: "identity-source-domain",
      section: "identity-ownership",
      value: draft.identityOwnership.sourceDomain,
    },
    {
      field: "sourceRecordType",
      id: "identity-source-record",
      section: "identity-ownership",
      value: draft.identityOwnership.sourceRecordType,
    },
    {
      field: "implementationRepo",
      id: "identity-implementation-repo",
      section: "identity-ownership",
      value: draft.identityOwnership.implementationRepo,
    },
    {
      field: "executionOwner",
      id: "identity-execution-owner",
      section: "identity-ownership",
      value: draft.identityOwnership.executionOwner,
    },
    {
      field: "trigger",
      id: "trigger-result-trigger",
      section: "trigger-result",
      value: draft.triggerResult.trigger,
    },
    {
      field: "completionCondition",
      id: "trigger-result-completion",
      section: "trigger-result",
      value: draft.triggerResult.completionCondition,
    },
    {
      field: "expectedReceipt",
      id: "trigger-result-receipt",
      section: "trigger-result",
      value: draft.triggerResult.expectedReceipt,
    },
    {
      field: "returnProjection",
      id: "trigger-result-projection",
      section: "trigger-result",
      value: draft.triggerResult.returnProjection,
    },
    {
      field: "idempotencyStrategy",
      id: "trigger-result-idempotency",
      section: "trigger-result",
      value: draft.triggerResult.idempotencyStrategy,
    },
    {
      field: "sourceLockStrategy",
      id: "trigger-result-source-lock",
      section: "trigger-result",
      value: draft.triggerResult.sourceLockStrategy,
    },
    {
      field: "targetLockStrategy",
      id: "trigger-result-target-lock",
      section: "trigger-result",
      value: draft.triggerResult.targetLockStrategy,
    },
    {
      field: "resultSummary",
      id: "execution-plan-result",
      section: "execution-plan",
      value: draft.executionPlan.resultSummary,
    },
    {
      field: "retryPolicy",
      id: "failure-retry-policy",
      section: "failure-controls",
      value: draft.failureControls.retryPolicy,
    },
    {
      field: "retryExhaustion",
      id: "failure-retry-exhaustion",
      section: "failure-controls",
      value: draft.failureControls.retryExhaustion,
    },
    {
      field: "terminalFailureCondition",
      id: "failure-terminal",
      section: "failure-controls",
      value: draft.failureControls.terminalFailureCondition,
    },
    {
      field: "operatorRemediation",
      id: "failure-remediation",
      section: "failure-controls",
      value: draft.failureControls.operatorRemediation,
    },
    {
      field: "cancellationBoundary",
      id: "failure-cancellation",
      section: "failure-controls",
      value: draft.failureControls.cancellationBoundary,
    },
    {
      field: "compensationStrategy",
      id: "failure-compensation",
      section: "failure-controls",
      value: draft.failureControls.compensationStrategy,
    },
    {
      field: "correlationStrategy",
      id: "evidence-correlation",
      section: "evidence-security",
      value: draft.evidenceSecurity.correlationStrategy,
    },
    {
      field: "causationStrategy",
      id: "evidence-causation",
      section: "evidence-security",
      value: draft.evidenceSecurity.causationStrategy,
    },
    {
      field: "approvalAttribution",
      id: "evidence-approval-attribution",
      section: "evidence-security",
      value: draft.evidenceSecurity.approvalAttribution,
    },
    {
      field: "sensitiveDataClassification",
      id: "evidence-classification",
      section: "evidence-security",
      value: draft.evidenceSecurity.sensitiveDataClassification,
    },
    {
      field: "redactionPolicy",
      id: "evidence-redaction",
      section: "evidence-security",
      value: draft.evidenceSecurity.redactionPolicy,
    },
    {
      field: "retentionPolicy",
      id: "evidence-retention",
      section: "evidence-security",
      value: draft.evidenceSecurity.retentionPolicy,
    },
    {
      field: "workflowReplayTests",
      id: "delivery-replay-tests",
      section: "delivery-versioning",
      value: draft.deliveryVersioning.workflowReplayTests,
    },
    {
      field: "idempotencyTests",
      id: "delivery-idempotency-tests",
      section: "delivery-versioning",
      value: draft.deliveryVersioning.idempotencyTests,
    },
    {
      field: "failureInjectionTests",
      id: "delivery-failure-tests",
      section: "delivery-versioning",
      value: draft.deliveryVersioning.failureInjectionTests,
    },
    {
      field: "timeoutTests",
      id: "delivery-timeout-tests",
      section: "delivery-versioning",
      value: draft.deliveryVersioning.timeoutTests,
    },
    {
      field: "cancellationTests",
      id: "delivery-cancellation-tests",
      section: "delivery-versioning",
      value: draft.deliveryVersioning.cancellationTests,
    },
    {
      field: "signalTests",
      id: "delivery-signal-tests",
      section: "delivery-versioning",
      value: draft.deliveryVersioning.signalTests,
    },
    {
      field: "rolloutPlan",
      id: "delivery-rollout",
      section: "delivery-versioning",
      value: draft.deliveryVersioning.rolloutPlan,
    },
    {
      field: "rollbackPlan",
      id: "delivery-rollback",
      section: "delivery-versioning",
      value: draft.deliveryVersioning.rollbackPlan,
    },
    {
      field: "compatibilityPlan",
      id: "delivery-compatibility",
      section: "delivery-versioning",
      value: draft.deliveryVersioning.compatibilityPlan,
    },
    {
      field: "suspensionPlan",
      id: "delivery-suspension",
      section: "delivery-versioning",
      value: draft.deliveryVersioning.suspensionPlan,
    },
    {
      field: "retirementPlan",
      id: "delivery-retirement",
      section: "delivery-versioning",
      value: draft.deliveryVersioning.retirementPlan,
    },
  ];

  for (const entry of sectionFields) {
    required(
      findings,
      entry.id,
      entry.field,
      entry.value,
      "Complete this definition field before requesting implementation.",
      entry.section,
    );
  }

  if (draft.executionPlan.nodes.length === 0) {
    findings.push({
      detail: "Add at least one bounded activity, wait, or subworkflow node.",
      field: "nodes",
      id: "execution-plan-nodes",
      section: "execution-plan",
      severity: "error",
    });
  } else {
    draft.executionPlan.nodes.forEach((node, index) => {
      const nodeFields = [
        ["id", node.id],
        ["label", node.label],
        ["owner", node.owner],
        ["adapter", node.adapter],
        ["timeout", node.timeout],
        ["idempotency", node.idempotency],
      ] as const;

      for (const [field, value] of nodeFields) {
        required(
          findings,
          `execution-node-${index}-${field}`,
          `nodes.${index}.${field}`,
          value,
          `Complete ${field} for execution node ${index + 1}.`,
          "execution-plan",
        );
      }
    });
  }

  requiredArray(
    findings,
    "identity-node-owners",
    "executionNodeOwners",
    draft.identityOwnership.executionNodeOwners,
    "Identify at least one execution-node owner.",
    "identity-ownership",
  );
  requiredArray(
    findings,
    "trigger-immutable-inputs",
    "immutableInputRefs",
    draft.triggerResult.immutableInputRefs,
    "Identify at least one immutable input reference.",
    "trigger-result",
  );
  requiredArray(
    findings,
    "evidence-events",
    "eventRequirements",
    draft.evidenceSecurity.eventRequirements,
    "Identify the material event evidence required from a run.",
    "evidence-security",
  );
  requiredArray(
    findings,
    "evidence-references",
    "evidenceReferences",
    draft.evidenceSecurity.evidenceReferences,
    "Identify at least one durable evidence reference.",
    "evidence-security",
  );
  requiredArray(
    findings,
    "evidence-security-triggers",
    "securityReviewTriggers",
    draft.evidenceSecurity.securityReviewTriggers,
    "Record the security review trigger or an explicit not-required decision.",
    "evidence-security",
  );

  if (!draft.requestRoute.operatorApproved) {
    findings.push({
      detail: "Final operator approval is required.",
      field: "operatorApproved",
      id: "request-route-approval",
      section: "request-route",
      severity: "error",
    });
  }

  if (draft.requestRoute.target === null) {
    findings.push({
      detail: "Choose Workspace Proposals or Delivery ART.",
      field: "target",
      id: "request-route-target",
      section: "request-route",
      severity: "error",
    });
  }

  required(
    findings,
    "request-route-ref",
    "targetRef",
    draft.requestRoute.targetRef,
    "Provide the target work reference.",
    "request-route",
  );

  return findings;
}

function required(
  findings: OrchestrationDefinitionValidationFinding[],
  id: string,
  field: string,
  value: string,
  detail: string,
  section: OrchestrationDefinitionValidationFinding["section"],
) {
  if (!value.trim()) {
    findings.push({
      detail,
      field,
      id,
      section,
      severity: "error",
    });
  }
}

function requiredArray(
  findings: OrchestrationDefinitionValidationFinding[],
  id: string,
  field: string,
  values: string[],
  detail: string,
  section: OrchestrationDefinitionValidationFinding["section"],
) {
  if (!values.some((value) => value.trim())) {
    findings.push({
      detail,
      field,
      id,
      section,
      severity: "error",
    });
  }
}

function qualificationDecision(
  classification: OrchestrationDefinitionRecord["classification"],
): OrchestrationQualificationDecision | null {
  return classification === "admitted-durable"
    ? "durable-candidate"
    : classification;
}

function editableDefinitionDraft(draft: OrchestrationDefinitionDesignDraft) {
  return {
    deliveryVersioning: draft.deliveryVersioning,
    evidenceSecurity: draft.evidenceSecurity,
    executionPlan: draft.executionPlan,
    failureControls: draft.failureControls,
    identityOwnership: draft.identityOwnership,
    qualification: draft.qualification,
    requestRoute: draft.requestRoute,
    triggerResult: draft.triggerResult,
  };
}
