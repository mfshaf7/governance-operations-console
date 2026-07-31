import assert from "node:assert/strict";
import test from "node:test";

import {
  createAgentInvocation,
  createAgentRequestAbortReason,
  isAgentRequestAbortReason,
  settleAgentInvocation,
} from "../../src/agent-console/model/agent-console-session.ts";
import {
  evaluateAgentContextPolicy,
} from "../../src/agent-console/model/agent-context-policy.ts";

const detachedContextDecision = evaluateAgentContextPolicy({
  candidate: null,
  mode: "general",
});

test("Agent Console invocation records provider and context-decision truth", () => {
  const contextDecision = evaluateAgentContextPolicy({
    candidate: {
      boundary: "Read-only prototype context.",
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
      summary: "Synthetic context.",
      surfaceKind: "test",
      title: "Test context",
    },
    mode: "focused",
  });
  const invocation = createAgentInvocation({
    contextDecision,
    model: "llama3.1:8b",
    provider: "ollama",
  });

  assert.match(invocation.id, /^agent-invocation-/);
  assert.equal(invocation.state, "running");
  assert.equal(invocation.provider, "ollama");
  assert.equal(invocation.model, "llama3.1:8b");
  assert.equal(invocation.contextAttached, true);
  assert.equal(invocation.contextDecision, "focused-synthetic-attached");
  assert.equal(invocation.contextCandidateId, "page:test");
  assert.equal(invocation.contextPolicyProfile, "prototype-synthetic-only/v1");
  assert.equal(invocation.contextSourceMode, "synthetic");
  assert.equal(invocation.interactionMode, "focused");
  assert.equal(invocation.cggReceiptRef, null);
  assert.equal(invocation.completedAt, null);
  assert.equal(invocation.error, null);
  assert.equal(invocation.failureCode, null);
  assert.equal(Number.isNaN(Date.parse(invocation.startedAt)), false);
});

test("Agent Console invocation settlement keeps completion, cancellation, and failure distinct", () => {
  const invocation = createAgentInvocation({
    contextDecision: detachedContextDecision,
    model: "llama3.1:8b",
    provider: "ollama",
  });
  const completedAt = "2026-07-28T05:00:00.000Z";

  const completed = settleAgentInvocation(
    invocation,
    { state: "completed" },
    completedAt,
  );
  const cancelled = settleAgentInvocation(
    invocation,
    { state: "cancelled" },
    completedAt,
  );
  const failed = settleAgentInvocation(
    invocation,
    {
      error: "response stream interrupted",
      failureCode: "stream-interrupted",
      state: "failed",
    },
    completedAt,
  );

  assert.equal(completed.state, "completed");
  assert.equal(completed.failureCode, null);
  assert.equal(cancelled.state, "cancelled");
  assert.equal(cancelled.error, null);
  assert.equal(failed.state, "failed");
  assert.equal(failed.failureCode, "stream-interrupted");
  assert.equal(failed.error, "response stream interrupted");
  assert.equal(failed.completedAt, completedAt);
});

test("Agent Console uses structured abort reasons", () => {
  const cancellation = createAgentRequestAbortReason("operator-cancelled");
  const timeout = createAgentRequestAbortReason("request-timeout");

  assert.equal(isAgentRequestAbortReason(cancellation), true);
  assert.equal(cancellation.code, "operator-cancelled");
  assert.equal(timeout.code, "request-timeout");
  assert.equal(isAgentRequestAbortReason(new Error("aborted")), false);
});
