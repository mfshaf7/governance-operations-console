import assert from "node:assert/strict";
import test from "node:test";
import {
  providerPresets, experimentalQualification, assertProviderConnections, assertSafeConnectionCommand,
  safeCredentialCommand, assertConnectionOperation,
} from "../../src/domain-workspaces/model-operations/work-model/provider-connections-contract.ts";
import { assertModelRegistry, assertModelCatalogue } from "../../src/domain-workspaces/model-operations/work-model/model-runtime-contract.ts";
import { createModelRuntimeClient, modelRuntimeDigest as digest } from "../../src/domain-workspaces/model-operations/server/model-runtime-oos-client.ts";

const config = { baseUrl: "http://synthetic-oos.test", callerId: "synthetic-console", callerSecret: "synthetic-secret", operatorId: "operator:synthetic" };
const maturity = { experimental: true, qualification: experimentalQualification };
const connectionId = "api-" + "a".repeat(32);
const command = { command_id: "connection:synthetic-create", expected_revision: 0, action: "connection.create", input: { provider: "claude-api", name: "Synthetic connection" } };
const ingress = { command_id: "connection:synthetic-credential", expected_revision: 1, connection_id: connectionId, api_key: "synthetic-key-for-controlled-tests" };
function snapshot() {
  return { revision: 1, presets: Object.entries(providerPresets).map(([provider, value]) => ({ provider, label: value.label, endpoint_origin: value.origin, catalogue_supported: provider !== "glm-api", ...maturity })),
    connections: [{ connection_id: connectionId, provider: "claude-api", name: "Synthetic connection", state: "active", credential_generation: null,
      credential_present: false, pending_operation: null, updated_at: "2026-10-30T00:00:00Z", ...maturity }] };
}
function receipt(command, previous = command.expected_revision) {
  const value = { command_id: command.command_id, command_digest: digest({ actor: config.operatorId, command }), actor: config.operatorId, action: command.action,
    connection_id: command.action === "connection.create" ? "api-" + digest({ actor: config.operatorId, command: command.command_id }).slice(7, 39) : command.input.connection_id,
    previous_revision: previous, revision: previous + 1, state_digest: "sha256:" + "b".repeat(64) };
  return { ...value, receipt_digest: digest(value) };
}
function client(payload, calls = []) {
  return createModelRuntimeClient({ config, attribution: () => ({}), fetchImpl: async (url, options) => {
    calls.push({ url, options }); return new Response(JSON.stringify(payload), { status: 200 });
  } });
}
test("all presets and connections retain Experimental independently of credential presence", async () => {
  const value = snapshot();
  assert.equal((await client(value).connections()).presets.length, 3);
  for (const target of [value.presets[0], value.connections[0]]) {
    target.experimental = false; assert.throws(() => assertProviderConnections(value)); target.experimental = true;
    target.qualification = "qualified"; assert.throws(() => assertProviderConnections(value)); target.qualification = experimentalQualification;
  }
  value.connections[0].credential_generation = "sha256:" + "c".repeat(64); value.connections[0].credential_present = true;
  assert.equal(assertProviderConnections(value).connections[0].experimental, true);
  value.presets[0].endpoint_origin = "https://synthetic-redirect.test"; assert.throws(() => assertProviderConnections(value));
});
test("recovery shapes reject raw keys and owner projections reject secret-bearing extra fields", async () => {
  const safe = safeCredentialCommand(ingress);
  assert.deepEqual(safe.input, { connection_id: connectionId });
  assert.equal(JSON.stringify(safe).includes(ingress.api_key), false);
  assert.throws(() => assertSafeConnectionCommand(ingress));
  assert.throws(() => assertSafeConnectionCommand({ ...safe, input: { ...safe.input, api_key: ingress.api_key } }));
  for (const key of ["short", "trailing-space ", "line\nbreak", "é-invalid"]) assert.throws(() => safeCredentialCommand({ ...ingress, api_key: key }));
  const value = snapshot(); value.connections[0].api_key = ingress.api_key;
  await assert.rejects(client(value).connections(), error => !error.message.includes(ingress.api_key));
});
test("dedicated key ingress is sent once without redirects and receipt hash excludes key material", async () => {
  const safe = safeCredentialCommand(ingress), calls = [];
  const result = await client(receipt(safe), calls).connectionCredentials(ingress);
  assert.equal(calls.length, 1); assert.equal(calls[0].url, config.baseUrl + "/v1/model-operations/connections/credentials");
  assert.equal(calls[0].options.redirect, "error"); assert.equal(JSON.parse(calls[0].options.body).api_key, ingress.api_key);
  assert.equal(result.command_digest, digest({ actor: config.operatorId, command: safe }));
  assert.equal(JSON.stringify(result).includes(ingress.api_key), false);
  await assert.rejects(client(result).connectionCommand(safe));
  let attempts = 0;
  const unavailable = createModelRuntimeClient({ config, attribution: () => ({}), fetchImpl: async () => { attempts++; throw new Error(ingress.api_key); } });
  await assert.rejects(unavailable.connectionCredentials(ingress), error => !error.message.includes(ingress.api_key));
  assert.equal(attempts, 1);
});
test("receipt validation binds operator, complete command, resulting identity and canonical digest", async () => {
  const accepted = receipt(command); assert.equal((await client(accepted).connectionCommand(command)).revision, 1);
  for (const patch of [{ actor: "operator:another" }, { action: "connection.disconnect" }, { connection_id: connectionId }, { command_digest: "sha256:" + "e".repeat(64) }, { revision: 3 }]) {
    const changed = { ...accepted, ...patch }; changed.receipt_digest = digest(changed, "receipt_digest");
    await assert.rejects(client(changed).connectionCommand(command));
  }
  const safe = safeCredentialCommand(ingress);
  // Another connection may advance registry revision while Vault acknowledges.
  assert.equal((await client(receipt(safe, 4)).connectionCredentials(ingress)).revision, 5);
});
test("recovery reads original owner effect and never resubmits a key", async () => {
  const safe = safeCredentialCommand(ingress), calls = [], accepted = receipt(safe);
  const operation = { command_id: safe.command_id, command_digest: accepted.command_digest, actor: config.operatorId,
    action: safe.action, connection_id: connectionId, state: "finished", receipt: accepted };
  assert.equal((await client(operation, calls).connectionOperation(safe.command_id)).state, "finished");
  assert.equal((await client(operation, calls).reconcileConnection({ command_id: safe.command_id })).receipt.revision, 2);
  assert.equal(calls[0].options.method, "GET"); assert.equal(calls[1].url.endsWith("/connections/reconcile"), true);
  assert.deepEqual(JSON.parse(calls[1].options.body), { command_id: safe.command_id });
  assert.equal(JSON.stringify(calls).includes(ingress.api_key), false);
  assert.throws(() => assertConnectionOperation({ ...operation, state: "pending" }, safe.command_id));
  await assert.rejects(client({ ...operation, actor: "operator:another" }).connectionOperation(safe.command_id));
  assert.equal(assertConnectionOperation({ ...operation, state: "cancelled", receipt: null }, safe.command_id).state, "cancelled");
});
test("API backend controls and unknown cloud metadata remain explicit without weakening built-in shape", () => {
  const configuration = { backends: {}, models: {}, default: null, overrides: {} };
  const value = { schema_version: 1, tasks: ["synthetic/task"], configuration: { revision: 0, current_revision: 0, digest: digest(configuration), configuration, history: [{ revision: 0, digest: digest(configuration) }] },
    backends: [{ backend_id: connectionId, provider: "glm-api", allowed_tasks: ["synthetic/task"], registered: false, account_login_supported: false, availability: "not-probed",
      ...maturity, catalogue_supported: false, verification_max_tokens: 4096 }] };
  assert.equal(assertModelRegistry(value).backends[0].catalogue_supported, false);
  const catalogue = { backend_id: connectionId, models: [{ model: "synthetic-model", runtime_version: null, model_digest: null, supported_efforts: [null] }] };
  assert.equal(assertModelCatalogue(catalogue, connectionId).models[0].runtime_version, null);
  delete value.backends[0].experimental; assert.throws(() => assertModelRegistry(value));
});
