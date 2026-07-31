import assert from "node:assert/strict";
import test from "node:test";

import { orchestrationWorkspaceReadModel } from "../../src/domain-workspaces/orchestration/read-model/workspace/orchestration-workspace-read-model.ts";
import {
  defaultOrchestrationHomeAttentionFilters,
  filterOrchestrationHomeAttention,
  getOrchestrationHomeViewModel,
} from "../../src/domain-workspaces/orchestration/presentation/surfaces/home/orchestration-home-view-model.ts";

test("Home derives all four panels from the shared workspace read model", () => {
  const viewModel = getOrchestrationHomeViewModel(
    orchestrationWorkspaceReadModel,
  );

  assert.strictEqual(
    viewModel.workspaceStatus,
    orchestrationWorkspaceReadModel.workspaceStatus,
  );
  assert.equal(
    viewModel.attention.length,
    orchestrationWorkspaceReadModel.attention.length,
  );
  assert.equal(
    viewModel.inFlightRuns.length,
    orchestrationWorkspaceReadModel.inFlightRuns.length,
  );
  assert.equal(
    viewModel.materialEvents.length,
    orchestrationWorkspaceReadModel.materialEvents.length,
  );
});

test("Attention and In-flight never duplicate the same run", () => {
  const viewModel = getOrchestrationHomeViewModel(
    orchestrationWorkspaceReadModel,
  );
  const attentionRunIds = new Set(
    orchestrationWorkspaceReadModel.attention
      .filter((item) => item.kind === "run")
      .map((item) => item.id.replace(/^run:/, "")),
  );

  assert.ok(
    viewModel.inFlightRuns.every((run) => !attentionRunIds.has(run.id)),
  );
});

test("Attention supports combined scope, condition, owner, and search filters", () => {
  const viewModel = getOrchestrationHomeViewModel(
    orchestrationWorkspaceReadModel,
  );
  const target = viewModel.attention.find(
    (row) => row.condition === "failed",
  );
  assert.ok(target);

  const filtered = filterOrchestrationHomeAttention(viewModel.attention, {
    ...defaultOrchestrationHomeAttentionFilters,
    condition: target.condition,
    owner: target.owner,
    query: "retry",
    scope: target.scope,
  });

  assert.deepEqual(filtered.map((row) => row.id), [target.id]);
});

test("Material events remain structured, sorted, and free of raw log content", () => {
  const viewModel = getOrchestrationHomeViewModel(
    orchestrationWorkspaceReadModel,
  );

  assert.deepEqual(
    viewModel.materialEvents.map((event) => event.id),
    orchestrationWorkspaceReadModel.materialEvents.map(
      (event) => event.eventId,
    ),
  );
  assert.ok(
    viewModel.materialEvents.every(
      (event) =>
        event.detail.length > 0 &&
        event.title.includes("scenario-run-") &&
        !event.detail.includes("scenario-log://"),
    ),
  );
});
