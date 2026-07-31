import assert from "node:assert/strict";
import test from "node:test";

import {
  agentContextBudgetLimitChars,
  evaluateAgentContextPolicy,
  resolveAgentContextRequest,
} from "../../src/agent-console/model/agent-context-policy.ts";

function candidate(overrides = {}) {
  return {
    boundary: "Read-only prototype context.",
    displayTone: "warn",
    freshness: "fixture",
    id: "page:test",
    observedAt: null,
    projectedAt: "2026-07-28T05:00:00.000Z",
    refs: [],
    safeActions: ["Explain"],
    schemaVersion: 1,
    scope: "page",
    signals: ["state: ready"],
    sourceAuthority: "Test fixture",
    sourceMode: "synthetic",
    status: "ready",
    summary: "Synthetic context.",
    surfaceKind: "test",
    title: "Test context",
    ...overrides,
  };
}

test("Focused mode attaches only bounded synthetic candidates", () => {
  const result = resolveAgentContextRequest({
    candidate: candidate(),
    mode: "focused",
  });

  assert.equal(result.decision.code, "focused-synthetic-attached");
  assert.equal(result.decision.attached, true);
  assert.equal(result.decision.budgetUsedChars > 0, true);
  assert.equal(result.decision.cggReceiptRef, null);
  assert.equal("displayTone" in result.projection, false);
});

test("General and workspace modes never attach the visible candidate", () => {
  const general = evaluateAgentContextPolicy({
    candidate: candidate(),
    mode: "general",
  });
  const workspace = evaluateAgentContextPolicy({
    candidate: candidate({ scope: "workspace" }),
    mode: "workspace",
  });

  assert.equal(general.code, "general-detached");
  assert.equal(general.attached, false);
  assert.equal(general.budgetUsedChars, 0);
  assert.equal(workspace.code, "workspace-unavailable");
  assert.equal(workspace.attached, false);
});

test("Live and source-projected candidates require governed CGG admission", () => {
  for (const sourceMode of ["live", "source-projected"]) {
    const result = evaluateAgentContextPolicy({
      candidate: candidate({ sourceMode }),
      mode: "focused",
    });

    assert.equal(result.code, "cgg-required");
    assert.equal(result.attached, false);
    assert.equal(result.budgetUsedChars, 0);
  }
});

test("Oversized synthetic candidates fail closed", () => {
  const result = evaluateAgentContextPolicy({
    candidate: candidate({
      summary: "x".repeat(agentContextBudgetLimitChars + 1),
    }),
    mode: "focused",
  });

  assert.equal(result.code, "context-budget-exceeded");
  assert.equal(result.attached, false);
  assert.equal(result.candidateChars > agentContextBudgetLimitChars, true);
});
