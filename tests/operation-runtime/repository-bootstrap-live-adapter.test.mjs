import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { assertCanonicalSourceRequest, canonicalSourceResponse } from "../support/console-source-projection.mjs";
import { bootstrapCanonicalDigest as digest, prepareRepositoryBootstrap, listRepositoryBootstraps, readRepositoryBootstrap,
  readRepositoryBootstrapDraft, commandRepositoryBootstrap } from "../../src/domain-workspaces/repository/server/repository-bootstrap-oos-client.ts";
import { ownerBootstrapFiles } from "../../src/domain-workspaces/repository/live-runtime/repository-bootstrap-contract.ts";
const time = "2026-10-19T01:00:00.000Z", later = "2026-10-19T01:01:00.000Z", id = "bootstrap-request:fixture", owner = "example-owner";
const config = { baseUrl: "http://127.0.0.1:8080", callerId: "governance-operations-console", callerSecret: "test-server-only-secret", operatorId: "operator:owner" };
const source = "source-intent:fixture", recordRef = `oos://repository-owner-bootstrap/requests/${id}`;
function raw() { return { schema_version: 1, workflow_id: "repository-owner-bootstrap", request_id: id, owner_repo: owner, state: "source-work", revision: later,
  created_at: time, updated_at: later, session_id: "repository-bootstrap-session:fixture", source_intent_ref: source, source_start_digest: digest("start"),
  next_action: { code: "owner-bootstrap-draft-acceptance-required", authority: "operator-orchestration-service" }, source_delivery: {},
  draft: { state: "draft-ready", digest: digest(change()), revision: time }, app_acceptance: false, inventory_admission: false, runtime_activation: false,
  private_fixture_diagnostic: "not-projected" }; }
function change() { return { schema_version: 1, session_id: "repository-bootstrap-session:fixture", operations: [{ action: "create", path: "AGENTS.md", content: "# Inert fixture controls\n", expected_digest: null }] }; }
function intent(action, extra = {}) { return { action, expectedRevision: time, commandId: "browser:fixture", requestedAt: later, sourceIntentRef: source, acceptedDigest: null, reason: null, ...extra }; }
const response = (value, suffix = "") => canonicalSourceResponse(value, { recordRef: `${recordRef}${suffix}`, sourceOwner: "operator-orchestration-service" });

test("repository bootstrap GET requires negotiated current authority and curates source metadata", async () => {
  const result = await readRepositoryBootstrap(id, { config, fetchImpl: async (url, init) => {
    assert.equal(String(url).endsWith(encodeURIComponent(id)), true); assertCanonicalSourceRequest(init);
    assert.equal(init.redirect, "error"); assert.equal(init.headers["x-oos-operator-id"], config.operatorId); return response(raw());
  } });
  assert.equal(result.sourceRevision, time); assert.equal(result.revision, later);
  assert.doesNotMatch(JSON.stringify(result), /not-projected|test-server-only-secret/);
  await assert.rejects(readRepositoryBootstrap(id, { config, fetchImpl: async () => Response.json(raw()) }));
  await assert.rejects(readRepositoryBootstrap(id, { config, fetchImpl: async () => response({ ...raw(), app_acceptance: true }) }));
  await assert.rejects(readRepositoryBootstrap(id, { config, fetchImpl: async () => canonicalSourceResponse(raw(), { recordRef, sourceOwner: "fixture" }) }));
});
test("cold list keeps the actual off-page pending request without source bodies", async () => {
  const body = { schema_version: 1, workflow_id: "repository-owner-bootstrap-list", owner_repo: owner, pending_request: raw(), records: [] };
  const result = await listRepositoryBootstraps(owner, { config, fetchImpl: async () => canonicalSourceResponse(body, { recordRef: `oos://repository-owner-bootstrap/${owner}`, sourceOwner: "operator-orchestration-service" }) });
  assert.equal(result.pendingRequest.requestId, id); assert.equal(result.records.length, 0);
});
test("trusted draft is bound to the source revision, exact digest, real session and finite create-only files", async () => {
  const body = { schema_version: 1, workflow_id: "repository-owner-bootstrap-draft", request_id: id, revision: time, digest: digest(change()), change_set: change() };
  const options = { config, fetchImpl: async url => String(url).endsWith("/draft") ? response(body, "/draft") : response(raw()) };
  assert.equal((await readRepositoryBootstrapDraft(id, options)).digest, body.digest);
  body.change_set.operations[0].path = "app/main.mjs"; body.digest = digest(body.change_set);
  await assert.rejects(readRepositoryBootstrapDraft(id, options));
});
test("uncertain publication reuses the original retained command across a newer request revision", async () => {
  const value = raw(), original = { schema_version: 1, command_id: "command:original", expected_revision: time, requested_at: time, expected_pull_request: null };
  value.source_delivery.publish = { state: "unknown", command_id: original.command_id, command: original, command_digest: digest(original) };
  let sent;
  await commandRepositoryBootstrap(id, intent("publish", { expectedRevision: later }), { config, fetchImpl: async (_url, init) => {
    if (init.method === "POST") { sent = JSON.parse(init.body); return Response.json({}); } return response(value);
  } });
  assert.deepEqual(sent.command, original); assert.equal(sent.source_intent_ref, source);
});
test("uncertain existing checkout and cancellation use their retained commands rather than a new UI timestamp", async () => {
  for (const action of ["existing-checkout", "cancel-unapplied"]) {
    const value = raw(); value.session_id = null; value.draft = null;
    const original = { schema_version: 1, command_id: "command:original", expected_revision: time, requested_at: time,
      ...(action === "cancel-unapplied" ? { reason: "Withdraw the unchanged original unapplied repository setup." } : {}) };
    value[action === "existing-checkout" ? "existing_checkout" : "cancellation"] = { state: "unknown", command: original, command_digest: digest(original) };
    let sent;
    await commandRepositoryBootstrap(id, intent(action, { expectedRevision: later, reason: "Recover the original cancellation without replacing its bound source." }), { config, fetchImpl: async (_url, init) => {
      if (init.method === "POST") { sent = JSON.parse(init.body); return Response.json({}); } return response(value);
    } });
    assert.deepEqual(sent, original);
  }
});
test("terminal requests and stale reviewed state cannot dispatch replacement source work", async () => {
  for (const state of ["succeeded", "cancelled", "source-work"]) {
    let writes = 0;
    const operation = commandRepositoryBootstrap(id, intent("publish", { expectedRevision: later }), { config, fetchImpl: async (_url, init) => {
      if (init.method === "POST") writes++; return response({ ...raw(), state });
    } });
    if (state === "source-work") await assert.rejects(operation, /changed after review/); else assert.equal((await operation).state, state);
    assert.equal(writes, 0);
  }
});
test("preparation derives operator decision server-side and verifies raw-byte template file digests", async () => {
  const selected = { ownerRepo: owner, custodyRequestId: "custody:fixture", evidenceProfile: { owner_repo: owner }, applicationMarkers: ["app/main.mjs"], withCi: false, nonce: "review:fixture" };
  const prepare = async (url, init) => {
    const input = JSON.parse(init.body); assert.equal(Object.hasOwn(input, "operator_id"), false); assert.match(input.decision_ref, /^console-bootstrap:/);
    const files = ownerBootstrapFiles.slice(0, 9).map(path => ({ path, action: "create", mode: "100644", content: "# inert fixture\n", expected_digest: null, content_digest: `sha256:${createHash("sha256").update("# inert fixture\n").digest("hex")}` }));
    const plan = { owner_repo: owner, ci_selected: false, files, model_invoked: false, app_import: false, canonical_mutation: false, runtime_activation: false };
    const body = { schema_version: 1, workflow_id: "repository-owner-bootstrap-preparation", caller_id: config.callerId, operator_id: config.operatorId,
      custody_request_id: input.custody_request_id, decision_ref: input.decision_ref, authorization: "preparation-only", credential_issued: false, checkout_created: false,
      canonical_mutation: false, runtime_activation: false, owner_authority: { owner_repo: owner, classification: "proposed", inventory_posture: null, source_bootstrap_eligible: true,
        ordinary_source_eligible: false, model_writes_allowed: false, canonical_mutation: false, runtime_activation: false }, plan: { ...plan, plan_digest: digest(plan) } };
    return Response.json({ ...body, preparation_digest: digest(body) });
  };
  assert.equal((await prepareRepositoryBootstrap(selected, { config, fetchImpl: prepare })).plan.files.length, 9);
  await assert.rejects(prepareRepositoryBootstrap({ ...selected, operatorId: "attacker" }, { config, fetchImpl: prepare }), /unauthorized fields/);
});
test("provider failures and oversized responses never expose private diagnostics", async () => {
  await assert.rejects(readRepositoryBootstrap(id, { config, fetchImpl: async () => Response.json({ message: "private provider detail" }, { status: 503 }) }), error => !error.message.includes("private provider"));
  await assert.rejects(readRepositoryBootstrap(id, { config, fetchImpl: async () => new Response("x".repeat(1_048_577)) }), error => error.code === "repository_bootstrap_response_large");
});
