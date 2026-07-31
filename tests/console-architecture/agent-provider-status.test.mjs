import assert from "node:assert/strict";
import test from "node:test";

import {
  agentProviderSafetyMode,
  deriveAgentProviderReadinessState,
  isAgentProviderStatus,
  retainStaleAgentProviderObservation,
} from "../../src/agent-console/model/agent-provider-status.ts";

function providerStatus(overrides = {}) {
  return {
    checkedAt: "2026-07-28T04:00:00.000Z",
    endpoint: "http://127.0.0.1:11434",
    freshness: "live",
    model: "llama3.1:8b",
    modelCount: 12,
    observedAt: "2026-07-28T04:00:00.000Z",
    provider: "ollama",
    safetyMode: agentProviderSafetyMode,
    status: "online",
    ...overrides,
  };
}

test("Agent provider readiness separates live source state from stale transport state", () => {
  assert.equal(deriveAgentProviderReadinessState(null), "probing");
  assert.equal(
    deriveAgentProviderReadinessState(providerStatus()),
    "online",
  );
  assert.equal(
    deriveAgentProviderReadinessState(
      providerStatus({
        endpoint: null,
        model: null,
        modelCount: 0,
        status: "offline",
      }),
    ),
    "offline",
  );
  assert.equal(
    deriveAgentProviderReadinessState(
      providerStatus({ freshness: "stale" }),
    ),
    "probing",
  );
});

test("Agent provider transport failure retains the last source observation as stale", () => {
  const previous = providerStatus();
  const stale = retainStaleAgentProviderObservation({
    checkedAt: "2026-07-28T04:00:10.000Z",
    error: "console route unavailable",
    previous,
  });

  assert.equal(stale.status, "online");
  assert.equal(stale.freshness, "stale");
  assert.equal(stale.observedAt, previous.observedAt);
  assert.equal(stale.checkedAt, "2026-07-28T04:00:10.000Z");
  assert.equal(stale.model, previous.model);
  assert.equal(stale.error, "console route unavailable");
  assert.equal(deriveAgentProviderReadinessState(stale), "probing");
});

test("Agent provider transport failure without prior truth is unavailable, not offline", () => {
  const unavailable = retainStaleAgentProviderObservation({
    checkedAt: "2026-07-28T04:00:10.000Z",
    error: "console route unavailable",
    previous: null,
  });

  assert.equal(unavailable.status, "unavailable");
  assert.equal(unavailable.freshness, "stale");
  assert.equal(unavailable.observedAt, null);
  assert.equal(deriveAgentProviderReadinessState(unavailable), "probing");
});

test("Agent provider observations require source and freshness timestamps", () => {
  assert.equal(isAgentProviderStatus(providerStatus()), true);
  assert.equal(
    isAgentProviderStatus({
      endpoint: "http://127.0.0.1:11434",
      model: "llama3.1:8b",
      modelCount: 12,
      provider: "ollama",
      safetyMode: agentProviderSafetyMode,
      status: "online",
    }),
    false,
  );
  assert.equal(
    isAgentProviderStatus(
      providerStatus({ checkedAt: "not-a-timestamp" }),
    ),
    false,
  );
  assert.equal(
    isAgentProviderStatus(
      providerStatus({
        observedAt: null,
        status: "unavailable",
      }),
    ),
    false,
  );
});
