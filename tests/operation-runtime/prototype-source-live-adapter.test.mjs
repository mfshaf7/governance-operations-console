import assert from "node:assert/strict";
import test from "node:test";
import { assertPrototypeSourceIntent, assertPrototypeSourceRequest, projectPrototypeSource, projectPrototypeSourceSummary } from "../../src/domain-workspaces/prototype/live-runtime/prototype-source-contract.ts";
import { buildPrototypeSourceCommand, createPrototypeSource, listPrototypeSources, readPrototypeSource, readPrototypeSourceDraft } from "../../src/domain-workspaces/prototype/server/prototype-source-oos-client.ts";
import { prototypeCanonicalDigest as digest } from "../../src/domain-workspaces/prototype/server/prototype-landing-oos-client.ts";
import { assertCanonicalSourceRequest, canonicalSourceResponse } from "../support/console-source-projection.mjs";

const commit = "a".repeat(40), requestId = "prototype-source-request:example:1", sessionId = "prototype-source-session:example";
const time = "2026-10-18T15:00:00.000Z", later = "2026-10-18T15:01:00.000Z";
const config = { baseUrl: "http://127.0.0.1:8080", callerId: "governance-operations-console", callerSecret: "server-only-test-secret", operatorId: "operator:owner" };
const sourceIntent = "source-intent:example/authoring+1";
const request = () => ({ schema_version: 1, request_id: requestId, prototype_id: "prototype:example", expected_registry_revision: commit, expected_source_revision: commit, objective: "Draft a synthetic example application.", requested_at: time });
const command = () => ({ schema_version: 1, command_id: "prototype-command:original", expected_revision: time, requested_at: time, expected_pull_request: null });
const changeSet = () => ({ schema_version: 1, change_set_id: "prototype-draft:1", session_id: sessionId, base_commit: commit, objective_digest: digest(request().objective), commit_message: "feat: draft example application", operations: [{ action: "create", path: "prototypes/example/index.html", content: "<script>inert()</script>", expected_digest: null }] });
function raw(state = "draft-ready") {
  const change = changeSet();
  return { schema_version: 1, workflow_id: "prototype-source-authoring", request_id: requestId, prototype_id: "prototype:example", session_id: sessionId,
    state: "source-work", created_at: time, updated_at: later, source_start_digest: digest("start"),
    subject: { kind: "prototype", prototype_id: "prototype:example", registry_ref: "record://prototypes/example", registry_revision: commit, source_ref: "repo://workspace-prototype-studio/prototypes/example", source_revision: commit },
    source_scope: { source_root: "prototypes/example", design_profile: "docs/prototypes/example/design-profile.md" },
    landing_unit: { landing_unit_id: "prototype-authoring-example", branch: "feature/prototype-example", fetched_base: commit },
    next_action: { authority: "operator-orchestration-service", code: "prototype-source-acceptance-required" }, canonical_mutation: false, runtime_activation: false,
    source_request: request(), source_intent_ref: sourceIntent, source_delivery: {},
    realization: { schema_version: 1, workflow_id: "prototype-source-realization", session_id: sessionId, revision: later, state, replayed: false,
      attempt: { request: { schema_version: 1, request_id: "prototype-generation:original", execution_id: "prototype-execution:original", expected_revision: time, requested_at: time, budget_tokens: 4000, retry_of: null, source_intent_ref: sourceIntent },
        request_id: "prototype-generation:original", execution_id: "prototype-execution:original", retry_of: null, state, objective_digest: change.objective_digest,
        context: { packet_ref: "/v1/context/packets/example", private_extra: "not-projected" }, model: { profile_id: "prototype-source-authoring-v1", private_extra: "not-projected" }, failure: null,
        change_set: { digest: digest(change), commit_message: change.commit_message, operations: change.operations.map(({ content, ...operation }) => ({ ...operation, content_digest: digest(content) })) }, source_receipt: null } } };
}
const intent = (action, extra = {}) => ({ action, commandId: "browser:1", requestedAt: later, expectedRevision: later, sourceIntentRef: sourceIntent, ...extra });
function response(value, suffix = "") { return canonicalSourceResponse(value, { recordRef: `oos://prototype-source-requests/${requestId}${suffix}`, sourceOwner: "operator-orchestration-service" }); }

test("Prototype source reads negotiate canonical source envelopes and curate owner fields", async () => {
  const source = raw();
  const projected = await readPrototypeSource(requestId, { config, fetchImpl: async (url, init) => {
    assert.equal(url.endsWith(encodeURIComponent(requestId)), true); assertCanonicalSourceRequest(init);
    assert.equal(init.headers["x-oos-operator-id"], config.operatorId); assert.equal(init.headers["x-oos-caller-secret"], config.callerSecret);
    return response(source);
  } });
  assert.equal(projected.realization.attempt.context_packet_ref, "/v1/context/packets/example");
  assert.doesNotMatch(JSON.stringify(projected), /not-projected|server-only-test-secret/);
});
test("configured-live source reads reject legacy JSON, stale envelopes and wrong owner", async () => {
  await assert.rejects(readPrototypeSource(requestId, { config, fetchImpl: async () => Response.json(raw()) }));
  await assert.rejects(readPrototypeSource(requestId, { config, fetchImpl: async () => canonicalSourceResponse(raw(), { recordRef: `oos://prototype-source-requests/${requestId}`, sourceOwner: "operator-orchestration-service" }, { freshnessState: "stale" }) }));
  await assert.rejects(readPrototypeSource(requestId, { config, fetchImpl: async () => canonicalSourceResponse(raw(), { recordRef: `oos://prototype-source-requests/${requestId}`, sourceOwner: "fixture" }) }));
});
test("create reconciles its exact immutable request rather than trusting a write acknowledgement", async () => {
  const seen = [];
  const result = await createPrototypeSource(request(), { config, fetchImpl: async (_url, init) => {
    seen.push(init); return init.method === "POST" ? Response.json({}) : response(raw());
  } });
  assert.deepEqual(JSON.parse(seen[0].body), request()); assert.equal(result.request_id, requestId);
  assert.throws(() => assertPrototypeSourceRequest({ ...request(), repository: "other/owner" }));
  assert.throws(() => assertPrototypeSourceRequest({ ...request(), objective: "é".repeat(9000) }));
});
test("native source list is bounded metadata, never draft material", async () => {
  const { source_request, source_delivery, source_intent_ref, realization, ...summary } = raw();
  const result = await listPrototypeSources({ config, fetchImpl: async (url, init) => {
    assert.equal(url.endsWith("?limit=200"), true); assertCanonicalSourceRequest(init);
    return canonicalSourceResponse({ workflow_id: "prototype-source-authoring-list", requests: [summary] }, { recordRef: "oos://prototype-source-requests", sourceOwner: "operator-orchestration-service" });
  } });
  assert.equal(result.length, 1); assert.equal(Object.hasOwn(result[0], "realization"), false);
});
test("source subject and model scope must name the same actual Prototype", () => {
  const source = raw(); source.subject.prototype_id = "prototype:other"; assert.throws(() => projectPrototypeSourceSummary(source));
  source.subject.prototype_id = "prototype:example"; source.source_scope.source_root = "prototypes/other"; assert.throws(() => projectPrototypeSourceSummary(source));
});
test("acceptance binds the operator-inspected revision and exact digest", () => {
  const source = projectPrototypeSource(raw()), accepted = source.realization.attempt.change_set.digest;
  assert.equal(buildPrototypeSourceCommand(source, intent("accept", { acceptedChangeSetDigest: accepted })).command.accepted_change_set_digest, accepted);
  assert.throws(() => buildPrototypeSourceCommand(source, intent("accept", { acceptedChangeSetDigest: digest("different") })));
  assert.throws(() => buildPrototypeSourceCommand(source, intent("accept", { acceptedChangeSetDigest: accepted, expectedRevision: time })));
  assert.throws(() => assertPrototypeSourceIntent({ ...intent("accept"), acceptedChangeSetDigest: accepted, operatorId: "someone-else" }));
});
test("cold interrupted generation reuses original time, execution, revision and retry identity", () => {
  const source = projectPrototypeSource(raw("accepted")), successor = "source-intent:explicit-successor";
  const result = buildPrototypeSourceCommand(source, intent("generate", { sourceIntentRef: successor }));
  assert.deepEqual(result, { ...source.realization.attempt.request, source_intent_ref: successor });
  assert.equal(result.requested_at, time); assert.equal(result.expected_revision, time);
});
test("unknown publication replays its original exact control rather than current time or revision", async () => {
  const source = raw("source-created"), original = command();
  source.source_delivery.publish = { command: original, command_id: original.command_id, command_digest: digest(original), state: "unknown", requested_at: time, failure: null };
  const projected = await readPrototypeSource(requestId, { config, fetchImpl: async () => response(source) });
  const result = buildPrototypeSourceCommand(projected, intent("publish")); assert.deepEqual(result.command, original);
  source.source_delivery.publish.command.expected_revision = later;
  await assert.rejects(readPrototypeSource(requestId, { config, fetchImpl: async () => response(source) }), /immutable command digest/);
});
test("draft reads verify full native change-set digest and current scope and session", async () => {
  const source = raw(), change = changeSet();
  const draft = { schema_version: 1, workflow_id: "prototype-source-draft", request_id: requestId, session_id: sessionId, revision: later, digest: digest(change), accepted: false, change_set: change };
  const options = { config, fetchImpl: async url => String(url).endsWith("/draft") ? response(draft, "/draft") : response(source) };
  assert.equal((await readPrototypeSourceDraft(requestId, options)).change_set.operations[0].content, "<script>inert()</script>");
  change.operations[0].content = "changed"; await assert.rejects(readPrototypeSourceDraft(requestId, options), /digest/);
});
test("forged source receipts and sibling source operations fail before browser projection", async () => {
  const source = raw("source-created"); source.realization.attempt.source_receipt = { outcome: "committed", session_id: sessionId, head_commit: commit, change_set_digest: source.realization.attempt.change_set.digest, receipt_digest: digest("false") };
  await assert.rejects(readPrototypeSource(requestId, { config, fetchImpl: async () => response(source) }), /receipt integrity/);
  source.realization.attempt.source_receipt = null; source.realization.attempt.change_set.operations[0].path = "prototypes/other/index.html";
  await assert.rejects(readPrototypeSource(requestId, { config, fetchImpl: async () => response(source) }), /escapes/);
});
