import assert from "node:assert/strict";
import test from "node:test";

import {
  inspectAgentInput,
  maxOperatorPromptChars,
} from "../../src/agent-console/model/agent-input-policy.ts";

test("Agent input policy returns a trimmed model-safe prompt", () => {
  assert.deepEqual(inspectAgentInput("  explain the selected record  "), {
    message: "explain the selected record",
    ok: true,
  });
});

test("Agent input policy blocks empty, oversized, and secret-like input", () => {
  assert.equal(inspectAgentInput(" ").ok, false);
  assert.equal(
    inspectAgentInput("x".repeat(maxOperatorPromptChars + 1)).ok,
    false,
  );

  const secret = inspectAgentInput("password=do-not-project-this");
  assert.equal(secret.ok, false);
  assert.equal(secret.status, 422);
});
