import type {
  OrchestrationAdmissionCheck,
  OrchestrationDefinitionNode,
  OrchestrationDefinitionRecord,
  OrchestrationDefinitionSource,
} from "../../domain/orchestration-definition-types.ts";

const observedAt = "2026-07-16T00:00:00.000Z";

const useCaseMatrixSource: OrchestrationDefinitionSource = {
  authority: "workspace-prototype-studio",
  freshness: "current",
  mode: "contract-derived",
  observedAt,
  ref: "docs/product/orchestration-use-case-matrix.md",
  schemaVersion: "1",
  sourceVersion: "orchestration-use-case-matrix-v1",
};

const refinementDefinitionSource: OrchestrationDefinitionSource = {
  authority: "workspace-prototype-studio",
  freshness: "current",
  mode: "contract-derived",
  observedAt,
  ref: "docs/product/orchestration-definitions/delivery-refinement-apply.md",
  schemaVersion: "1",
  sourceVersion: "delivery.refinement.apply-v1",
};

const syntheticDefinitionSource: OrchestrationDefinitionSource = {
  authority: "workspace-prototype-studio",
  freshness: "current",
  mode: "synthetic-scenario",
  observedAt,
  ref: "scenario://orchestration/definitions",
  schemaVersion: "1",
  sourceVersion: "orchestration-definition-scenarios-v1",
};

const noAdmissionRequired: OrchestrationAdmissionCheck[] = [
  admissionCheck(
    "implementation",
    "not-required",
    "No durable implementation is required for this qualification.",
    "Owning domain",
  ),
  admissionCheck(
    "validation",
    "not-required",
    "Ordinary command validation remains with the owning domain.",
    "Owning domain",
  ),
  admissionCheck(
    "platform",
    "not-required",
    "No durable runtime adoption is requested.",
    "Platform Engineering",
  ),
  admissionCheck(
    "security",
    "not-required",
    "No new trust boundary is introduced by this qualification.",
    "Security Architecture",
  ),
  admissionCheck(
    "runtime",
    "not-required",
    "The operation remains outside the durable runtime.",
    "Operator Orchestration Service",
  ),
];

const definitionReadyAdmission: OrchestrationAdmissionCheck[] = [
  admissionCheck(
    "implementation",
    "pending",
    "Executable source and OOS request/run APIs have not been implemented.",
    "Operator Orchestration Service",
  ),
  admissionCheck(
    "validation",
    "pending",
    "Replay, idempotency, failure-injection, timeout, and cancellation evidence are required.",
    "Implementation owner",
  ),
  admissionCheck(
    "platform",
    "blocked",
    "No durable runtime adapter or worker deployment has been admitted.",
    "Platform Engineering",
  ),
  admissionCheck(
    "security",
    "blocked",
    "Credential, trust-boundary, and runtime security acceptance are absent.",
    "Security Architecture",
  ),
  admissionCheck(
    "runtime",
    "blocked",
    "OOS exposes no admitted durable definition, run, control, event, or receipt API.",
    "Operator Orchestration Service",
  ),
];

const syntheticAdmissionReview: OrchestrationAdmissionCheck[] = [
  admissionCheck(
    "implementation",
    "ready",
    "Synthetic implementation evidence is present for scenario coverage only.",
    "Scenario implementation owner",
  ),
  admissionCheck(
    "validation",
    "ready",
    "Synthetic validation evidence is present for scenario coverage only.",
    "Scenario implementation owner",
  ),
  admissionCheck(
    "platform",
    "pending",
    "The scenario is waiting on hypothetical platform admission.",
    "Platform Engineering",
  ),
  admissionCheck(
    "security",
    "pending",
    "The scenario is waiting on hypothetical security acceptance.",
    "Security Architecture",
  ),
  admissionCheck(
    "runtime",
    "pending",
    "The scenario is waiting on hypothetical OOS runtime admission.",
    "Operator Orchestration Service",
  ),
];

const syntheticAdmittedChecks: OrchestrationAdmissionCheck[] = [
  admissionCheck(
    "implementation",
    "synthetic",
    "Synthetic evidence models an implemented immutable version.",
    "Scenario implementation owner",
  ),
  admissionCheck(
    "validation",
    "synthetic",
    "Synthetic evidence models complete replay and failure-path validation.",
    "Scenario implementation owner",
  ),
  admissionCheck(
    "platform",
    "synthetic",
    "Synthetic evidence models platform admission without claiming a live runtime.",
    "Platform Engineering",
  ),
  admissionCheck(
    "security",
    "synthetic",
    "Synthetic evidence models security acceptance without claiming live approval.",
    "Security Architecture",
  ),
  admissionCheck(
    "runtime",
    "synthetic",
    "Synthetic evidence models an admitted runtime version for UI scenario coverage only.",
    "Operator Orchestration Service",
  ),
];

export const orchestrationDefinitionRecords: OrchestrationDefinitionRecord[] = [
  createDefinitionRecord({
    admissionChecks: noAdmissionRequired,
    classification: "synchronous",
    completionCondition: "One canonical proposal record is returned.",
    definitionId: "qualification.proposal.capture",
    executionOwner: "Workspace Proposals through OOS",
    expectedReceipt: "proposal.capture.receipt",
    id: "orchestration-definition-qualification-proposal-capture",
    implementationRepo: "operator-orchestration-service",
    lifecycle: null,
    purpose: "Record one bounded proposal capture command.",
    qualification: {
      decidedAt: observedAt,
      decidedBy: "prototype architecture review",
      decision: "synchronous",
      rationale:
        "The command creates one canonical record and does not require restart survival, external waits, or multi-system recovery.",
      reevaluationCondition: null,
      status: "recorded",
      suggestedClassification: "synchronous",
    },
    recordKind: "qualification",
    returnProjection: "proposal.record.v1",
    scenarioKind: "synchronous-qualification",
    sourceDomain: "proposal",
    sourceRecordType: "proposal capture request",
    title: "Proposal Capture",
    trigger: "Operator submits a valid proposal capture request.",
    version: null,
  }),
  createDefinitionRecord({
    admissionChecks: noAdmissionRequired,
    classification: "conditional",
    completionCondition:
      "The target domain acknowledges the handoff inside the bounded request.",
    definitionId: "qualification.proposal.handoff-dispatch",
    executionOwner: "Workspace Proposals through OOS",
    expectedReceipt: "proposal.handoff.receipt",
    id: "orchestration-definition-qualification-proposal-handoff",
    implementationRepo: "operator-orchestration-service",
    lifecycle: null,
    purpose:
      "Dispatch an approved proposal handoff and retain the target acknowledgement.",
    qualification: {
      decidedAt: observedAt,
      decidedBy: "prototype architecture review",
      decision: "conditional",
      rationale:
        "The current command can remain bounded while target acknowledgement is immediate and recoverable within one request.",
      reevaluationCondition:
        "Promote when dispatch and target receipt waiting become asynchronous or require durable recovery.",
      status: "recorded",
      suggestedClassification: "conditional",
    },
    recordKind: "qualification",
    returnProjection: "proposal.handoff-state.v1",
    scenarioKind: "conditional-qualification",
    sourceDomain: "proposal",
    sourceRecordType: "proposal handoff packet",
    title: "Proposal Handoff Dispatch",
    trigger: "Operator applies an approved proposal handoff.",
    version: null,
  }),
  createDefinitionRecord({
    admissionChecks: definitionReadyAdmission,
    classification: null,
    completionCondition:
      "Repository creation, registration, contract updates, checks, and reconciliation are verified.",
    definitionId: "candidate.repository.onboarding-fulfillment",
    executionOwner: "Repository Operation through OOS",
    expectedReceipt: "repository.onboarding.fulfillment.receipt",
    id: "orchestration-definition-candidate-repository-onboarding",
    implementationRepo: "operator-orchestration-service",
    lifecycle: "candidate",
    purpose:
      "Evaluate future recoverable repository onboarding across non-atomic owner boundaries.",
    qualification: {
      decidedAt: null,
      decidedBy: null,
      decision: null,
      rationale:
        "The operation appears to cross repository creation, workspace registration, contract updates, validation, and reconciliation.",
      reevaluationCondition: null,
      status: "in-progress",
      suggestedClassification: "durable-candidate",
    },
    recordKind: "definition",
    returnProjection: "repository.onboarding-state.v1",
    scenarioKind: "durable-qualification",
    sourceDomain: "repository",
    sourceRecordType: "repository onboarding request",
    title: "Repository Onboarding Fulfillment",
    trigger: "An admitted repository request is approved for fulfillment.",
    version: "candidate-1",
  }),
  createDefinitionRecord({
    admissionChecks: definitionReadyAdmission,
    approvalRequirements: [
      "Authenticated operator approval bound to the frozen Refinement packet digest",
    ],
    cancellationBoundary:
      "Cancellation stops future activities but does not roll back verified writes.",
    classification: "durable-candidate",
    completionCondition:
      "Canonical Delivery read-back verifies governance, plan, and metadata outcomes.",
    definitionFamilyId: "delivery.refinement",
    definitionId: "delivery.refinement.apply",
    evidenceRequirements: [
      "Immutable packet and artifact digests",
      "Per-activity receipts",
      "Canonical before and after references",
      "Final verification projection digest",
    ],
    executionNodes: refinementApplyNodes(),
    executionOwner: "Operator Orchestration Service",
    expectedReceipt: "delivery.refinement.apply.v1",
    failureStrategy:
      "Resume idempotently from verified activity outcomes and expose retained effects.",
    id: "orchestration-definition-delivery-refinement-apply-v1",
    implementationRepo: "operator-orchestration-service",
    lifecycle: "definition-ready",
    purpose:
      "Apply one operator-approved Refinement packet through recoverable execution.",
    qualification: {
      decidedAt: observedAt,
      decidedBy: "prototype architecture review",
      decision: "durable-candidate",
      rationale:
        "Governance, plan reconciliation, bulk metadata updates, and canonical verification are non-atomic and can leave partial effects.",
      reevaluationCondition: null,
      status: "recorded",
      suggestedClassification: "durable-candidate",
    },
    recordKind: "definition",
    returnProjection: "delivery.refinement.apply-run.v1",
    scenarioKind: "definition-ready",
    securityClassification:
      "References and digests only; no raw secrets or mutable tree payloads.",
    source: refinementDefinitionSource,
    sourceDomain: "delivery.refinement",
    sourceRecordType: "frozen refinement packet",
    title: "Delivery Refinement Apply",
    trigger:
      "Operator presses Apply Refinement after packet and readiness checks pass.",
    version: "1",
    versionHistory: [
      {
        lifecycle: "definition-ready",
        recordedAt: observedAt,
        summary: "Version 1 contract completed for implementation review.",
        version: "1",
      },
    ],
  }),
  createDefinitionRecord({
    admissionChecks: syntheticAdmissionReview,
    classification: "durable-candidate",
    completionCondition:
      "Draft state, context snapshot, tree changes, and canonical verification are reconciled.",
    definitionFamilyId: "scenario.delivery.work-design",
    definitionId: "scenario.delivery.work-design.apply",
    executionNodes: workDesignScenarioNodes(),
    executionOwner: "Synthetic OOS scenario",
    expectedReceipt: "scenario.delivery.work-design.apply.v2",
    id: "orchestration-definition-scenario-admission-review",
    implementationRepo: "scenario-owner-repo",
    lifecycle: "admission-review",
    purpose:
      "Exercise definition admission-review projection without claiming a live implementation.",
    qualification: {
      decidedAt: observedAt,
      decidedBy: "synthetic scenario",
      decision: "durable-candidate",
      rationale:
        "The scenario models non-atomic snapshot, update, attachment, and verification behavior.",
      reevaluationCondition: null,
      status: "recorded",
      suggestedClassification: "durable-candidate",
    },
    recordKind: "definition",
    returnProjection: "scenario.delivery.work-design.run.v2",
    scenarioKind: "admission-review",
    source: syntheticDefinitionSource,
    sourceDomain: "delivery.work-design",
    sourceRecordType: "synthetic work-design packet",
    title: "Scenario: Work Design Apply",
    trigger: "A synthetic approved draft requests recoverable application.",
    version: "2",
  }),
  createDefinitionRecord({
    admissionChecks: syntheticAdmittedChecks,
    classification: "admitted-durable",
    completionCondition:
      "The synthetic prototype workspace and preview support inventory are verified.",
    definitionFamilyId: "scenario.prototype.landing",
    definitionId: "scenario.prototype.landing.run",
    executionNodes: prototypeLandingScenarioNodes(),
    executionOwner: "Synthetic OOS scenario",
    expectedReceipt: "scenario.prototype.landing.receipt.v3",
    id: "orchestration-definition-scenario-active",
    implementationRepo: "scenario-owner-repo",
    lifecycle: "active",
    purpose:
      "Exercise active-definition and run projections without claiming a live runtime.",
    qualification: {
      decidedAt: observedAt,
      decidedBy: "synthetic scenario",
      decision: "admitted-durable",
      rationale:
        "Synthetic lifecycle coverage models restart-safe setup, conditional support, logs, and verification.",
      reevaluationCondition: null,
      status: "recorded",
      suggestedClassification: "admitted-durable",
    },
    recordKind: "definition",
    returnProjection: "scenario.prototype.landing.run.v3",
    scenarioKind: "active-definition",
    source: syntheticDefinitionSource,
    sourceDomain: "prototype",
    sourceRecordType: "synthetic landing packet",
    title: "Scenario: Prototype Landing",
    trigger: "A synthetic approved landing packet is accepted.",
    version: "3",
    versionHistory: [
      {
        lifecycle: "retired",
        recordedAt: "2026-07-12T00:00:00.000Z",
        summary: "Synthetic version 1 retained for historical coverage.",
        version: "1",
      },
      {
        lifecycle: "suspended",
        recordedAt: "2026-07-14T00:00:00.000Z",
        summary: "Synthetic version 2 retained for suspension coverage.",
        version: "2",
      },
      {
        lifecycle: "active",
        recordedAt: observedAt,
        summary: "Synthetic version 3 represents the active scenario.",
        version: "3",
      },
    ],
  }),
  createDefinitionRecord({
    admissionChecks: syntheticAdmittedChecks,
    classification: "admitted-durable",
    completionCondition:
      "The synthetic prototype workspace and preview support inventory are verified.",
    definitionFamilyId: "scenario.prototype.landing",
    definitionId: "scenario.prototype.landing.run",
    executionNodes: prototypeLandingScenarioNodes(),
    executionOwner: "Synthetic OOS scenario",
    expectedReceipt: "scenario.prototype.landing.receipt.v2",
    id: "orchestration-definition-scenario-suspended",
    implementationRepo: "scenario-owner-repo",
    lifecycle: "suspended",
    purpose:
      "Exercise suspended immutable-version review without claiming a live runtime.",
    qualification: syntheticAdmittedQualification(),
    recordKind: "definition",
    returnProjection: "scenario.prototype.landing.run.v2",
    scenarioKind: "suspended-definition",
    source: syntheticDefinitionSource,
    sourceDomain: "prototype",
    sourceRecordType: "synthetic landing packet",
    title: "Scenario: Prototype Landing",
    trigger: "Synthetic retained version; new runs are disabled.",
    version: "2",
  }),
  createDefinitionRecord({
    admissionChecks: syntheticAdmittedChecks,
    classification: "admitted-durable",
    completionCondition:
      "The synthetic prototype workspace and preview support inventory are verified.",
    definitionFamilyId: "scenario.prototype.landing",
    definitionId: "scenario.prototype.landing.run",
    executionNodes: prototypeLandingScenarioNodes(),
    executionOwner: "Synthetic OOS scenario",
    expectedReceipt: "scenario.prototype.landing.receipt.v1",
    id: "orchestration-definition-scenario-retired",
    implementationRepo: "scenario-owner-repo",
    lifecycle: "retired",
    purpose:
      "Exercise retired immutable-version history without claiming a live runtime.",
    qualification: syntheticAdmittedQualification(),
    recordKind: "definition",
    returnProjection: "scenario.prototype.landing.run.v1",
    scenarioKind: "retired-definition",
    source: syntheticDefinitionSource,
    sourceDomain: "prototype",
    sourceRecordType: "synthetic landing packet",
    title: "Scenario: Prototype Landing",
    trigger: "Synthetic historical version; no new runs are allowed.",
    version: "1",
  }),
];

type DefinitionFixtureInput = Pick<
  OrchestrationDefinitionRecord,
  | "admissionChecks"
  | "classification"
  | "completionCondition"
  | "definitionId"
  | "executionOwner"
  | "expectedReceipt"
  | "id"
  | "implementationRepo"
  | "lifecycle"
  | "purpose"
  | "qualification"
  | "recordKind"
  | "returnProjection"
  | "scenarioKind"
  | "sourceDomain"
  | "sourceRecordType"
  | "title"
  | "trigger"
  | "version"
> &
  Partial<
    Omit<
      OrchestrationDefinitionRecord,
      | "admissionChecks"
      | "classification"
      | "completionCondition"
      | "definitionId"
      | "executionOwner"
      | "expectedReceipt"
      | "id"
      | "implementationRepo"
      | "lifecycle"
      | "purpose"
      | "qualification"
      | "recordKind"
      | "returnProjection"
      | "scenarioKind"
      | "sourceDomain"
      | "sourceRecordType"
      | "title"
      | "trigger"
      | "version"
    >
  >;

function createDefinitionRecord(
  input: DefinitionFixtureInput,
): OrchestrationDefinitionRecord {
  return {
    approvalRequirements: [],
    businessOwner: input.sourceDomain,
    cancellationBoundary: "No durable cancellation boundary is defined.",
    definitionFamilyId: null,
    evidenceRequirements: [],
    executionNodes: [],
    failureStrategy: "Return one bounded error to the owning domain.",
    securityClassification: "operator-safe metadata",
    source: useCaseMatrixSource,
    updatedAt: observedAt,
    versionHistory: [],
    ...input,
  };
}

function admissionCheck(
  area: OrchestrationAdmissionCheck["area"],
  state: OrchestrationAdmissionCheck["state"],
  detail: string,
  owner: string,
): OrchestrationAdmissionCheck {
  const tone = {
    blocked: "warn",
    "not-required": "muted",
    pending: "warn",
    ready: "ok",
    synthetic: "info",
  } as const;

  return {
    area,
    detail,
    evidenceRefs: [],
    owner,
    state,
    tone: tone[state],
  };
}

function node(
  id: string,
  label: string,
  owner: string,
  dependencies: string[] = [],
): OrchestrationDefinitionNode {
  return {
    adapter: "OOS-owned admitted adapter",
    artifactRefs: [`artifact://${id}`],
    branchCondition: null,
    dependencies,
    id,
    idempotency: "Required for every side effect.",
    inputRefs: [`input://${id}`],
    label,
    logRefs: [`log://${id}`],
    optional: false,
    outputRefs: [`output://${id}`],
    owner,
    parallelGroup: null,
    receiptRefs: [`receipt://${id}`],
    skipReason: null,
    timeout: "Definition-owned bounded timeout",
    type: "activity",
  };
}

function refinementApplyNodes(): OrchestrationDefinitionNode[] {
  return [
    node(
      "preflight",
      "Preflight frozen request",
      "Operator Orchestration Service",
    ),
    node("governance", "Apply initiative governance", "Delivery OOS adapter", [
      "preflight",
    ]),
    node("plan", "Reconcile delivery plan", "Delivery OOS adapter", [
      "governance",
    ]),
    node("metadata", "Apply reviewed metadata", "Delivery OOS adapter", [
      "plan",
    ]),
    node(
      "verify",
      "Verify canonical projection",
      "Operator Orchestration Service",
      ["metadata"],
    ),
  ];
}

function workDesignScenarioNodes(): OrchestrationDefinitionNode[] {
  return [
    node("validate", "Validate approved draft", "Synthetic Delivery adapter"),
    node("update", "Apply tree changes", "Synthetic Delivery adapter", [
      "validate",
    ]),
    node("attach", "Attach context snapshot", "Synthetic evidence adapter", [
      "update",
    ]),
    node("verify", "Verify applied draft", "Synthetic OOS scenario", [
      "attach",
    ]),
  ];
}

function prototypeLandingScenarioNodes(): OrchestrationDefinitionNode[] {
  return [
    node("locks", "Acquire source and target locks", "Synthetic OOS scenario"),
    node(
      "scaffold",
      "Prepare project scaffold",
      "Synthetic prototype adapter",
      ["locks"],
    ),
    node(
      "support",
      "Configure selected support",
      "Synthetic prototype adapter",
      ["scaffold"],
    ),
    node("preview", "Prepare preview adapter", "Synthetic host adapter", [
      "support",
    ]),
    node("verify", "Verify landing outputs", "Synthetic OOS scenario", [
      "preview",
    ]),
  ];
}

function syntheticAdmittedQualification(): OrchestrationDefinitionRecord["qualification"] {
  return {
    decidedAt: observedAt,
    decidedBy: "synthetic scenario",
    decision: "admitted-durable",
    rationale:
      "Synthetic lifecycle coverage only; this does not represent runtime admission.",
    reevaluationCondition: null,
    status: "recorded",
    suggestedClassification: "admitted-durable",
  };
}
