import assert from "node:assert/strict";
import test from "node:test";
import { prototypeWorkspaceReadModel } from "../../src/domain-workspaces/prototype/read-model/prototype-workspace-read-model.ts";
import { prototypeDashboardStageCards, prototypeDashboardRuntimeFacts } from "../../src/domain-workspaces/prototype/presentation/dashboards/prototype-dashboard/prototype-dashboard-operations-model.ts";

const base = prototypeWorkspaceReadModel.records[0];
test("unread or failed Preview owner data stays unknown while canonical source facts remain inspectable", () => {
  const record = structuredClone(base);
  record.preview.profileState = "no-profile";
  const original = structuredClone(record);
  for (const [mode, expected] of [["loading", "Checking"], ["error", "Unavailable"]]) {
    const card = prototypeDashboardStageCards(record, mode).find(card => card.id === "preview");
    assert.equal(card.label, expected);
    assert.ok(card.facts.every(fact => fact.value === expected));
    const facts = prototypeDashboardRuntimeFacts(record, mode);
    for (const label of ["Runtime", "Adapter", "Endpoint"]) assert.equal(facts.find(fact => fact.label === label).value, expected);
    assert.equal(facts.find(fact => fact.label === "Data").value, "Real read-only");
    assert.equal(facts.find(fact => fact.label === "Mutation boundary").value, "Prototype local");
  }
  assert.deepEqual(record, original);
});

test("post-incubation cards retain historical baseline approval without presenting pending handoff", () => {
  for (const lifecycle of ["graduated", "retired", "graduating"]) {
    const record = { ...structuredClone(base), lifecycle,
      baseline: { ...base.baseline, state: "ready-for-movement" },
      movementRequest: { ...base.movementRequest, state: "not-prepared" } };
    const cards = prototypeDashboardStageCards(record, "disconnected");
    const baseline = cards.find(card => card.id === "baseline");
    assert.equal(baseline.category, "Historical approval");
    assert.equal(baseline.label, "Ready for movement");
    if (lifecycle !== "graduating") assert.equal(baseline.tone, "muted");
    assert.equal(cards.find(card => card.id === "handoff").label, lifecycle[0].toUpperCase() + lifecycle.slice(1));
  }
});
