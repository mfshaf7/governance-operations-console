import test from "node:test";
import assert from "node:assert/strict";
import { createOrchestrationDefinitionDesignDraft } from "../../src/domain-workspaces/orchestration/work-model/definition-design/definition-design-model.ts";
import { createDefinitionExecutionNode } from "../../src/domain-workspaces/orchestration/work-model/definition-design/definition-execution-node.ts";
import { definitionDraftAdvisorFields, applyDefinitionDraftAdvisorEdits } from "../../src/domain-workspaces/orchestration/presentation/workflows/definition-design/support/definition-draft-advisor-fields.ts";

import { definitionAdvisorWorkContext } from "../../src/domain-workspaces/orchestration/presentation/workflows/definition-design/support/definition-advisor-context.ts";
import { orchestrationDefinitionRecords } from "../../src/domain-workspaces/orchestration/read-model/definitions/orchestration-definitions.fixture.ts";

function draft() {
  const value = createOrchestrationDefinitionDesignDraft({ draftId: "test-definition", savedAt: "2026-11-18T00:00:00Z" });
  value.activeStage = "define"; value.activeSection = "execution-plan"; return value;
}
const edit = nodes => [{ field: "executionPlan.nodesJson", value: JSON.stringify(nodes) }];

test("first-step assistance exposes actual object data and applies the same defaults as manual creation", () => {
  const before = draft(), fields = definitionDraftAdvisorFields(before, "");
  assert.equal(fields.some(field => field.key === "executionPlan.nodes"), false);
  assert.equal(fields.find(field => field.key === "executionPlan.nodesJson").value, "[]");
  const next = applyDefinitionDraftAdvisorEdits(before, "", edit([{ label: "Check service availability" }]));
  assert.deepEqual(next.executionPlan.nodes, [{ ...createDefinitionExecutionNode("node-1"), label: "Check service availability" }]);
  assert.equal(next.requestRoute.operatorApproved, false); assert.deepEqual(before.executionPlan.nodes, []);
});

test("partial step updates retain other fields; duplicate, foreign, cyclic and malformed data fail before mutation", () => {
  const before = draft(); before.executionPlan.nodes = [{ ...createDefinitionExecutionNode("node-1"), label: "Keep", adapter: "observed-adapter" }];
  const next = applyDefinitionDraftAdvisorEdits(before, "node-1", edit([{ id: "node-1", label: "Clearer label" }, { label: "Follow-up", dependencies: ["node-1"] }]));
  assert.equal(next.executionPlan.nodes[0].adapter, "observed-adapter"); assert.equal(next.executionPlan.nodes[1].id, "node-2");
  for (const nodes of [["Proposed first step"], [{ id: "a" }, { id: "a" }], [{ id: "a", dependencies: ["missing"] }],
    [{ id: "a", dependencies: ["b"] }, { id: "b", dependencies: ["a"] }], [{ optional: "true" }], [{ type: "invented" }], [{ approve: true }]]) {
    assert.throws(() => applyDefinitionDraftAdvisorEdits(before, "node-1", edit(nodes)));
    assert.equal(before.executionPlan.nodes[0].label, "Keep");
  }
  assert.throws(() => applyDefinitionDraftAdvisorEdits(before, "", [{ field: "executionPlan.nodes", value: "Proposed first step" }]));
});

test("materialized field snapshots restore a step draft without changing final qualification decisions", () => {
  const before = draft(), original = definitionDraftAdvisorFields(before, "").find(field => field.key === "executionPlan.nodesJson");
  const next = applyDefinitionDraftAdvisorEdits(before, "", edit([{ label: "A reviewable step" }]));
  const restored = applyDefinitionDraftAdvisorEdits(next, "", [{ field: original.key, value: original.value }]);
  assert.deepEqual(restored, before);
});


test("the definition catalog is explicitly indexed with a relevant full example inside the admitted scope", () => {
  const context = JSON.parse(definitionAdvisorWorkContext(draft(), "", orchestrationDefinitionRecords));
  assert.equal(context.observations.definitionIndex.length, orchestrationDefinitionRecords.length);
  assert.deepEqual(context.observations.exampleCoverage.includedIds, context.observations.definitionExamples.map(record => record.id));
  assert.ok(JSON.stringify(context).length < 16_000);
  const baseline = orchestrationDefinitionRecords.at(-1);
  const selected = JSON.parse(definitionAdvisorWorkContext({ ...draft(), baselineRecordId: baseline.id }, "", orchestrationDefinitionRecords));
  assert.equal(selected.observations.definitionExamples[0].id, baseline.id);
  assert.equal(context.observations.stepDrafting.field, "executionPlan.nodesJson");
});
