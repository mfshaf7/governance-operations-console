import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  assertModelConfiguration, assertModelRuntimeRequest, sameModelRuntimeRequest,
} from "../../src/domain-workspaces/model-operations/work-model/model-runtime-contract.ts";
import {
  defaultModelScope, eligibleModelIds, readRoutingDraft, routingDraftIssue, routingInput,
} from "../../src/domain-workspaces/model-operations/work-model/model-runtime-routing.ts";
import { createModelRuntimeClient, modelRuntimeDigest } from "../../src/domain-workspaces/model-operations/server/model-runtime-oos-client.ts";
import { assertEffectiveModelSelection, modelEffortLabel } from "../../src/console-integration/governed-ai/model-selection.ts";

const config = { baseUrl: "http://synthetic-oos.test", callerId: "synthetic-console", callerSecret: "synthetic-secret", operatorId: "operator:synthetic" };
const stable = value => Array.isArray(value) ? "[" + value.map(stable).join(",") + "]" :
  value && typeof value === "object" ? "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + stable(value[key])).join(",") + "}" : JSON.stringify(value);
const hash = value => "sha256:" + createHash("sha256").update(stable(value)).digest("hex");
const id = (backend, model) => hash({ backend_id: backend, model });
const cloudId = id("cloud", "synthetic-cloud"), localId = id("local", "synthetic-local");
function configuration() {
  return { backends: { cloud: { backend_id: "cloud" }, local: { backend_id: "local" } }, models: {
    [cloudId]: { backend_id: "cloud", model: "synthetic-cloud", supported_efforts: ["low", "high"], model_digest: null, runtime_version: "synthetic-native-runtime", verification_ref: "sha256:" + "a".repeat(64) },
    [localId]: { backend_id: "local", model: "synthetic-local", supported_efforts: [null, false, true], model_digest: "synthetic-digest", runtime_version: "synthetic-local-runtime", verification_ref: "sha256:" + "b".repeat(64) },
  }, default: null, overrides: {} };
}
function snapshot(value = configuration(), revision = 1, current = revision) {
  return { revision, current_revision: current, digest: hash(value), configuration: value, history: [{ revision, digest: hash(value) }] };
}
function registry(value = configuration()) {
  return { schema_version: 1, tasks: ["synthetic/task-a", "synthetic/task-b"], backends: [
    { backend_id: "cloud", provider: "codex-app-server", registered: Object.hasOwn(value.backends, "cloud"), allowed_tasks: ["synthetic/task-a"], account_login_supported: true, availability: "not-probed" },
    { backend_id: "local", provider: "ollama", registered: Object.hasOwn(value.backends, "local"), allowed_tasks: ["synthetic/task-a", "synthetic/task-b"], account_login_supported: false, availability: "not-probed" },
  ], configuration: snapshot(value) };
}
const intent = () => ({ schema_version: 1, request_id: "model-operation:synthetic", idempotency_key: "synthetic:submit", expected_configuration_revision: 0, action: "backend.register", input: { backend_id: "local" } });
function completed() {
  const request = intent();
  const command = { command_id: "oos-model:" + hash({ caller: config.callerId, request: request.request_id }).slice(7) + ":1", expected_revision: 0, action: request.action, input: request.input };
  const value = { backends: { local: { backend_id: "local" } }, models: {}, default: null, overrides: {} };
  const receipt = { command_id: command.command_id, command_digest: hash({ actor: config.operatorId, command }), actor: config.operatorId, action: command.action, previous_revision: 0, revision: 1, configuration_digest: hash(value) };
  receipt.receipt_digest = hash(receipt);
  return { schema_version: 1, workflow_id: "model-operations", request_id: request.request_id, revision: 3, request, state: "completed",
    owner_command_id: command.command_id, attempt: 1, owner_receipt: receipt, applied_configuration: snapshot(value, 1, 2), account_login: null, failure: null,
    history: [{ sequence: 1, type: "operator-intent-accepted", state: "queued", occurred_at: "2026-10-24T01:00:00Z" },
      { sequence: 2, type: "owner-dispatch-started", state: "running", occurred_at: "2026-10-24T01:00:01Z" },
      { sequence: 3, type: "owner-readback-verified", state: "completed", occurred_at: "2026-10-24T01:00:02Z" }], next_action: "complete" };
}
function client(payload, calls = []) {
  return createModelRuntimeClient({ config, attribution: () => ({}), fetchImpl: async (url, options) => {
    calls.push({ url, options }); return new Response(JSON.stringify(typeof payload === "function" ? payload() : payload), { status: 200 });
  } });
}

test("cold registry works with no prior request, lifecycle receipt or registered model", async () => {
  const value = registry({ backends: {}, models: {}, default: null, overrides: {} });
  const calls = []; const actual = await client(value, calls).registry();
  assert.deepEqual(actual.configuration.configuration.models, {}); assert.equal(actual.configuration.revision, 1);
  assert.equal(calls[0].url, config.baseUrl + "/v1/model-operations/registry");
  assert.equal(calls[0].options.headers["x-oos-operator-id"], config.operatorId);
  assert.equal(JSON.stringify(actual).includes(config.callerSecret), false);
});
test("configuration digest agrees with independent canonical JSON including Unicode", () => {
  const value = { model: "模型", effort: false, revision: 1 };
  assert.equal(modelRuntimeDigest(value), hash(value));
  assert.throws(() => modelRuntimeDigest({ revision: 1.5 }));
  assert.throws(() => modelRuntimeDigest({ model: "\ud800" }));
});
test("discovery distinguishes unknown native effort metadata from verified registration", async () => {
  const catalogue = { backend_id: "local", models: [{ model: "synthetic-local", supported_efforts: null, model_digest: "synthetic-digest", runtime_version: "synthetic-runtime" }] };
  assert.equal((await client(catalogue).catalogue("local")).models[0].supported_efforts, null);
  await assert.rejects(client({ ...catalogue, token: "not-forwarded" }).catalogue("local"));
});
test("system default eligibility accounts for explicit source and model overrides", () => {
  const value = registry();
  assert.deepEqual(eligibleModelIds(value, defaultModelScope), [localId]);
  value.configuration.configuration.overrides["synthetic/task-b"] = null;
  assert.deepEqual(eligibleModelIds(value, defaultModelScope), [cloudId, localId]);
  assert.deepEqual(eligibleModelIds(value, "synthetic/task-b"), [localId]);
});
test("native boolean effort stays distinct from its string spelling and unsupported values", () => {
  const value = registry();
  const route = { primary: { model_id: localId, effort: false }, fallbacks: [], on_exhausted: "fail-closed" };
  assert.equal(routingDraftIssue(value, "synthetic/task-a", "configured", route), null);
  assert.match(routingDraftIssue(value, "synthetic/task-a", "configured", { ...route, primary: { ...route.primary, effort: "false" } }), /native effort/);
  assert.equal(modelEffortLabel(false), "Thinking off");
});
test("source binding and inherited default remain different and preserve other workflow settings", () => {
  const value = configuration(); value.overrides["synthetic/task-a"] = null;
  assert.equal(readRoutingDraft(value, "synthetic/task-a").mode, "source");
  assert.equal(readRoutingDraft(value, "synthetic/task-b").mode, "inherit");
  const draft = { primary: { model_id: localId, effort: true }, fallbacks: [], on_exhausted: "fail-closed" };
  const input = routingInput(value, "synthetic/task-b", "configured", draft);
  assert.equal(input.overrides["synthetic/task-a"], null);
  assert.equal(input.overrides["synthetic/task-b"].primary.effort, true);
  assert.equal(routingInput({ ...value, overrides: input.overrides }, "synthetic/task-a", "inherit", draft).overrides["synthetic/task-a"], undefined);
});
test("fallback order is explicit and duplicates cannot masquerade as another choice", () => {
  const value = registry(), primary = { model_id: cloudId, effort: "high" }, fallback = { model_id: localId, effort: false };
  const route = { primary, fallbacks: [fallback], on_exhausted: "fail-closed" };
  assert.equal(routingDraftIssue(value, "synthetic/task-a", "configured", route), null);
  assert.match(routingDraftIssue(value, "synthetic/task-a", "configured", { ...route, fallbacks: [primary] }), /duplicate/);
  assertModelRuntimeRequest({ ...intent(), action: "routing.save", input: routingInput(value.configuration.configuration, "synthetic/task-a", "configured", route) });
});
test("requests reject browser identity, credentials, endpoints and policy expansion", () => {
  for (const extra of [{ operator_id: "operator:other" }, { token: "synthetic" }, { endpoint: "https://arbitrary.test" }]) {
    assert.throws(() => assertModelRuntimeRequest({ ...intent(), ...extra }));
    assert.throws(() => assertModelRuntimeRequest({ ...intent(), input: { ...intent().input, ...extra } }));
  }
});
test("real receipt binding validates original request and its historical accepted revision", async () => {
  const value = completed(); const actual = await client(value).submit(intent());
  assert.equal(actual.owner_receipt.revision, 1); assert.equal(actual.applied_configuration.current_revision, 2);
  assert.equal(actual.state, "completed");
});
test("wrong actor, wrong source command, malformed receipt and missing readback fail closed", async () => {
  for (const mutate of [
    value => { value.owner_receipt.actor = "operator:other"; },
    value => { value.owner_command_id = "another-command"; value.owner_receipt.command_id = "another-command"; },
    value => { value.owner_receipt.receipt_digest = "sha256:" + "c".repeat(64); },
    value => { value.applied_configuration = null; },
    value => { value.owner_receipt = null; },
    value => { value.request.input.backend_id = "another-backend"; },
  ]) {
    const value = completed(); mutate(value);
    await assert.rejects(client(value).submit(intent()), error => error.status === 502);
  }
});
test("another request and a changed immutable payload cannot satisfy a lost acknowledgement", () => {
  const value = intent();
  assert.equal(sameModelRuntimeRequest(value, { ...value, input: { backend_id: "local" } }), true);
  assert.equal(sameModelRuntimeRequest(value, { ...value, input: { backend_id: "cloud" } }), false);
});
test("transport loss submits exactly once; model operation is never retried automatically", async () => {
  let count = 0;
  const value = createModelRuntimeClient({ config, attribution: () => ({}), fetchImpl: async () => { count++; throw new Error("synthetic connection loss"); } });
  await assert.rejects(value.submit(intent()), error => error.status === 502);
  assert.equal(count, 1);
});
test("owner rejection messages and oversized responses cannot expose private provider details", async () => {
  const rejected = createModelRuntimeClient({ config, attribution: () => ({}), fetchImpl: async () => new Response(JSON.stringify({ error: "revision-conflict", message: "synthetic-private-provider-value" }), { status: 409 }) });
  await assert.rejects(rejected.submit(intent()), error => error.status === 409 && !error.message.includes("private-provider"));
  const oversized = createModelRuntimeClient({ config, attribution: () => ({}), fetchImpl: async () => new Response("x".repeat(1_048_580)) });
  await assert.rejects(oversized.registry(), error => error.status === 502);
});
test("no provider or profile source secret can be hidden inside an otherwise valid configuration", () => {
  const value = snapshot(); value.configuration.credential = "synthetic";
  assert.throws(() => assertModelConfiguration(value));
});
test("effective choice evidence preserves task outputs and only permits pre-submit fallback before success", () => {
  const evidence = { revision: 2, configuration_digest: "sha256:" + "a".repeat(64), task: "profile/task", selection_ref: "ai-routing-selection:" + "b".repeat(64),
    attempts: [{ backend_id: "cloud", model: "synthetic-cloud", effort: "high", outcome: "provider-unavailable" }, { backend_id: "local", model: "synthetic-local", effort: false, outcome: "suggestion-produced" }] };
  assert.deepEqual(assertEffectiveModelSelection(evidence, "profile/task"), evidence);
  assert.throws(() => assertEffectiveModelSelection(evidence, "other/task"));
  assert.throws(() => assertEffectiveModelSelection({ ...evidence, token: "synthetic" }, "profile/task"));
  const unknown = structuredClone(evidence); unknown.attempts[0].outcome = "provider-completion-unknown";
  assert.throws(() => assertEffectiveModelSelection(unknown, "profile/task"));
});
