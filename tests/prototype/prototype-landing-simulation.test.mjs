import assert from "node:assert/strict";
import test from "node:test";

import { evaluatePrototypeLandingSimulation } from "../../src/domain-workspaces/prototype/work-model/workflows/landing/prototype-landing-simulation-model.ts";

test("landing simulation completes with ordered setup progress", () => {
  const outcome = evaluatePrototypeLandingSimulation(landingPlan());

  assert.equal(outcome.state, "completed");
  assert.equal(outcome.blockers.length, 0);
  assert.equal(outcome.progress.length, 5);
  assert.match(outcome.progress[2].summary, /3 setup items/);
});

test("landing simulation reports source and support blockers without success", () => {
  const outcome = evaluatePrototypeLandingSimulation(
    landingPlan({
      blockedItems: ["Source home is unresolved."],
      supportRows: [{ id: "runtime", label: "Runtime", state: "blocked" }],
    }),
  );

  assert.equal(outcome.state, "blocked");
  assert.deepEqual(outcome.blockers, [
    "Source home is unresolved.",
    "Runtime is blocked.",
  ]);
});

function landingPlan(overrides = {}) {
  return {
    basePlatform: "node-web",
    blockedItems: [],
    draftKey: "landing-draft-1",
    evidenceCount: 2,
    launchAdapter: "next-dev-server",
    setupItems: ["registry", "source", "preview"],
    sourceRef: "proposal://PR-1",
    supportRows: [{ id: "source", label: "Source", state: "ready" }],
    validationCheckCount: 3,
    ...overrides,
  };
}
