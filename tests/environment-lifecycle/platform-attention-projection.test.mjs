import assert from "node:assert/strict";
import test from "node:test";
import { platformOperationsNeedingRecovery, platformOperationHistoryWindow } from "../../src/environment-lifecycle/read-model/platform-operation-attention.ts";
import { projectEnvironmentOwnerAttention } from "../../src/environment-lifecycle/read-model/attention-source.ts";
import { projectPlatformRuntimeReadiness } from "../../src/environment-lifecycle/read-model/platform-runtime-readiness.ts";
import { projectionRepairFixture, sourceIntent, sourceOperation } from "../support/platform-attention-fixture.mjs";
import { environmentOperation } from "../support/environment-operations-ui-fixture.mjs";
const snapshot = fixture => ({ mode: "live", status: "current", observedAt: new Date().toISOString(), error: null, catalog: fixture.catalog, operations: fixture.records });

test("terminal diagnostic failure and exact revoked authorization remain in history without becoming active blocked work", () => {
  const fixture = projectionRepairFixture(), before = structuredClone(fixture.records);
  assert.deepEqual(platformOperationsNeedingRecovery(fixture.records), []);
  const attention = projectEnvironmentOwnerAttention({ state: "current", capturedAt: new Date().toISOString(), payload: snapshot(fixture) }, "dev-integration");
  assert.deepEqual(attention.candidates, []); assert.equal(attention.source.freshness, "current");
  assert.equal(projectPlatformRuntimeReadiness(snapshot(fixture)).ready, true);
  assert.deepEqual(fixture.records, before); assert.equal(fixture.records.filter(op => op.state === "failed").length, 2);
});

test("a different success, expired token, or another revocation cannot silently clear a failed source intent", () => {
  const { failed } = projectionRepairFixture();
  assert.deepEqual(platformOperationsNeedingRecovery([failed]).map(op => op.operation_id), [failed.operation_id]);
  const success = sourceOperation("new-issue", "agent-source.issue", "succeeded");
  assert.equal(platformOperationsNeedingRecovery([failed, success]).length, 1);
  for (const overrides of [{ intent_id: "source-intent:other" }, { branch: "feature/other" }, { repository_id: 999 }, { operator_id: "operator:other" }, { expires_at: "2031-01-01T00:00:00Z" }, { source_start_digest: "sha256:" + "b".repeat(64) }]) {
    const other = sourceOperation("other-revocation", "agent-source.revoke", "succeeded", sourceIntent(overrides));
    assert.equal(platformOperationsNeedingRecovery([failed, other]).length, 1);
  }
  const invalid = sourceOperation("invalid-revocation", "agent-source.revoke", "succeeded");
  invalid.provider_operation.receipt.source_credential.command_id = "command:other";
  assert.equal(platformOperationsNeedingRecovery([failed, invalid]).length, 1);
});

test("genuine workflow failures and pending commands remain actionable despite newer unrelated successes", () => {
  const fixture = projectionRepairFixture();
  const failed = structuredClone(environmentOperation("unresolved-start", { action: "dev-integration.start", state: "failed", retryable: true }));
  failed.next_action = { code: "retry", authority: "operator", reason: "The profile start still requires recovery." };
  failed.updated_at = "2000-01-01T00:00:00Z";
  fixture.records.push(failed, environmentOperation("later-status", { state: "succeeded" }));
  const result = projectPlatformRuntimeReadiness(snapshot(fixture));
  assert.equal(result.state, "degraded"); assert.equal(result.latestOperation.operation_id, failed.operation_id); assert.equal(result.nextAction.reason, failed.next_action.reason);
  const pending = environmentOperation("pending-start", { action: "dev-integration.start", state: "running" });
  fixture.records = [pending, fixture.revoked];
  assert.equal(projectPlatformRuntimeReadiness(snapshot(fixture)).state, "recovering");
});

test("a full bounded history window cannot certify complete attention coverage or disable otherwise available commands", () => {
  const fixture = projectionRepairFixture();
  fixture.records = Array.from({ length: platformOperationHistoryWindow }, (_, index) => environmentOperation(String(index)));
  const attention = projectEnvironmentOwnerAttention({ state: "current", capturedAt: new Date().toISOString(), payload: snapshot(fixture) }, "dev-integration");
  assert.equal(attention.source.freshness, "unverified"); assert.deepEqual(attention.candidates, []);
  const readiness = projectPlatformRuntimeReadiness(snapshot(fixture));
  assert.equal(readiness.ready, false); assert.equal(readiness.actionable, true);
});


test("one history page cannot claim full workspace readiness; complete explicit metadata can", () => {
  const fixture=projectionRepairFixture(),value=snapshot(fixture);
  const partial=projectPlatformRuntimeReadiness({...value,historyPage:{workspace:"dev-integration",limit:25,total:84,next_cursor:"cursor:next",snapshot:"sha256:"+"a".repeat(64)}});
  assert.equal(partial.label,"History incomplete");assert.equal(partial.state,"partial");assert.equal(partial.ready,false);assert.equal(partial.actionable,true);
  const complete=projectPlatformRuntimeReadiness({...value,historyPage:{workspace:"dev-integration",limit:25,total:fixture.records.length,next_cursor:null,snapshot:"sha256:"+"a".repeat(64)}});
  assert.equal(complete.ready,true);
});
