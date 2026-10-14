import assert from "node:assert/strict";
import test from "node:test";

import {
  assertPlatformOperationCatalog,
  assertPlatformOperationRecord,
} from "../../src/environment-lifecycle/live-runtime/platform-operation-contract.ts";
import {
  controlPlatformOperation,
  readPlatformOperations,
  submitPlatformOperation,
} from "../../src/environment-lifecycle/server/platform-operation-oos-client.ts";

const now = "2026-10-15T00:00:00.000Z";
const config = {
  baseUrl: "http://127.0.0.1:8080",
  callerId: "governance-operations-console",
  callerSecret: "test-secret",
  operatorId: "operator:mfshaf7",
};

test("case:1289-positive re-reads current capability truth and binds the exact approved command", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ body: init.body ? JSON.parse(String(init.body)) : null, method: init.method, url: String(url) });
    if (init.method === "GET") return Response.json(catalog());
    return Response.json(operation(calls.at(-1).body.command));
  };

  const result = await submitPlatformOperation({
    capabilityId: "capability:start:alpha",
    input: {},
    requestId: "request:stable-1",
    subjectRef: "profile:alpha",
  }, { config, fetchImpl, now: () => new Date(now) });

  assert.equal(calls.length, 2);
  assert.equal(calls[0].url.endsWith("/v1/platform-operations/catalog"), true);
  const command = calls[1].body.command;
  assert.equal(command.subject.expected_source_version, "profile-source:v3");
  assert.equal(command.actor_ref, config.operatorId);
  assert.equal(command.approval.operator_id, config.operatorId);
  assert.equal(command.approval.intent_digest, command.intent_digest);
  assert.match(command.intent_digest, /^sha256:[0-9a-f]{64}$/);
  assert.equal(result.operation_id, "platform-operation:test");
});

test("case:1289-negative denies stale capability truth before command submission", async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; return Response.json(catalog({ freshness: "stale" })); };
  await assert.rejects(
    submitPlatformOperation({ capabilityId: "capability:start:alpha", input: {}, requestId: "request:stable-2", subjectRef: "profile:alpha" }, { config, fetchImpl }),
    (error) => error.code === "platform_operation_capability_unavailable" && error.status === 409,
  );
  assert.equal(calls, 1);
});

test("catalog and operation projections reject unknown, contradictory, and incomplete owner truth", () => {
  assert.equal(assertPlatformOperationCatalog(catalog()).freshness, "current");
  assert.throws(() => assertPlatformOperationCatalog({ ...catalog(), invented: true }), /malformed/i);
  const valid = operation(command());
  assert.equal(assertPlatformOperationRecord(valid).state, "requested");
  assert.throws(() => assertPlatformOperationRecord({ ...valid, provider_operation: { ...valid.provider_operation, subject_ref: "profile:other" } }), /provider binding/i);
  assert.throws(() => assertPlatformOperationRecord({ ...valid, state: "succeeded", provider_operation: { ...valid.provider_operation, state: "succeeded", events: [{ ...valid.provider_operation.events[0], state: "succeeded" }] } }), /terminal receipt/i);
});

test("a catalog outage preserves retained operation visibility while disabling new actions", async () => {
  const retained = operation(command());
  const fetchImpl = async (url) => String(url).endsWith("/catalog")
    ? Response.json({ error: "platform_catalog_unavailable", message: "Catalog is unavailable." }, { status: 503 })
    : Response.json({ workflow_id: "platform-operation-list", operations: [retained] });
  const result = await readPlatformOperations({ config, fetchImpl });
  assert.equal(result.status, "partial");
  assert.equal(result.catalog, null);
  assert.equal(result.operations[0].operation_id, retained.operation_id);
  assert.equal(result.error.code, "platform_catalog_unavailable");
});

test("Platform retry and cancellation require exact retained control identity", async () => {
  let sent;
  const fetchImpl = async (_url, init) => {
    sent = JSON.parse(String(init.body)).control;
    const retained = operation(command());
    retained.controls = [{ control_id: sent.control_id, idempotency_key: sent.idempotency_key, request_digest: `sha256:${"e".repeat(64)}`, action: sent.action, requested_at: sent.requested_at, status: "confirmed" }];
    return Response.json(retained);
  };
  const result = await controlPlatformOperation("platform-operation:test", { action: "retry", reason: "Owner condition corrected.", requestId: "request:retry:1" }, { config, fetchImpl, now: () => new Date(now) });
  assert.equal(sent.operator_id, config.operatorId);
  assert.equal(result.controls[0].control_id, "console-control:request:retry:1");

  await assert.rejects(
    controlPlatformOperation("platform-operation:test", { action: "retry", reason: "Owner condition corrected.", requestId: "request:retry:1" }, { config, fetchImpl: async () => Response.json(operation(command())) }),
    (error) => error.code === "platform_operation_control_binding_invalid",
  );
});

function catalog(overrides = {}) {
  return {
    schema_version: 1,
    catalog_id: "platform-catalog:v1",
    source_version: "catalog-source:v1",
    observed_at: now,
    freshness: "current",
    subjects: [{
      kind: "dev-integration-profile",
      ref: "profile:alpha",
      source_version: "profile-source:v3",
      owner: "platform-engineering",
      capabilities: [{
        capability_id: "capability:start:alpha",
        action: "dev-integration.start",
        available: true,
        unavailable_reason: null,
        required_capability: "platform.dev-integration.start",
        approval_required: true,
        destructive: false,
      }],
    }],
    ...overrides,
  };
}

function command() {
  const digest = `sha256:${"b".repeat(64)}`;
  return {
    schema_version: 1,
    command_id: "console-command:test",
    idempotency_key: "console-idempotency:test",
    correlation_id: "console-correlation:test",
    causation_id: null,
    actor_ref: config.operatorId,
    subject: { kind: "dev-integration-profile", ref: "profile:alpha", expected_source_version: "profile-source:v3" },
    capability_id: "capability:start:alpha",
    action: "dev-integration.start",
    input: {},
    requested_at: now,
    intent_digest: digest,
    approval: { decision: "approved", operator_id: config.operatorId, decision_ref: "console-approval:test", decided_at: now, intent_digest: digest },
  };
}

function operation(boundCommand) {
  return {
    schema_version: 1,
    workflow_id: "platform-operation",
    operation_id: "platform-operation:test",
    command: boundCommand,
    state: "requested",
    provider_operation: {
      schema_version: 1,
      operation_id: "platform-owner:pending:test",
      command_id: boundCommand.command_id,
      correlation_id: boundCommand.correlation_id,
      state: "requested",
      attempt: 1,
      subject_ref: boundCommand.subject.ref,
      capability_id: boundCommand.capability_id,
      action: boundCommand.action,
      retryable: false,
      cancel_available: false,
      blocker: null,
      failure: null,
      receipt: null,
      safe_log_ref: null,
      updated_at: now,
      events: [{ event_id: "event:test:1", sequence: 1, state: "requested", occurred_at: now, summary: "OOS retained the request." }],
    },
    security_decision: { uri: "security://decisions/platform-operation", digest: `sha256:${"c".repeat(64)}`, revision: "d".repeat(40) },
    controls: [],
    next_action: { code: "wait", authority: "platform-engineering", reason: "Wait for current owner readback." },
    created_at: now,
    updated_at: now,
    reconciled: false,
    replayed: false,
  };
}
