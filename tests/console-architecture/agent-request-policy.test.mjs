import assert from "node:assert/strict";
import test from "node:test";

import { hasSecretLikeMaterial } from "../../src/agent-console/model/agent-input-policy.ts";
import {
  parseAgentContextCandidate,
  validateAgentRequest,
} from "../../src/agent-console/server/agent-request-policy.ts";

const nonce = "550e8400-e29b-41d4-a716-446655440000";
const invocationNonce = "550e8400-e29b-41d4-a716-446655440001";

function candidate(overrides = {}) {
  return {
    boundary: "Read-only governed context candidate.",
    displayTone: "info",
    freshness: "current",
    id: "page:record-1",
    observedAt: null,
    projectedAt: "2026-10-09T05:00:00.000Z",
    refs: ["console://records/record-1"],
    safeActions: ["Explain the record"],
    schemaVersion: 1,
    scope: "page",
    signals: ["state: ready"],
    sourceAuthority: "Canonical owner projection",
    sourceMode: "source-projected",
    status: "ready",
    summary: "A bounded current summary.",
    surfaceKind: "test-record",
    title: "Selected record",
    ...overrides,
  };
}

function request(overrides = {}) {
  return {
    context: { candidate: candidate(), mode: "focused" },
    invocationNonce,
    message: "Summarize the next move.",
    session: { nonce, openedAt: "2026-10-09T05:00:00.000Z" },
    ...overrides,
  };
}

test("Agent request policy accepts one exact browser/session/context binding", () => {
  const validation = validateAgentRequest(request());
  assert.equal(validation.ok, true);
  if (!validation.ok) return;
  assert.equal(validation.mode, "focused");
  assert.equal(validation.candidate.id, "page:record-1");
  assert.equal(validation.message, "Summarize the next move.");
  assert.equal(validation.session.nonce, nonce);
  assert.equal(validation.invocationNonce, invocationNonce);
});

test("Workspace requests require a matching current workspace candidate", () => {
  const accepted = validateAgentRequest(request({
    context: { candidate: candidate({ scope: "workspace" }), mode: "workspace" },
  }));
  assert.equal(accepted.ok, true);

  const mismatch = validateAgentRequest(request({
    context: { candidate: candidate(), mode: "workspace" },
  }));
  assert.equal(mismatch.ok, false);
  assert.match(mismatch.error, /does not match/);
});

test("Agent request policy rejects browser admission claims and malformed candidates", () => {
  const browserClaim = validateAgentRequest(request({
    context: { admission: { contextAttached: true }, candidate: candidate(), mode: "focused" },
  }));
  assert.equal(browserClaim.ok, false);
  assert.match(browserClaim.error, /unsupported field admission/);

  assert.deepEqual(parseAgentContextCandidate({ ...candidate(), schemaVersion: 2 }), {
    error: "context candidate schemaVersion must be 1",
  });
});

test("Agent request policy rejects detached, unavailable, replay-ambiguous, and extra input", () => {
  for (const value of [
    request({ context: { candidate: candidate(), mode: "general" } }),
    request({ context: { candidate: candidate({ sourceMode: "unavailable" }), mode: "focused" } }),
    request({ invocationNonce: "not-a-uuid" }),
    request({ session: { nonce: "not-a-uuid", openedAt: "2026-10-09T05:00:00Z" } }),
    { ...request(), history: [{ content: "unbound history", role: "user" }] },
  ]) {
    const validation = validateAgentRequest(value);
    assert.equal(validation.ok, false);
    assert.equal(validation.status, 422);
  }
});

test("Agent request policy blocks secret-like prompt and context material", () => {
  assert.equal(hasSecretLikeMaterial("token=super-sensitive-value"), true);
  const prompt = validateAgentRequest(request({ message: "token=super-sensitive-value" }));
  assert.deepEqual(prompt, {
    error: "secret-like material detected; governed Agent Console projection was denied",
    ok: false,
    status: 422,
  });
  const context = validateAgentRequest(request({
    context: { candidate: candidate({ summary: "password=super-sensitive-value" }), mode: "focused" },
  }));
  assert.equal(context.ok, false);
  assert.equal(context.status, 422);
});

test("Agent request policy rejects missing and oversized prompts before OOS", () => {
  assert.deepEqual(validateAgentRequest({ message: "  " }), {
    error: "message is required",
    ok: false,
    status: 400,
  });
  const oversized = validateAgentRequest({ message: "x".repeat(2_001) });
  assert.equal(oversized.ok, false);
  assert.equal(oversized.status, 400);
});
