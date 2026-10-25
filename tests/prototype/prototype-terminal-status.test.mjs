import assert from "node:assert/strict";
import test from "node:test";
import { prototypeWorkspaceReadModel } from "../../src/domain-workspaces/prototype/read-model/prototype-workspace-read-model.ts";
import {
  getPrototypeWorkspaceStats, getSelectedPrototypeRecord,
  prototypeRecordStatusLabel, prototypeRecordTone,
} from "../../src/domain-workspaces/prototype/read-model/selectors/prototype-workspace-selectors.ts";
import { prototypeWorkspaceStatus } from "../../src/domain-workspaces/prototype/presentation/surface/prototype-control-view-model.ts";
import { prototypeDashboardRecord } from "../../src/domain-workspaces/prototype/presentation/shared/prototype-closure-presentation-model.ts";
import { prototypeDashboardAreas, prototypeDashboardCards, prototypeDashboardMovementFacts } from "../../src/domain-workspaces/prototype/presentation/dashboards/prototype-dashboard/prototype-dashboard-view-model.ts";

const base = prototypeWorkspaceReadModel.records[0];
function record(lifecycle, overrides = {}) {
  return { ...structuredClone(base), id: `prototype-${lifecycle}`, lifecycle,
    landing: { ...base.landing, state: "landed" },
    baseline: { ...base.baseline, state: "ready-for-movement" },
    currentMove: { ...base.currentMove, id: "archive", actionLabel: "Open History" },
    movementRequest: { ...base.movementRequest, state: "not-prepared" },
    openIssues: [], ...overrides };
}

test("post-incubation lifecycle outranks retained baseline and historical workflow status", () => {
  for (const [phase, label, tone] of [["graduated", "Graduated", "muted"], ["retired", "Retired", "muted"], ["graduating", "Graduating", "warn"]]) {
    for (const oldState of ["ready-for-movement", "not-started", "blocked"]) {
      const current = record(phase, { baseline: { ...base.baseline, state: oldState },
        movementRequest: { ...base.movementRequest, state: "returned" } });
      assert.equal(prototypeRecordStatusLabel(current), label);
      assert.equal(prototypeRecordTone(current), tone);
    }
  }
});

test("Dashboard and handoff details show current graduation, with baseline evidence kept historical", () => {
  for (const phase of ["graduated", "retired", "graduating"]) {
    const current = record(phase);
    const cards = prototypeDashboardCards(current);
    assert.equal(cards.find(c => c.label === "Movement").value, phase[0].toUpperCase() + phase.slice(1));
    assert.equal(cards.find(c => c.label === "Historical baseline").value, "Ready for movement");
    const movement = prototypeDashboardAreas(current, []).find(a => a.id === "movement");
    assert.equal(movement.title, phase === "graduating" ? "Source Graduation" : "Handoff History");
    assert.notEqual(movement.badge, "Not prepared");
    assert.equal(prototypeDashboardMovementFacts(current)[0].value, phase[0].toUpperCase() + phase.slice(1));
    assert.equal(current.baseline.state, "ready-for-movement");
  }
});

test("retained Closure input cannot roll a current canonical Dashboard back to its earlier lifecycle", () => {
  const current = record("graduated", { sourceEvidence: { authority: "workspace-prototype-studio" } });
  const oldPreparation = { expected_state: { lifecycle: "graduating" } };
  assert.equal(prototypeDashboardRecord(current, oldPreparation), current);
  const reopened = record("exploring", { sourceEvidence: { authority: "workspace-prototype-studio" } });
  assert.equal(prototypeDashboardRecord(reopened, { expected_state: { lifecycle: "retired" } }), reopened);
  assert.equal(prototypeDashboardRecord(record("candidate"), oldPreparation).lifecycle, "graduating");
});

test("only an active approved baseline counts as ready to move; history stays readable", () => {
  const past = record("graduated", { landing: { ...base.landing, state: "blocked" },
    movementRequest: { ...base.movementRequest, state: "returned" },
    openIssues: [{ status: "blocked" }] });
  const model = { ...prototypeWorkspaceReadModel, records: [past, record("retired"), record("graduating"), record("candidate"), record("exploring"), record("baseline-approved")] };
  const stats = getPrototypeWorkspaceStats(model.records);
  assert.equal(stats.total, 6);
  assert.equal(stats.movementReady, 1);
  assert.equal(stats.blocked, 0);
  assert.equal(stats.graduated, 1);
  assert.equal(stats.graduating, 1);
  assert.equal(prototypeWorkspaceStatus(model, stats, true).statusLabel, "owner data current");
  assert.equal(past.baseline.state, "ready-for-movement");
  assert.equal(getSelectedPrototypeRecord(model, null).id, "prototype-graduating");
  assert.equal(getSelectedPrototypeRecord(model, past.id), past);
  const activeBlocked = record("baseline-approved", { openIssues: [{ status: "blocked" }] });
  const activeReturned = record("baseline-approved", { movementRequest: { ...base.movementRequest, state: "returned" } });
  assert.equal(prototypeRecordStatusLabel(activeBlocked), "Blocked");
  assert.equal(prototypeRecordStatusLabel(activeReturned), "Correction needed");
  assert.equal(getPrototypeWorkspaceStats([activeBlocked]).blocked, 1);
  assert.equal(getPrototypeWorkspaceStats([activeBlocked, activeReturned]).movementReady, 0);
  assert.equal(prototypeWorkspaceStatus({ ...model, records: [activeReturned] }, getPrototypeWorkspaceStats([activeReturned]), true).statusLabel, "attention");
});
