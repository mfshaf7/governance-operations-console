import assert from "node:assert/strict";
import test from "node:test";

import {
  agentRuntimeHeartbeatWindowMs,
  deriveAgentRuntimeActivityState,
  selectActiveAgentRuntimes,
} from "../../src/agent-console/model/agent-runtime-presence.ts";

function runtime({
  displayName,
  heartbeatAt,
  runtimeId,
  state,
}) {
  return {
    callerId: runtimeId,
    currentOperation: null,
    displayName,
    governancePosture: "prototype-local",
    interactionMode: "general",
    invocationRef: null,
    lastActivityAt: heartbeatAt,
    lastHeartbeatAt: heartbeatAt,
    model: "llama3.1:8b",
    modelProfileRef: null,
    modelProfileVersion: null,
    operationRunRef: null,
    ownerSurface: "Console Shell",
    provider: "ollama",
    runtimeId,
    sourceAuthority: "agent-console",
    sourceRef: "/api/agent-interaction",
    startedAt: heartbeatAt,
    state,
  };
}

test("Agent runtime roster includes only current heartbeats", () => {
  const observedAt = Date.parse("2026-07-28T03:00:30.000Z");
  const runtimes = [
    runtime({
      displayName: "Current",
      heartbeatAt: "2026-07-28T03:00:29.000Z",
      runtimeId: "current",
      state: "idle",
    }),
    runtime({
      displayName: "Stale",
      heartbeatAt: new Date(
        observedAt - agentRuntimeHeartbeatWindowMs - 1,
      ).toISOString(),
      runtimeId: "stale",
      state: "working",
    }),
  ];

  assert.deepEqual(
    selectActiveAgentRuntimes(runtimes, observedAt).map(
      ({ runtimeId }) => runtimeId,
    ),
    ["current"],
  );
});

test("Agent runtime roster preserves independent embedded and docking agents", () => {
  const heartbeatAt = "2026-07-28T03:00:29.000Z";
  const observedAt = Date.parse("2026-07-28T03:00:30.000Z");
  const runtimes = [
    runtime({
      displayName: "Embedded Context Agent",
      heartbeatAt,
      runtimeId: "console-ai.embedded-context",
      state: "idle",
    }),
    runtime({
      displayName: "Docking Agent",
      heartbeatAt,
      runtimeId: "console-ai.docking-agent",
      state: "idle",
    }),
  ];

  assert.deepEqual(
    selectActiveAgentRuntimes(runtimes, observedAt).map(
      ({ runtimeId }) => runtimeId,
    ),
    ["console-ai.docking-agent", "console-ai.embedded-context"],
  );
});

test("Agent runtime state separates provider readiness from invocation activity", () => {
  assert.equal(
    deriveAgentRuntimeActivityState({
      invocationState: null,
      providerStatus: "probing",
    }),
    "waiting",
  );
  assert.equal(
    deriveAgentRuntimeActivityState({
      invocationState: null,
      providerStatus: "online",
    }),
    "idle",
  );
  assert.equal(
    deriveAgentRuntimeActivityState({
      invocationState: "running",
      providerStatus: "online",
    }),
    "working",
  );
  assert.equal(
    deriveAgentRuntimeActivityState({
      invocationState: "failed",
      providerStatus: "online",
    }),
    "idle",
  );
  assert.equal(
    deriveAgentRuntimeActivityState({
      invocationState: null,
      providerStatus: "offline",
    }),
    "failed",
  );
});

test("Agent runtime roster prioritizes work and failures over idle runtimes", () => {
  const heartbeatAt = "2026-07-28T03:00:29.000Z";
  const observedAt = Date.parse("2026-07-28T03:00:30.000Z");
  const runtimes = [
    runtime({
      displayName: "Idle",
      heartbeatAt,
      runtimeId: "idle",
      state: "idle",
    }),
    runtime({
      displayName: "Waiting",
      heartbeatAt,
      runtimeId: "waiting",
      state: "waiting",
    }),
    runtime({
      displayName: "Failed",
      heartbeatAt,
      runtimeId: "failed",
      state: "failed",
    }),
    runtime({
      displayName: "Working",
      heartbeatAt,
      runtimeId: "working",
      state: "working",
    }),
  ];

  assert.deepEqual(
    selectActiveAgentRuntimes(runtimes, observedAt).map(
      ({ runtimeId }) => runtimeId,
    ),
    ["working", "failed", "waiting", "idle"],
  );
});
