import assert from "node:assert/strict";
import test from "node:test";

import {
  hasSecretLikeMaterial,
} from "../../src/agent-console/model/agent-input-policy.ts";
import {
  parseAgentContextCandidate,
  validateAgentRequest,
} from "../../src/agent-console/server/agent-request-policy.ts";

function candidate(overrides = {}) {
  return {
    boundary: "Read-only prototype context.",
    displayTone: "info",
    freshness: "fixture",
    id: "page:record-1",
    observedAt: null,
    projectedAt: "2026-07-28T05:00:00.000Z",
    refs: ["record-1"],
    safeActions: ["Explain the record"],
    schemaVersion: 1,
    scope: "page",
    signals: ["state: ready"],
    sourceAuthority: "Test fixture",
    sourceMode: "synthetic",
    status: "ready",
    summary: "A model-safe synthetic summary.",
    surfaceKind: "test-record",
    title: "Selected record",
    ...overrides,
  };
}

test("Agent request policy recomputes a bounded synthetic context decision", () => {
  const validation = validateAgentRequest({
    context: {
      candidate: candidate(),
      mode: "focused",
    },
    history: [{ content: "What was selected?", role: "user" }],
    message: "Summarize the next move.",
  });

  assert.equal(validation.ok, true);
  if (!validation.ok) {
    return;
  }

  assert.deepEqual(validation.messages.map(({ role }) => role), [
    "system",
    "system",
    "user",
    "user",
  ]);
  assert.equal(validation.contextDecision.code, "focused-synthetic-attached");
  assert.equal(validation.contextDecision.attached, true);
  assert.match(validation.messages[1].content, /context attached: yes/);
  assert.match(
    validation.messages[1].content,
    /prototype-synthetic-only\/v1/,
  );
  assert.doesNotMatch(validation.messages[1].content, /displayTone/);
  assert.equal(validation.messages.at(-1).content, "Summarize the next move.");
});

test("Agent request policy keeps live candidates outside the model prompt", () => {
  const validation = validateAgentRequest({
    context: {
      candidate: candidate({
        sourceMode: "live",
        summary: "Live runtime detail must remain display-only.",
      }),
      mode: "focused",
    },
    message: "What is selected?",
  });

  assert.equal(validation.ok, true);
  if (!validation.ok) {
    return;
  }

  assert.equal(validation.contextDecision.code, "cgg-required");
  assert.equal(validation.contextDecision.attached, false);
  assert.match(validation.messages[1].content, /context attached: no/);
  assert.doesNotMatch(
    validation.messages[1].content,
    /Live runtime detail must remain display-only/,
  );
});

test("Agent request policy rejects browser admission claims and malformed candidates", () => {
  const browserClaim = validateAgentRequest({
    context: {
      admission: {
        contextAttached: true,
      },
      candidate: candidate(),
      mode: "focused",
    },
    message: "Continue",
  });
  assert.equal(browserClaim.ok, false);
  assert.match(browserClaim.error, /unsupported field admission/);

  const malformed = parseAgentContextCandidate({
    ...candidate(),
    schemaVersion: 2,
  });
  assert.deepEqual(malformed, {
    error: "context candidate schemaVersion must be 1",
  });
});

test("Agent request policy blocks secret-like prompt, history, and context material", () => {
  assert.equal(hasSecretLikeMaterial("token=super-sensitive-value"), true);

  const prompt = validateAgentRequest({
    context: { candidate: null, mode: "general" },
    message: "token=super-sensitive-value",
  });
  assert.deepEqual(prompt, {
    error:
      "secret-like material detected; this prototype blocks raw projection into the local model",
    ok: false,
    status: 422,
  });

  const history = validateAgentRequest({
    context: { candidate: null, mode: "general" },
    history: [{ content: "api_key=super-sensitive-value", role: "user" }],
    message: "Continue",
  });
  assert.equal(history.ok, false);
  assert.equal(history.status, 422);

  const context = validateAgentRequest({
    context: {
      candidate: candidate({
        summary: "password=super-sensitive-value",
      }),
      mode: "focused",
    },
    message: "Continue",
  });
  assert.equal(context.ok, false);
  assert.equal(context.status, 422);
});

test("Agent request policy rejects missing and oversized prompts before model access", () => {
  assert.deepEqual(validateAgentRequest({ message: "  " }), {
    error: "message is required",
    ok: false,
    status: 400,
  });

  const oversized = validateAgentRequest({ message: "x".repeat(2_001) });
  assert.equal(oversized.ok, false);
  assert.equal(oversized.status, 400);
});
