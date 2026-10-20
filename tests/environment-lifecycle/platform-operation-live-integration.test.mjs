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
  platformCanonicalDigest as hash,
} from "../../src/environment-lifecycle/server/platform-operation-oos-client.ts";
import { assertSourceCredentialReceipt, assertSourceCredentialIntent, assertSourceAuthorizationPreparation,
  assertSourceOperationIntent, assertSourceOperationReceipt, assertSourceOperationPreparation } from "../../src/environment-lifecycle/live-runtime/source-authorization-contract.ts";
import { commandSourceAuthorization, prepareSourceAuthorization, readSourceAuthorization } from "../../src/environment-lifecycle/server/source-authorization-oos-client.ts";

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

function sourcePreparation() {
  const source = { schema_version: 1, purpose: "ordinary-source", intent_id: "source-intent:console-example", caller_id: "operator-orchestration-service", operator_id: config.operatorId,
    subject: { kind: "delivery", work_item_ref: "work-item-42", snapshot_digest: hash("snapshot") }, source_start_digest: hash("start"), repository: "example/source", repository_id: 123, installation_id: 456,
    landing_unit_id: "source-example", branch: "topic/example", fetched_base: "a".repeat(40), human_reviewer_id: "reviewer", expires_at: "2026-10-18T12:00:00.000Z", supersedes_intent_digest: null };
  return { schema_version: 1, workflow_id: "source-credential-preparation", intent_id: source.intent_id, source_intent: source, source_intent_digest: hash(source), session_id: null, created_at: now,
    operation_refs: { issue: null, revoke: null },
    start_decision: { schema_version: 1, artifact_type: "delivery_art_work_session_decision", work_item_id: "work-item-42", covered_work_item_ids: ["work-item-42"], caller_id: config.callerId,
      operator: { id: config.operatorId, decision_source: "operator" }, landing_unit: { id: "source-example", decision: "feature_single_landing_unit", split_reason: "One owner boundary.", base_ref: "origin/main", branch: "topic/example", rollback_boundary: "Revert reviewed source." }, architecture: { required: false, artifact_location: null }, human_gate_work_item_ids: { security_acceptance: [] } },
    authorization: { state: "prepared", approval_ref: null, credential_receipt: null }, authority: "operator-orchestration-service", secret_values_embedded: false };
}
function sourceCatalog() {
  const value = catalog(); value.subjects[0].ref = "profile:accepted-idea-delivery";
  value.subjects[0].capabilities = ["issue", "renew", "revoke"].map(action => ({ capability_id: `agent-source.${action}`, action: `agent-source.${action}`, available: true, unavailable_reason: null, required_capability: "platform.agent-source", approval_required: true, destructive: action === "revoke" }));
  return value;
}
function sourceReceipt(bound) {
  const intent = bound.input.source_intent;
  const receipt = { schema_version: 1, artifact_type: "source-intent-credential-receipt", command_id: bound.command_id, action: bound.action, outcome: "issued", source_intent_digest: hash(intent), source_intent_id: intent.intent_id,
    supersedes_intent_digest: intent.supersedes_intent_digest, subject: intent.subject, session_id: bound.input.session_id, landing_unit_id: intent.landing_unit_id, repository: intent.repository, repository_id: intent.repository_id, installation_id: intent.installation_id,
    branch: intent.branch, fetched_base: intent.fetched_base, human_reviewer_id: intent.human_reviewer_id, caller_id: intent.caller_id, operator_id: intent.operator_id, source_start_digest: intent.source_start_digest,
    identity_id: "agent-gary", logical_agent_id: "gary", provider_principal: "example-gary[bot]", app_id: 789, definition_digest: hash("definition"), permissions: { metadata: "read", contents: "write", pull_requests: "write", checks: "read" },
    token_expires_at: "2026-10-15T01:00:00.000Z", authorization_expires_at: intent.expires_at, recorded_at: now, secret_values_embedded: false };
  return { ...receipt, receipt_digest: hash(receipt) };
}
function sourceCommand() {
  const { intent_digest, approval, ...intent } = command();
  intent.action = "agent-source.issue"; intent.capability_id = intent.action;
  intent.subject.ref = "profile:accepted-idea-delivery"; intent.input = { source_intent: sourcePreparation().source_intent, session_id: null };
  return { ...intent, intent_digest: hash(intent), approval: { ...approval, intent_digest: hash(intent) } };
}
function bootstrapPreparation(withCi = false) {
  const value = sourcePreparation();
  value.start_decision = null;
  value.source_intent.purpose = "trusted-owner-bootstrap";
  value.source_intent.subject = { kind: "repository-bootstrap", owner_repo: "example-source", intake_entry_ref: { id: "repo:example-source", version: 1, digest: hash("entry") },
    custody_receipt_digest: hash("custody"), template_digest: hash("template"), plan_digest: hash("plan"), decision_ref: "operator:trusted-bootstrap",
    workflow_write: withCi, workflow_approval_ref: withCi ? "operator:separate-ci-approval" : null,
    allowed_paths: ["AGENTS.md", ...(withCi ? [".github/workflows/validate.yaml"] : [])].sort() };
  value.source_intent_digest = hash(value.source_intent);
  return value;
}

test("bootstrap stays a separately marked finite purpose; ordinary consumers reject it", () => {
  for (const withCi of [false, true]) {
    const preparation = bootstrapPreparation(withCi);
    const bound = sourceCommand(); bound.input.source_intent = preparation.source_intent;
    const raw = sourceReceipt(bound); delete raw.receipt_digest;
    raw.purpose = "trusted-owner-bootstrap";
    if (withCi) raw.permissions.workflows = "write";
    const receipt = { ...raw, receipt_digest: hash(raw) };
    assert.equal(assertSourceOperationIntent(preparation.source_intent).purpose, "trusted-owner-bootstrap");
    assert.equal(assertSourceOperationPreparation(preparation).start_decision, null);
    assert.equal(assertSourceOperationReceipt(receipt).purpose, "trusted-owner-bootstrap");
    assert.throws(() => assertSourceCredentialIntent(preparation.source_intent), /unauthorized/);
    assert.throws(() => assertSourceAuthorizationPreparation(preparation), /unauthorized/);
    assert.throws(() => assertSourceCredentialReceipt(receipt), /unauthorized/);
    for (const mutate of [
      value => { value.subject.allowed_paths.push("app/main.mjs"); },
      value => { value.subject.allowed_paths.push("AGENTS.md"); },
      value => { value.subject.intake_entry_ref.id = "repo:other"; },
      value => { value.subject.workflow_write = !withCi; },
      value => { value.subject.workflow_approval_ref = withCi ? null : "operator:unneeded-grant"; },
      value => { value.purpose = "ordinary-source"; },
      value => { value.subject.work_item_ref = "work-item-42"; },
    ]) { const changed = structuredClone(preparation.source_intent); mutate(changed); assert.throws(() => assertSourceOperationIntent(changed), /unauthorized/); }
    const excessive = structuredClone(receipt); excessive.permissions.administration = "write";
    assert.throws(() => assertSourceOperationReceipt(excessive), /unauthorized/);
  }
});

test("the bootstrap authorization adapter sends only real owner/request selectors and rejects browser source coordinates", async () => {
  const preparation = bootstrapPreparation(), input = { preparationId: "console-bootstrap", subject: { kind: "repository-bootstrap", owner_repo: "example-source", source_request_id: "bootstrap-request:example" },
    decision: null, expiresAt: preparation.source_intent.expires_at, supersedesIntentDigest: null };
  let sent;
  const result = await prepareSourceAuthorization(input, { config, fetchImpl: async (_url, init) => { sent = JSON.parse(init.body); return Response.json(preparation); } });
  assert.deepEqual(sent.preparation.subject, input.subject); assert.equal(result.source_intent.purpose, "trusted-owner-bootstrap");
  await assert.rejects(prepareSourceAuthorization({ ...input, subject: { ...input.subject, repository: "attacker/source" } }, { config }), /actual proposed owner/);
  await assert.rejects(prepareSourceAuthorization({ ...input, decision: { work_item_ref: "work-item-42" } }, { config }), /actual proposed owner/);
});

test("Platform operation readback verifies marked bootstrap receipts and rejects relabeled ordinary scope", async () => {
  const bound = sourceCommand(); bound.input.source_intent = bootstrapPreparation(true).source_intent;
  const { intent_digest, approval, ...body } = bound;
  const exact = { ...body, intent_digest: hash(body), approval: { ...approval, intent_digest: hash(body) } };
  const retained = operation(exact), raw = sourceReceipt(exact); delete raw.receipt_digest;
  raw.purpose = "trusted-owner-bootstrap"; raw.permissions.workflows = "write";
  const receipt = { ...raw, receipt_digest: hash(raw) };
  retained.state = "succeeded"; retained.provider_operation.state = "succeeded"; retained.provider_operation.events[0].state = "succeeded";
  retained.provider_operation.receipt = { receipt_ref: "platform:receipt:bootstrap", outcome: "succeeded", recorded_at: now, source_version: "version:1", effect: "verified", source_credential: receipt };
  assert.equal(assertPlatformOperationRecord(retained).provider_operation.receipt.source_credential.purpose, "trusted-owner-bootstrap");
  const result = await readPlatformOperations({ config, fetchImpl: async url => Response.json(String(url).endsWith("/catalog") ? sourceCatalog() : { workflow_id: "platform-operation-list", operations: [retained] }) });
  assert.equal(result.operations.length, 1);
  delete retained.provider_operation.receipt.source_credential.purpose;
  assert.throws(() => assertPlatformOperationRecord(retained), /unauthorized/);
});
test("source preparation sends only actual subject/decision selectors and verifies the owner-derived scope", async () => {
  const input = { preparationId: "console-example", subject: { kind: "delivery", work_item_ref: "work-item-42" }, decision: null, expiresAt: sourcePreparation().source_intent.expires_at, supersedesIntentDigest: null };
  let sent;
  const result = await prepareSourceAuthorization(input, { config, fetchImpl: async (_url, init) => { sent = JSON.parse(init.body); return Response.json(sourcePreparation()); } });
  assert.deepEqual(sent.preparation.subject, input.subject); assert.equal(Object.hasOwn(sent.preparation, "repository"), false); assert.equal(result.source_intent.repository, "example/source");
  await assert.rejects(prepareSourceAuthorization({ ...input, repository: "attacker/source" }, { config }), /invalid fields/);
  await assert.rejects(readSourceAuthorization(result.intent_id, { config, fetchImpl: async () => Response.json({ ...sourcePreparation(), source_intent_digest: hash("forged") }) }), /digest/);
});
test("explicit source approval uses server identity and retained exact time, with no second issue after acknowledgement loss", async () => {
  const preparation = sourcePreparation(); let submitted = 0, sent;
  const fetchImpl = async (url, init) => {
    if (String(url).includes("/source-preparations/")) return Response.json(preparation);
    if (String(url).endsWith("/catalog")) return Response.json(sourceCatalog());
    if (String(url).endsWith("/commands")) {
      sent = JSON.parse(init.body).command; submitted++;
      preparation.authorization = { state: "approved", approval_ref: sent.approval.decision_ref, credential_receipt: null };
      return Response.json(operation(sent));
    }
    return Response.json({ workflow_id: "platform-operation-list", operations: [] });
  };
  const decision = { action: "issue", commandId: "approval:original", requestedAt: now, expectedIntentDigest: preparation.source_intent_digest };
  const result = await commandSourceAuthorization(preparation.intent_id, decision, { config, fetchImpl });
  assert.equal(result.authorization.state, "approved"); assert.equal(sent.requested_at, now); assert.equal(sent.approval.decided_at, now); assert.equal(sent.actor_ref, config.operatorId);
  await commandSourceAuthorization(preparation.intent_id, decision, { config, fetchImpl }); assert.equal(submitted, 1);
  await assert.rejects(commandSourceAuthorization(preparation.intent_id, { ...decision, expectedIntentDigest: hash("other") }, { config, fetchImpl }), /changed/);
});
test("native successful source receipts are accepted only with exact bounded permissions and verified intent/digest", async () => {
  const bound = sourceCommand(), retained = operation(bound), receipt = sourceReceipt(bound);
  retained.state = "succeeded"; retained.provider_operation.state = "succeeded"; retained.provider_operation.events[0].state = "succeeded";
  retained.provider_operation.receipt = { receipt_ref: "platform:receipt:source", outcome: "succeeded", recorded_at: now, source_version: "version:1", effect: "verified", source_credential: receipt };
  assert.equal(assertPlatformOperationRecord(retained).provider_operation.receipt.source_credential.receipt_digest, receipt.receipt_digest);
  assert.throws(() => assertSourceCredentialReceipt({ ...receipt, token: "forbidden" }), /unauthorized/);
  assert.throws(() => assertSourceCredentialReceipt({ ...receipt, permissions: { ...receipt.permissions, workflows: "write" } }), /unauthorized/);
  let result = await readPlatformOperations({ config, fetchImpl: async url => Response.json(String(url).endsWith("/catalog") ? sourceCatalog() : { workflow_id: "platform-operation-list", operations: [retained] }) });
  assert.equal(result.operations.length, 1);
  retained.provider_operation.receipt.source_credential.receipt_digest = hash("forged");
  result = await readPlatformOperations({ config, fetchImpl: async url => Response.json(String(url).endsWith("/catalog") ? sourceCatalog() : { workflow_id: "platform-operation-list", operations: [retained] }) });
  assert.equal(result.status, "partial"); assert.equal(result.operations.length, 0); assert.equal(result.error.code, "source_authorization_receipt_invalid");
});
test("source issuance uncertainty preserves its exact retry boundary without widening generic failure fields", () => {
  const retained = operation(sourceCommand()); retained.state = "blocked"; retained.provider_operation.state = "blocked"; retained.provider_operation.events[0].state = "blocked";
  retained.provider_operation.failure = { code: "platform_source_issuance_uncertain", owner: "platform-engineering", detail: "Reconcile the original issuance.", retry_after: "2026-10-15T01:00:00.000Z" };
  assert.equal(assertPlatformOperationRecord(retained).provider_operation.failure.retry_after, "2026-10-15T01:00:00.000Z");
  retained.provider_operation.failure.code = "other-failure"; assert.throws(() => assertPlatformOperationRecord(retained), /malformed/);
});

test("cold revocation recovery reads the original operation, honors its deadline and retries only its retained control", async () => {
  const preparation = sourcePreparation(), originalRef = `platform-operation:${"a".repeat(24)}`;
  preparation.authorization.state = "revocation-requested"; preparation.operation_refs.revoke = originalRef;
  const { approval, intent_digest, ...intent } = sourceCommand(); intent.action = "agent-source.revoke"; intent.capability_id = intent.action;
  const bound = { ...intent, intent_digest: hash(intent), approval: { ...approval, intent_digest: hash(intent) } };
  const original = operation(bound); original.operation_id = originalRef; original.state = "failed";
  Object.assign(original.provider_operation, { state: "failed", retryable: true, failure: { code: "platform_source_revocation_expiry_pending", detail: "Wait for the exact owner expiry boundary.", owner: "platform-engineering", retry_after: "2099-01-01T00:00:00Z" },
    receipt: { receipt_ref: "platform:receipt:pending-revoke", outcome: "failed", recorded_at: now, source_version: "version:1", effect: "none" } });
  original.provider_operation.events[0].state = "failed";
  const controls = [], paths = [];
  const fetchImpl = async (url, init) => {
    paths.push(String(url));
    if (String(url).includes("/source-preparations/")) return Response.json(preparation);
    if (String(url).endsWith("/controls")) {
      const control = JSON.parse(init.body).control; controls.push(control);
      original.controls = [{ control_id: control.control_id, idempotency_key: control.idempotency_key, request_digest: hash(control), action: control.action, requested_at: control.requested_at, status: "unknown" }];
    }
    return Response.json(original);
  };
  const decision = { action: "revoke", commandId: "source:after-browser-reload", requestedAt: now, expectedIntentDigest: preparation.source_intent_digest };
  await commandSourceAuthorization(preparation.intent_id, decision, { config, fetchImpl }); assert.equal(controls.length, 0);
  original.provider_operation.failure.retry_after = "2026-01-01T00:00:00Z";
  await commandSourceAuthorization(preparation.intent_id, decision, { config, fetchImpl });
  await commandSourceAuthorization(preparation.intent_id, { ...decision, commandId: "new-browser-nonce" }, { config, fetchImpl });
  assert.equal(controls.length, 2); assert.deepEqual(controls[0], controls[1]);
  assert.equal(paths.some(path => path.endsWith("/commands")), false); assert.equal(paths.some(path => path.endsWith("/catalog")), false);
  assert.equal(preparation.authorization.state, "revocation-requested");
});
