import test from "node:test";
import assert from "node:assert/strict";
import { refinementWorkbenchProjection } from "../support/refinement-workbench-fixture.mjs";
import { refinementPacketFromProjection } from "../../src/domain-workspaces/delivery/live-runtime/refinement-live-contract.ts";
import { refinementMetadataTargets } from "../../src/domain-workspaces/delivery/presentation/workflows/refinement/view-model/refinement-metadata-model.ts";
import { refinementAdvisorTargetContext } from "../../src/domain-workspaces/delivery/presentation/workflows/refinement/view-model/refinement-advisor-context.ts";
import { advisorWorkContext } from "../../src/agent-console/model/advisor-drafts.ts";

function targets() {
  const projection = refinementWorkbenchProjection();
  const field = projection.packet.draft_groups.at(-1).fields.find(f => f.backend_field === "owner_repo");
  const options = Array.from({ length: 20 }, (_, i) => `registered-source-owner-with-reviewed-identity-${i}`);
  Object.assign(field, { field_kind: "select", allowed_values: options, value: "aggregate-value", status: "missing",
    target_allowed_values: Object.fromEntries(field.target_node_ids.map(id => [id, options])),
    target_values: Object.fromEntries(field.target_node_ids.map((id, i) => [id, options[i % options.length]])),
    target_statuses: Object.fromEntries(field.target_node_ids.map(id => [id, "complete"])) });
  return refinementMetadataTargets(refinementPacketFromProjection(projection)).filter(t => t.field.backend_field === "owner_repo");
}
const coverage = { provided: ["Selected field facts"], unavailable: ["Unrelated items are outside the request"] };

test("one-record advisor context stays within its existing bound despite 35 packet-wide choice maps", () => {
  const all = targets(); assert.equal(all.length, 35);
  const selected = [all.find(t => t.node.id === "1100")];
  const raw = selected.map(t => ({ key: t.key, sourceValue: t.sourceValue, field: t.field }));
  assert.throws(() => advisorWorkContext({ targets: raw }, coverage), /too large/);
  const projected = refinementAdvisorTargetContext(selected);
  const context = advisorWorkContext({ targets: projected }, coverage);
  assert.ok(context.length < 4000);
  assert.deepEqual(projected[0].field.allowed_values, selected[0].field.allowed_values);
  assert.equal(projected[0].field.value, selected[0].sourceValue);
  assert.equal(projected[0].field.status, selected[0].status);
  assert.equal(projected[0].nodeId, "1100");
  assert.doesNotMatch(context, /target_node_ids|target_values|target_statuses|target_allowed_values/);
  const changedSibling = structuredClone(selected);
  changedSibling[0].field.target_values["1106"] = "unselected-value-is-not-request-context";
  assert.deepEqual(refinementAdvisorTargetContext(changedSibling), projected);
});

test("shared advisor scope preserves each selected record's permissions without unrelated records", () => {
  const all = targets();
  const selected = [all.find(t => t.node.id === "1100"), all.find(t => t.node.id === "1101")];
  selected[1].field.allowed_values = selected[1].field.allowed_values.slice(1, 3);
  const projected = refinementAdvisorTargetContext(selected);
  assert.deepEqual(projected.map(t => t.nodeId), ["1100", "1101"]);
  assert.deepEqual(projected.map(t => t.sourceValue), selected.map(t => t.sourceValue));
  assert.deepEqual(projected[1].field.allowed_values, selected[1].field.allowed_values);
  assert.ok(advisorWorkContext({ targets: projected }, coverage).length < 6000);
  assert.ok(selected[0].field.target_allowed_values["1106"], "Original owner packet stays intact");
});

test("selected numeric and field validation facts still bind the advisor scope", () => {
  const target = targets()[0];
  Object.assign(target.field, { field_kind: "number", numeric_type: "integer", min_value: 0,
    value_limit: 42, validation_hint: "Only whole values from the current native form" });
  const original = refinementAdvisorTargetContext([target]);
  assert.equal(original[0].field.numeric_type, "integer");
  assert.equal(original[0].field.min_value, 0);
  assert.equal(original[0].field.value_limit, 42);
  assert.equal(original[0].field.validation_hint, target.field.validation_hint);
  target.field.numeric_type = "decimal";
  assert.notDeepEqual(refinementAdvisorTargetContext([target]), original);
});
