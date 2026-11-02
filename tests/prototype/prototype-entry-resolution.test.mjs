import assert from "node:assert/strict";
import test from "node:test";
import { prototypeWorkspaceReadModel } from "../../src/domain-workspaces/prototype/read-model/prototype-workspace-read-model.ts";
import { resolvePrototypeEntryRecord } from "../../src/domain-workspaces/prototype/read-model/selectors/prototype-workspace-selectors.ts";

const record = { ...prototypeWorkspaceReadModel.records[0], id: "prototype-scenario-retained", sourceRef: "record://prototypes/scenario-retained", linkedRecords: [] };
for (const ref of [record.id, record.sourceRef, "record://prototype-captures/scenario-retained"]) {
  test(`owner record resolves from its exact retained identity: ${ref}`, () => {
    assert.equal(resolvePrototypeEntryRecord([record], ref).record, record);
  });
}
test("unknown refs and lookalike namespaces never pick the first record", () => {
  for (const ref of ["record://prototype-captures/missing", "record://foreign/scenario-retained", "record://prototype-captures/../scenario-retained", "Retained prototype sample"]) {
    assert.deepEqual(resolvePrototypeEntryRecord([record], ref), { kind: "missing" });
  }
});
test("conflicting aliases cannot select an arbitrary record", () => {
  const other = { ...record, id: "prototype-other", sourceRef: "record://prototype-captures/scenario-retained" };
  assert.deepEqual(resolvePrototypeEntryRecord([record, other], other.sourceRef), { kind: "conflict" });
});
