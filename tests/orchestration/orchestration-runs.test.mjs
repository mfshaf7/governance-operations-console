import assert from "node:assert/strict";
import test from "node:test";

import {
  defaultOrchestrationRunFilters,
  filterOrchestrationRuns,
  orchestrationRunAvailableControls,
} from "../../src/domain-workspaces/orchestration/read-model/runs/orchestration-run-selectors.ts";
import { orchestrationRunRecords } from "../../src/domain-workspaces/orchestration/read-model/runs/orchestration-runs.fixture.ts";
import {
  orchestrationRunCurrentNode,
  orchestrationRunDefinitionOptions,
  orchestrationRunNodeDetail,
  orchestrationRunSelectedFacts,
  orchestrationRunSourceDomainOptions,
  orchestrationRunStateOptions,
} from "../../src/domain-workspaces/orchestration/presentation/surfaces/runs/orchestration-runs-view-model.ts";
import {
  orchestrationRunConditionProjection,
  orchestrationRunEvidenceInspectorRows,
  orchestrationRunLocalOverlayFacts,
} from "../../src/domain-workspaces/orchestration/presentation/surfaces/runs/dashboard/run-dashboard-view-model.ts";

test("Runs register combines search, state, definition, and source filters", () => {
  const target = orchestrationRunRecords.find(
    (record) => record.state === "cancelled",
  );
  assert.ok(target);

  const filtered = filterOrchestrationRuns(orchestrationRunRecords, {
    ...defaultOrchestrationRunFilters,
    definitionId: target.definitionId,
    query: target.runId,
    sourceDomain: target.sourceDomain,
    state: "cancelled",
  });

  assert.deepEqual(filtered.map((record) => record.id), [target.id]);
});

test("cancelled runs remain filterable without becoming a permanent summary bucket", () => {
  assert.deepEqual(
    filterOrchestrationRuns(orchestrationRunRecords, {
      ...defaultOrchestrationRunFilters,
      state: "cancelled",
    }).map((record) => record.state),
    ["cancelled"],
  );
  assert.deepEqual(
    orchestrationRunStateOptions.map((option) => option.value),
    [
      "all",
      "queued",
      "running",
      "waiting",
      "blocked",
      "failed",
      "completed",
      "cancelled",
    ],
  );
});

test("definition and source filters derive unique options from run truth", () => {
  assert.deepEqual(orchestrationRunDefinitionOptions(orchestrationRunRecords), [
    { label: "All definitions", value: "all" },
    {
      label: "scenario.prototype.landing.run",
      value: "scenario.prototype.landing.run",
    },
  ]);
  assert.deepEqual(
    orchestrationRunSourceDomainOptions(orchestrationRunRecords),
    [
      { label: "All sources", value: "all" },
      { label: "prototype", value: "prototype" },
    ],
  );
});

test("selected run facts preserve source, definition, progress, business, effect, and run state", () => {
  const running = orchestrationRunRecords.find(
    (record) => record.state === "running",
  );
  assert.ok(running);

  assert.deepEqual(
    orchestrationRunSelectedFacts(running).map((fact) => fact.label),
    [
      "Request / Run",
      "Source",
      "Definition",
      "Current Node",
      "Node Owner",
      "Business State",
      "Effect Posture",
      "Run State",
    ],
  );
  assert.equal(orchestrationRunCurrentNode(running)?.id, "scaffold");
});

test("source-domain business state remains distinct and truthful across run scenarios", () => {
  assert.deepEqual(
    orchestrationRunRecords.map((record) => [
      record.state,
      record.businessState.label,
    ]),
    [
      ["queued", "Landing requested"],
      ["running", "Landing in progress"],
      ["waiting", "Landing in progress"],
      ["blocked", "Landing blocked"],
      ["failed", "Landing failed"],
      ["completed", "Landing complete"],
      ["cancelled", "Landing cancelled"],
    ],
  );
});

test("Run Dashboard projects a distinct current condition for every lifecycle state", () => {
  const projections = Object.fromEntries(
    orchestrationRunRecords.map((record) => [
      record.state,
      orchestrationRunConditionProjection(record),
    ]),
  );

  assert.equal(projections.queued.title, "Awaiting scheduling");
  assert.equal(projections.running.title, "Prepare project scaffold");
  assert.equal(projections.waiting.title, "Structured wait");
  assert.equal(projections.blocked.title, "Remediation required");
  assert.equal(projections.failed.title, "Execution failed");
  assert.equal(projections.completed.title, "Verified result");
  assert.equal(projections.cancelled.title, "Run cancelled");
  assert.ok(
    Object.values(projections).every(
      (projection) =>
        projection.facts.at(-1)?.label === "Effect Posture",
    ),
  );
});

test("only source-projected available controls appear for each run state", () => {
  const controlsByState = Object.fromEntries(
    orchestrationRunRecords.map((record) => [
      record.state,
      orchestrationRunAvailableControls(record).map((control) => control.id),
    ]),
  );

  assert.deepEqual(controlsByState.queued, ["cancel"]);
  assert.deepEqual(controlsByState.running, ["defer", "cancel"]);
  assert.deepEqual(controlsByState.waiting, ["provide-signal", "cancel"]);
  assert.deepEqual(controlsByState.blocked, ["cancel"]);
  assert.deepEqual(controlsByState.failed, ["retry"]);
  assert.deepEqual(controlsByState.completed, []);
  assert.deepEqual(controlsByState.cancelled, []);
});

test("evidence inspectors keep artifacts, logs, receipts, source, and runtime distinct", () => {
  const completed = orchestrationRunRecords.find(
    (record) => record.state === "completed",
  );
  assert.ok(completed);

  assert.deepEqual(
    orchestrationRunEvidenceInspectorRows(completed, []).map(
      (inspector) => inspector.id,
    ),
    [
      "artifacts",
      "logs",
      "receipts",
      "source-projection",
      "runtime-diagnostics",
    ],
  );
});

test("node and local control projections stay derived without mutating fixture truth", () => {
  const before = structuredClone(orchestrationRunRecords);
  const failed = orchestrationRunRecords.find(
    (record) => record.state === "failed",
  );
  assert.ok(failed);
  assert.ok(failed.nodes[0]);

  assert.match(orchestrationRunNodeDetail(failed.nodes[0]), /Attempt 1/);
  assert.deepEqual(
    orchestrationRunLocalOverlayFacts(failed, {
      effectPosture: failed.effectPosture,
      lastReceiptId: "local-receipt-test",
      runId: failed.runId,
      state: "queued",
      updatedAt: "2026-07-16T12:00:00.000Z",
    }).map((fact) => fact.label),
    ["Source State", "Local Projection", "Receipt", "Recorded"],
  );
  assert.deepEqual(orchestrationRunRecords, before);
});
