import assert from "node:assert/strict";
import test from "node:test";

import { orchestrationDefinitionRecords } from "../../src/domain-workspaces/orchestration/read-model/definitions/orchestration-definitions.fixture.ts";
import {
  orchestrationDefinitionSummary,
} from "../../src/domain-workspaces/orchestration/read-model/definitions/orchestration-definition-selectors.ts";
import { orchestrationRunRecords } from "../../src/domain-workspaces/orchestration/read-model/runs/orchestration-runs.fixture.ts";
import {
  orchestrationAttentionRuns,
  orchestrationInFlightRuns,
  orchestrationRunSummary,
} from "../../src/domain-workspaces/orchestration/read-model/runs/orchestration-run-selectors.ts";
import { orchestrationWorkspaceReadModel } from "../../src/domain-workspaces/orchestration/read-model/workspace/orchestration-workspace-read-model.ts";
import {
  orchestrationWorkspaceNavMeta,
  orchestrationWorkspaceSummaryMetrics,
  orchestrationWorkspaceSummaryTitle,
  orchestrationWorkspaceSurfaces,
} from "../../src/domain-workspaces/orchestration/presentation/workspace/orchestration-workspace-view-model.ts";
import {
  applyOrchestrationDefinitionAdvisorPatch,
  createOrchestrationDefinitionDesignDraft,
  orchestrationDefinitionDesignIsDirty,
  orchestrationDefinitionDesignReadiness,
  orchestrationDefinitionDesignStages,
} from "../../src/domain-workspaces/orchestration/work-model/definition-design/definition-design-model.ts";
import { normalizeOrchestrationDefinitionDraft } from "../../src/domain-workspaces/orchestration/local-runtime/definition-design/definition-draft-store.ts";
import { recordOrchestrationQualification } from "../../src/domain-workspaces/orchestration/local-runtime/definition-design/definition-receipt-store.ts";
import {
  OrchestrationRunControlUnavailableError,
} from "../../src/domain-workspaces/orchestration/work-model/run-control/run-control-model.ts";
import { simulateOrchestrationRunControl } from "../../src/domain-workspaces/orchestration/local-runtime/run-control/run-control-simulator.ts";
import { getOrchestrationWorkspaceProjectionSnapshot } from "../../src/domain-workspaces/orchestration/local-runtime/orchestration-workspace-runtime.ts";

test("definition fixtures cover every required lifecycle without claiming live admission", () => {
  assert.equal(orchestrationDefinitionRecords.length, 8);
  assert.deepEqual(
    new Set(orchestrationDefinitionRecords.map((record) => record.scenarioKind)),
    new Set([
      "active-definition",
      "admission-review",
      "conditional-qualification",
      "definition-ready",
      "durable-qualification",
      "retired-definition",
      "suspended-definition",
      "synchronous-qualification",
    ]),
  );

  const qualificationOnly = orchestrationDefinitionRecords.filter(
    (record) =>
      record.classification === "synchronous" ||
      record.classification === "conditional",
  );
  assert.ok(qualificationOnly.every((record) => record.lifecycle === null));

  const admittedLifecycleScenarios = orchestrationDefinitionRecords.filter(
    (record) =>
      record.lifecycle === "active" ||
      record.lifecycle === "suspended" ||
      record.lifecycle === "retired",
  );
  assert.ok(
    admittedLifecycleScenarios.every(
      (record) =>
        record.source.mode === "synthetic-scenario" &&
        record.admissionChecks.every((check) => check.state === "synthetic"),
    ),
  );

  const definitionReady = orchestrationDefinitionRecords.find(
    (record) => record.definitionId === "delivery.refinement.apply",
  );
  assert.equal(definitionReady?.lifecycle, "definition-ready");
  assert.equal(definitionReady?.source.mode, "contract-derived");
});

test("definition and run summaries preserve stable buckets and exclude cancelled runs", () => {
  assert.deepEqual(orchestrationDefinitionSummary(orchestrationDefinitionRecords), [
    { id: "candidates", label: "Candidates", tone: "info", value: "1" },
    { id: "qualified", label: "Qualified", tone: "info", value: "0" },
    { id: "ready", label: "Ready", tone: "ok", value: "1" },
    { id: "in-review", label: "In Review", tone: "warn", value: "1" },
    { id: "active", label: "Active", tone: "ok", value: "1" },
  ]);
  assert.deepEqual(orchestrationRunSummary(orchestrationRunRecords), [
    { id: "active", label: "Active", tone: "info", value: "2" },
    { id: "waiting", label: "Waiting", tone: "warn", value: "1" },
    { id: "blocked", label: "Blocked", tone: "danger", value: "1" },
    { id: "failed", label: "Failed", tone: "danger", value: "1" },
    { id: "completed", label: "Completed", tone: "ok", value: "1" },
  ]);
});

test("run fixtures cover every required scenario and remain synthetic", () => {
  assert.equal(orchestrationRunRecords.length, 7);
  assert.ok(
    orchestrationRunRecords.every(
      (run) =>
        run.source.mode === "synthetic-scenario" &&
        run.runtimeDiagnostics.liveRuntimeClaimed === false,
    ),
  );
  assert.deepEqual(
    orchestrationAttentionRuns(
      orchestrationRunRecords,
      "2026-07-16T10:00:00.000Z",
    ).map((run) => run.state),
    ["blocked", "failed"],
  );
  assert.deepEqual(
    orchestrationInFlightRuns(
      orchestrationRunRecords,
      "2026-07-16T10:00:00.000Z",
    ).map((run) => run.state),
    ["queued", "running", "waiting"],
  );
});

test("overdue structured waits move from In-flight to Attention without duplication", () => {
  const waitingRun = orchestrationRunRecords.find(
    (run) => run.state === "waiting",
  );
  assert.ok(waitingRun?.wait);
  const overdueRun = {
    ...waitingRun,
    wait: {
      ...waitingRun.wait,
      deadline: "2026-07-15T10:00:00.000Z",
      requiresOperatorAction: false,
    },
  };
  const now = "2026-07-16T10:00:00.000Z";

  assert.deepEqual(
    orchestrationAttentionRuns([overdueRun], now).map((run) => run.id),
    [overdueRun.id],
  );
  assert.deepEqual(orchestrationInFlightRuns([overdueRun], now), []);
});

test("workspace read model derives scenario coverage and truthful status from one source", () => {
  assert.equal(orchestrationWorkspaceReadModel.scenarioCoverage.length, 15);
  assert.equal(
    orchestrationWorkspaceReadModel.workspaceStatus.items.find(
      (item) => item.id === "execution",
    )?.state,
    "blocked",
  );
  assert.equal(
    orchestrationWorkspaceReadModel.summary.home.find(
      (metric) => metric.label === "Definition Work",
    )?.value,
    "3",
  );
});

test("workspace shell exposes the locked peer surfaces and read-model summaries", () => {
  assert.deepEqual(
    orchestrationWorkspaceSurfaces.map(({ id, kicker, title }) => ({
      id,
      kicker,
      title,
    })),
    [
      { id: "home", kicker: "01", title: "Home" },
      { id: "definitions", kicker: "02", title: "Definitions" },
      { id: "runs", kicker: "03", title: "Runs" },
    ],
  );
  assert.equal(
    orchestrationWorkspaceSummaryTitle("home"),
    "Orchestration State",
  );
  assert.equal(
    orchestrationWorkspaceSummaryTitle("definitions"),
    "Definition State",
  );
  assert.equal(orchestrationWorkspaceSummaryTitle("runs"), "Run State");
  assert.strictEqual(
    orchestrationWorkspaceSummaryMetrics(
      orchestrationWorkspaceReadModel,
      "home",
    ),
    orchestrationWorkspaceReadModel.summary.home,
  );
  assert.strictEqual(
    orchestrationWorkspaceSummaryMetrics(
      orchestrationWorkspaceReadModel,
      "definitions",
    ),
    orchestrationWorkspaceReadModel.summary.definitions,
  );
  assert.strictEqual(
    orchestrationWorkspaceSummaryMetrics(
      orchestrationWorkspaceReadModel,
      "runs",
    ),
    orchestrationWorkspaceReadModel.summary.runs,
  );
  assert.equal(
    orchestrationWorkspaceNavMeta(
      orchestrationWorkspaceReadModel,
      "definitions",
    ),
    String(orchestrationWorkspaceReadModel.definitions.length),
  );
  assert.equal(
    orchestrationWorkspaceNavMeta(orchestrationWorkspaceReadModel, "runs"),
    String(orchestrationWorkspaceReadModel.runs.length),
  );
});

test("definition design selects the correct two-stage or three-stage path", () => {
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
});

test("definition advisor patches require an explicit apply and drafts normalize structurally", () => {
  const draft = createOrchestrationDefinitionDesignDraft({
    draftId: "advisor-patch-test",
    savedAt: "2026-07-16T10:00:00.000Z",
  });
  const result = applyOrchestrationDefinitionAdvisorPatch(
    draft,
    {
      field: "executionProblem",
      patchId: "patch-1",
      rationale: "Clarify the accepted execution boundary.",
      section: "qualification",
      source: "synthetic-advisor",
      value: "Coordinate recoverable work across non-atomic boundaries.",
    },
    "2026-07-16T10:01:00.000Z",
  );

  assert.equal(draft.qualification.executionProblem, "");
  assert.equal(
    result.draft.qualification.executionProblem,
    "Coordinate recoverable work across non-atomic boundaries.",
  );
  assert.equal(result.resolution.result, "applied");
  assert.deepEqual(normalizeOrchestrationDefinitionDraft(result.draft), result.draft);
  assert.equal(normalizeOrchestrationDefinitionDraft({ schemaVersion: 1 }), null);
});

test("definition dirty state ignores navigation and save timestamps", () => {
  const baseline = createOrchestrationDefinitionDesignDraft({
    draftId: "dirty-state-test",
    savedAt: "2026-07-16T10:00:00.000Z",
  });
  const navigated = {
    ...baseline,
    activeSection: "trigger-result",
    activeStage: "define",
    savedAt: "2026-07-16T10:05:00.000Z",
  };
  const edited = {
    ...navigated,
    qualification: {
      ...navigated.qualification,
      title: "Edited title",
    },
  };

  assert.equal(orchestrationDefinitionDesignIsDirty(baseline, navigated), false);
  assert.equal(orchestrationDefinitionDesignIsDirty(baseline, edited), true);
});

test("synchronous qualification receipts are idempotent", () => {
  const draft = completeSynchronousQualification(
    createOrchestrationDefinitionDesignDraft({
      draftId: "qualification-receipt-test",
      savedAt: "2026-07-16T10:10:00.000Z",
    }),
  );
  assert.equal(
    orchestrationDefinitionDesignReadiness(draft).canRecordQualification,
    true,
  );

  const first = recordOrchestrationQualification({
    draft,
    recordedAt: "2026-07-16T10:11:00.000Z",
  });
  const repeated = recordOrchestrationQualification({
    draft,
    recordedAt: "2026-07-16T10:12:00.000Z",
  });

  assert.equal(first.receiptId, repeated.receiptId);
  assert.equal(first.classification, "synchronous");
});

test("run-control simulation is idempotent and does not mutate source truth", () => {
  const failedRun = orchestrationRunRecords.find(
    (run) => run.state === "failed",
  );
  assert.ok(failedRun);

  const input = {
    controlId: "retry",
    reason: "Retry the synthetic preview adapter after review.",
  };
  const first = simulateOrchestrationRunControl({
    input,
    requestedAt: "2026-07-16T10:20:00.000Z",
    run: failedRun,
  });
  const repeated = simulateOrchestrationRunControl({
    input,
    requestedAt: "2026-07-16T10:21:00.000Z",
    run: failedRun,
  });

  assert.equal(first.receipt.receiptId, repeated.receipt.receiptId);
  assert.equal(first.overlay.state, "queued");
  assert.equal(failedRun.state, "failed");
  const effectiveWorkspace = getOrchestrationWorkspaceProjectionSnapshot();
  const effectiveRun = effectiveWorkspace.runs.find(
    (run) => run.runId === failedRun.runId,
  );
  assert.equal(effectiveRun?.state, "queued");
  assert.equal(
    effectiveWorkspace.attention.some(
      (item) => item.id === `run:${failedRun.id}`,
    ),
    false,
  );
  assert.equal(
    effectiveWorkspace.inFlightRuns.some(
      (run) => run.runId === failedRun.runId,
    ),
    true,
  );
  assert.equal(
    effectiveWorkspace.materialEvents.some(
      (event) => event.eventId === `local-control:${first.receipt.receiptId}`,
    ),
    true,
  );

  const blockedRun = orchestrationRunRecords.find(
    (run) => run.state === "blocked",
  );
  assert.ok(blockedRun);
  assert.throws(
    () =>
      simulateOrchestrationRunControl({
        input,
        requestedAt: "2026-07-16T10:22:00.000Z",
        run: blockedRun,
      }),
    OrchestrationRunControlUnavailableError,
  );
});

function completeSynchronousQualification(draft) {
  return {
    ...draft,
    qualification: {
      ...draft.qualification,
      classification: "synchronous",
      completionCondition: "One canonical record is returned.",
      executionOwner: "Operator Orchestration Service",
      executionProblem: "Create one bounded canonical record.",
      rationale:
        "The command has one authoritative write and no durable execution need.",
      sourceDomain: "proposal",
      sourceRecordType: "proposal capture request",
      synchronousAlternative: "Use one bounded OOS command.",
      title: "Proposal Capture",
      trigger: "Operator submits a valid request.",
    },
  };
}
