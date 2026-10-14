import assert from "node:assert/strict";
import test from "node:test";

import {
  platformOperationFreshnessWindowMs,
  projectPlatformRuntimeReadiness,
} from "../../src/environment-lifecycle/read-model/platform-runtime-readiness.ts";

const now = new Date("2026-10-15T12:00:00.000Z");

test("case:1292-positive projects current owner truth as ready and an active operation as recovering", () => {
  const ready = projectPlatformRuntimeReadiness(snapshot(), now);
  assert.equal(ready.state, "ready");
  assert.equal(ready.ready, true);
  assert.equal(ready.catalogState, "current");

  const recovering = projectPlatformRuntimeReadiness(snapshot({ operations: [operation({ state: "running" })] }), now);
  assert.equal(recovering.state, "recovering");
  assert.equal(recovering.ready, false);
  assert.equal(recovering.actionable, true);
  assert.equal(recovering.operationState, "recovering");
  assert.equal(recovering.nextAction.authority, "platform-engineering");
});

test("case:1292-negative keeps a partial catalog outage recoverable without claiming readiness", () => {
  const retained = operation({ state: "blocked" });
  const result = projectPlatformRuntimeReadiness(snapshot({
    catalog: null,
    error: { code: "platform_catalog_unavailable", message: "Catalog is unavailable." },
    operations: [retained],
    status: "degraded",
  }), now);

  assert.equal(result.state, "degraded");
  assert.equal(result.ready, false);
  assert.equal(result.actionable, false);
  assert.equal(result.operationState, "retained");
  assert.equal(result.latestOperation.operation_id, retained.operation_id);
  assert.equal(result.nextAction.code, "correct-platform-owner-condition");
});

test("case:1292-negative never treats disconnected, offline, or stale truth as ready", () => {
  const disconnected = projectPlatformRuntimeReadiness(snapshot({ mode: "disconnected-preview" }), now);
  assert.equal(disconnected.state, "unavailable");
  assert.equal(disconnected.ready, false);

  const offline = projectPlatformRuntimeReadiness(snapshot({ mode: "unavailable", status: "offline" }), now);
  assert.equal(offline.state, "degraded");
  assert.equal(offline.ready, false);

  const staleObservedAt = new Date(now.getTime() - platformOperationFreshnessWindowMs - 1).toISOString();
  const stale = projectPlatformRuntimeReadiness(snapshot({ catalog: catalog({ observed_at: staleObservedAt }) }), now);
  assert.equal(stale.state, "stale");
  assert.equal(stale.ready, false);
  assert.equal(stale.actionable, false);
  assert.equal(stale.nextAction.code, "refresh-owner-truth");
});

test("case:1292-positive scopes retained failure to its own Environment workspace", () => {
  const failedRelease = operation({ state: "failed" });
  failedRelease.command = { subject: { kind: "product-release" } };
  const result = projectPlatformRuntimeReadiness(
    snapshot({ operations: [failedRelease] }),
    now,
    ["dev-integration-profile", "profile-request"],
  );
  assert.equal(result.state, "ready");
  assert.equal(result.latestOperation, null);
});

function snapshot(overrides = {}) {
  return {
    catalog: catalog(),
    error: null,
    mode: "live",
    observedAt: now.toISOString(),
    operations: [],
    status: "current",
    ...overrides,
  };
}

function catalog(overrides = {}) {
  return {
    catalog_id: "platform-catalog:v1",
    freshness: "current",
    observed_at: now.toISOString(),
    schema_version: 1,
    source_version: "catalog-source:v1",
    subjects: [],
    ...overrides,
  };
}

function operation({ state }) {
  return {
    command: { subject: { kind: "dev-integration-profile" } },
    operation_id: "platform-operation:test",
    state,
    updated_at: now.toISOString(),
    next_action: {
      authority: "platform-engineering",
      code: "correct-platform-owner-condition",
      reason: "Correct the owner condition, then retry the retained operation.",
    },
  };
}
