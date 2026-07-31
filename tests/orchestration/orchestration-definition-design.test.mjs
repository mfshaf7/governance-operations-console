import assert from "node:assert/strict";
import test from "node:test";

import { orchestrationDefinitionRecords } from "../../src/domain-workspaces/orchestration/read-model/definitions/orchestration-definitions.fixture.ts";
import {
  recordOrchestrationImplementationRequest,
} from "../../src/domain-workspaces/orchestration/local-runtime/definition-design/definition-receipt-store.ts";
import {
  applyOrchestrationDefinitionAdvisorPatch,
  createOrchestrationDefinitionDesignDraft,
  orchestrationDefinitionDesignReadiness,
  orchestrationDefinitionDesignStages,
} from "../../src/domain-workspaces/orchestration/work-model/definition-design/definition-design-model.ts";
import {
  createDefinitionDesignInitialDraft,
  definitionDesignDraftId,
  definitionDesignEntryAllowed,
  definitionDesignWorkflowSteps,
  definitionReviewObligations,
} from "../../src/domain-workspaces/orchestration/presentation/workflows/definition-design/definition-design-view-model.ts";
import {
  createDefinitionAdvisorTurn,
} from "../../src/domain-workspaces/orchestration/presentation/workflows/definition-design/support/definition-advisor-context.ts";

test("definition design entry derives stable draft identity and lifecycle stage", () => {
  const candidate = orchestrationDefinitionRecords.find(
    (record) => record.lifecycle === "candidate",
  );
  const ready = orchestrationDefinitionRecords.find(
    (record) => record.lifecycle === "definition-ready",
  );
  const active = orchestrationDefinitionRecords.find(
    (record) => record.lifecycle === "active",
  );
  assert.ok(candidate);
  assert.ok(ready);
  assert.ok(active);

  assert.equal(definitionDesignDraftId(null), "orchestration-definition-new");
  assert.equal(definitionDesignDraftId(candidate), candidate.id);
  assert.equal(
    definitionDesignDraftId(active),
    `${active.definitionId}:candidate:4`,
  );
  assert.equal(
    createDefinitionDesignInitialDraft({
      record: candidate,
      savedAt: "2026-07-16T12:00:00.000Z",
    }).activeStage,
    "qualify",
  );
  assert.equal(
    createDefinitionDesignInitialDraft({
      record: ready,
      savedAt: "2026-07-16T12:00:00.000Z",
    }).activeStage,
    "review-request",
  );

  const activeDraft = createDefinitionDesignInitialDraft({
    record: active,
    savedAt: "2026-07-16T12:00:00.000Z",
  });
  assert.equal(activeDraft.activeStage, "define");
  assert.equal(activeDraft.identityOwnership.version, "4");
  assert.equal(active.version, "3");
});

test("only mutable definition postures expose the design workflow", () => {
  const allowed = orchestrationDefinitionRecords
    .filter(definitionDesignEntryAllowed)
    .map((record) => record.lifecycle ?? record.qualification.status);

  assert.deepEqual(allowed, ["candidate", "definition-ready", "active"]);
});

test("qualification classification selects a two-stage or three-stage workflow", () => {
  assert.deepEqual(orchestrationDefinitionDesignStages("synchronous"), [
    "qualify",
    "review-request",
  ]);
  assert.deepEqual(orchestrationDefinitionDesignStages("conditional"), [
    "qualify",
    "review-request",
  ]);
  assert.deepEqual(orchestrationDefinitionDesignStages("durable-candidate"), [
    "qualify",
    "define",
    "review-request",
  ]);

  const durable = completeDurableDraft(
    createOrchestrationDefinitionDesignDraft({
      draftId: "workflow-step-test",
      savedAt: "2026-07-16T12:01:00.000Z",
    }),
  );
  durable.activeStage = "define";

  assert.deepEqual(
    definitionDesignWorkflowSteps(durable, false).map((step) => ({
      id: step.id,
      state: step.stateLabel,
    })),
    [
      { id: "qualify", state: "Done" },
      { id: "define", state: "Current" },
      { id: "review-request", state: "Next" },
    ],
  );
});

test("prototype-local advisor creates one explicit patch without mutating draft", () => {
  const draft = completeQualification(
    createOrchestrationDefinitionDesignDraft({
      draftId: "advisor-test",
      savedAt: "2026-07-16T12:02:00.000Z",
    }),
    "durable-candidate",
  );
  draft.qualification.restartSurvivalRequired = true;
  draft.qualification.externalWaitRequired = true;
  draft.qualification.rationale = "";

  const turn = createDefinitionAdvisorTurn({
    draft,
    prompt: "Challenge the durability classification.",
    sequence: 1,
  });

  assert.equal(turn.patch.section, "qualification");
  assert.equal(turn.patch.field, "rationale");
  assert.equal(draft.qualification.rationale, "");
  assert.match(turn.response, /durable-candidate/);

  const applied = applyOrchestrationDefinitionAdvisorPatch(
    draft,
    turn.patch,
    "2026-07-16T12:03:00.000Z",
  );
  assert.notEqual(applied.draft.qualification.rationale, "");
  assert.equal(applied.resolution.result, "applied");
});

test("implementation readiness covers all six definition sections and work-home route", () => {
  const incomplete = completeQualification(
    createOrchestrationDefinitionDesignDraft({
      draftId: "readiness-test",
      savedAt: "2026-07-16T12:04:00.000Z",
    }),
    "durable-candidate",
  );
  const incompleteReadiness =
    orchestrationDefinitionDesignReadiness(incomplete);

  assert.equal(incompleteReadiness.canRequestImplementation, false);
  assert.deepEqual(
    new Set(incompleteReadiness.findings.map((finding) => finding.section)),
    new Set([
      "delivery-versioning",
      "evidence-security",
      "execution-plan",
      "failure-controls",
      "identity-ownership",
      "request-route",
      "trigger-result",
    ]),
  );

  const complete = completeDurableDraft(incomplete);
  assert.deepEqual(orchestrationDefinitionDesignReadiness(complete), {
    canAdvanceFromQualify: true,
    canRecordQualification: false,
    canRequestImplementation: true,
    findings: [],
  });
});

test("review obligations retain the exact section finding needed for correction", () => {
  const draft = completeDurableDraft(
    createOrchestrationDefinitionDesignDraft({
      draftId: "review-finding-test",
      savedAt: "2026-07-16T12:05:00.000Z",
    }),
  );
  draft.deliveryVersioning.rollbackPlan = "";

  const rollout = definitionReviewObligations(draft).find(
    (obligation) => obligation.id === "rollout",
  );

  assert.equal(rollout?.status, "needed");
  assert.equal(rollout?.finding?.section, "delivery-versioning");
  assert.equal(rollout?.finding?.field, "rollbackPlan");
});

test("implementation request receipt is idempotent and leaves fixture truth immutable", () => {
  const sourceBefore = structuredClone(orchestrationDefinitionRecords);
  const draft = completeDurableDraft(
    createOrchestrationDefinitionDesignDraft({
      draftId: "implementation-request-test",
      savedAt: "2026-07-16T12:06:00.000Z",
    }),
  );

  const first = recordOrchestrationImplementationRequest({
    draft,
    recordedAt: "2026-07-16T12:07:00.000Z",
  });
  const repeated = recordOrchestrationImplementationRequest({
    draft,
    recordedAt: "2026-07-16T12:08:00.000Z",
  });

  assert.equal(first.receiptId, repeated.receiptId);
  assert.equal(first.routeTarget, "workspace-proposals");
  assert.equal(first.targetRef, "proposal://orchestration-implementation");
  assert.deepEqual(orchestrationDefinitionRecords, sourceBefore);
});

function completeQualification(draft, classification) {
  return {
    ...draft,
    qualification: {
      ...draft.qualification,
      classification,
      completionCondition:
        "Canonical read-back and a durable receipt verify completion.",
      executionOwner: "Operator Orchestration Service",
      executionProblem:
        "Coordinate recoverable execution across non-atomic owners.",
      rationale: "The accepted execution boundary requires durable recovery.",
      reevaluationCondition:
        classification === "conditional"
          ? "Target acknowledgement becomes asynchronous."
          : "",
      sourceDomain: "repository",
      sourceRecordType: "repository onboarding request",
      synchronousAlternative:
        "One bounded request cannot survive waits and partial effects.",
      title: "Repository Onboarding Fulfillment",
      trigger: "An admitted onboarding request is approved.",
    },
  };
}

function completeDurableDraft(inputDraft) {
  const draft = completeQualification(inputDraft, "durable-candidate");

  return {
    ...draft,
    deliveryVersioning: {
      cancellationTests: "Verify cancellation before and after effects.",
      compatibilityPlan: "Keep the prior version active during admission.",
      failureInjectionTests: "Inject transient and terminal failures.",
      idempotencyTests: "Repeat every activity and request key.",
      retirementPlan: "Retain immutable history and reject new requests.",
      rollbackPlan: "Return new requests to the prior admitted version.",
      rolloutPlan: "Run scoped stage rehearsal before catalog activation.",
      signalTests: "Verify accepted and rejected signals.",
      suspensionPlan: "Stop new requests while retaining active runs.",
      timeoutTests: "Verify activity and run deadline behavior.",
      workflowReplayTests: "Replay every branch from retained history.",
    },
    evidenceSecurity: {
      approvalAttribution: "Bind operator approval to the immutable request.",
      causationStrategy: "Carry the source decision receipt reference.",
      correlationStrategy: "Use one stable request and run correlation id.",
      credentialReferences: ["vault-ref://repository-automation"],
      eventRequirements: ["activity outcome", "final verification"],
      evidenceReferences: ["request digest", "final receipt"],
      redactionPolicy: "Retain references only; redact credential values.",
      retentionPolicy: "Retain request, event, and receipt references.",
      securityReviewTriggers: ["new privileged repository mutation path"],
      sensitiveDataClassification: "internal references only",
    },
    executionPlan: {
      nodes: [
        {
          adapter: "repository-adapter",
          branchCondition: "",
          dependencies: [],
          id: "create-repository",
          idempotency: "Read before write and reuse the canonical repository.",
          label: "Create Repository",
          optional: false,
          owner: "Repository Operation",
          parallelGroup: "",
          skipReason: "",
          timeout: "5m",
          type: "activity",
        },
      ],
      resultSummary:
        "Repository, registration, contracts, and verification agree.",
    },
    failureControls: {
      cancellationBoundary:
        "Stop future nodes after the current effect is observed.",
      compensationStrategy:
        "Use forward reconciliation; do not delete verified repositories.",
      operatorRemediation:
        "Correct the owning contract or dependency before bounded resume.",
      retryExhaustion: "Block with retained effect evidence.",
      retryPolicy: "Retry transient failures only.",
      signalAvailability: ["resume after dependency recovery"],
      supportedDispositions: ["remove", "defer", "workaround"],
      terminalFailureCondition:
        "Authority, validation, contract, or ambiguous-effect failure.",
    },
    identityOwnership: {
      businessOwner: "Workspace Governance",
      definitionFamilyId: "repository.onboarding",
      definitionId: "repository.onboarding.fulfillment",
      executionNodeOwners: ["Repository Operation"],
      executionOwner: "Operator Orchestration Service",
      implementationRepo: "operator-orchestration-service",
      purpose:
        "Fulfill one admitted repository request through recoverable execution.",
      sourceDomain: "repository",
      sourceRecordType: "repository onboarding request",
      title: "Repository Onboarding Fulfillment",
      version: "1",
    },
    requestRoute: {
      operatorApproved: true,
      target: "workspace-proposals",
      targetRef: "proposal://orchestration-implementation",
    },
    triggerResult: {
      approvalRequirements: ["authenticated operator approval"],
      completionCondition:
        "Canonical repository and workspace registration are verified.",
      expectedReceipt: "repository.onboarding.fulfillment.v1",
      idempotencyStrategy:
        "Derive the request key from source ref, version, and approval.",
      immutableInputRefs: ["repository-request://approved-packet"],
      returnProjection: "repository.onboarding-run.v1",
      sourceLockStrategy: "Lock the admitted request version.",
      targetLockStrategy: "Lock the repository identity during execution.",
      trigger: "An admitted onboarding request is approved.",
    },
  };
}
