import assert from "node:assert/strict";
import test from "node:test";

import { prototypeWorkspaceReadModel } from "../../src/domain-workspaces/prototype/read-model/prototype-workspace-read-model.ts";
import { getPrototypeWorkspaceStats } from "../../src/domain-workspaces/prototype/read-model/selectors/prototype-workspace-selectors.ts";
import {
  prototypeSummaryMetrics,
  prototypeWorkspaceStatus,
} from "../../src/domain-workspaces/prototype/presentation/surface/prototype-control-view-model.ts";

test("Prototype summary keeps lifecycle and record posture separate", () => {
  const stats = getPrototypeWorkspaceStats(prototypeWorkspaceReadModel.records);
  const summary = prototypeSummaryMetrics(stats);
  const workspaceStatus = prototypeWorkspaceStatus(
    prototypeWorkspaceReadModel,
    stats,
  );

  assert.deepEqual(
    summary.map((metric) => metric.label),
    ["Total", "Exploring", "Candidate", "Baseline", "Retired"],
  );
  assert.equal(summary.find((metric) => metric.label === "Baseline")?.value, 2);
  assert.equal(workspaceStatus.statusLabel, "attention");
  assert.deepEqual(
    workspaceStatus.items[0].facts.map((fact) => fact.label),
    ["Records", "Blocked", "Movement Ready", "Returned"],
  );
  assert.equal(workspaceStatus.items[0].facts[1].value, "0");
  assert.equal(workspaceStatus.items[0].facts[3].value, "1");
});
