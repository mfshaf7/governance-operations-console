import assert from "node:assert/strict";
import test from "node:test";
import { completionEvidence, assertCompletionContext } from "../../src/domain-workspaces/delivery/live-runtime/delivery-item-completion-contract.ts";
import { readItemCompletionContext, submitItemCompletion } from "../../src/domain-workspaces/delivery/server/delivery-item-completion-client.ts";
import { canonicalSourceResponse } from "../support/console-source-projection.mjs";

const env = { OOS_BASE_URL: "http://127.0.0.1:8080", OOS_CALLER_ID: "governance-operations-console", OOS_CALLER_SECRET: "test-only", GOVERNANCE_CONSOLE_OPERATOR_ID: "operator:test-owner" };
const evidence = {
  completion_summary: "The native owner transfer and registration are complete.",
  changed_surfaces: "- Native owner records: transferred reviewed custody and registered the admitted product; source files are unchanged.",
  test_result_evidence: "- PASS: Independent browser recovered the original owner receipt without a write.",
  validation_evidence: "- PASS: Canonical owner readback and receipt confirm the completed domain outcome.",
};

function owner({ activeSource = false, foreignContext = false, done = false, badPost = false } = {}) {
  const calls = [];
  let updated = "2026-01-01T00:00:00.000Z";
  const options = { env, fetchImpl: async (url, init) => {
    calls.push({ method: init.method, path: new URL(url).pathname, body: init.body ? JSON.parse(init.body) : null });
    if (url.endsWith("/work-session")) return canonicalSourceResponse({
      workflow_id: "delivery-art-work-session", delivery_id: "delivery-40", work_item_id: "work-item-42",
      session_id: activeSource ? "session:test" : null, session_revision: activeSource ? updated : null,
      landing_unit_id: activeSource ? "landing:test" : null, state: activeSource ? "source-work" : "decision-required", next_action: null,
    }, { recordRef: "openproject://work_packages/42", sourceOwner: "workspace-delivery-art" });
    if (url.endsWith("/continuation-context")) return Response.json({
      workflow_id: "delivery-work-item-continuation-context", work_item_id: "work-item-42", work_item_record_ref: "openproject://work_packages/42",
      continuation_context: { target_item: { id: foreignContext ? 43 : 42, record_ref: "openproject://work_packages/42", subject: "Accept the native transfer", type: "User story",
        status: done ? "done" : "new", owner_repo: "example-owner", updated_at: updated,
        blocked: false, dependency_blocked: false, ready_contract_satisfied: true, completion_narrative_contract_satisfied: true,
        completion_status_transition_available: !done, completion_evidence_present: done, completion_evidence_formatting_valid: done }, summary: { open_descendant_count: 0, open_child_count: 0, completed_related_count: 1 } },
    });
    assert.ok(url.endsWith("/complete") || url.endsWith("/stale-open-close"));
    done = true;
    return Response.json({ workflow_id: url.endsWith("/complete") ? "delivery-work-item-complete" : "delivery-work-item-stale-open-close", work_item_id: "work-item-42", work_item_record_ref: "openproject://work_packages/42",
      work_item: { id: badPost ? 43 : 42, status: "done" } });
  } };
  return { calls, options, changeRevision() { updated = "2026-01-01T00:01:00.000Z"; } };
}

test("non-source completion uses native context, one ordinary completion and canonical readback without source actions", async () => {
  const runtime = owner();
  const context = await readItemCompletionContext(42, runtime.options);
  const result = await submitItemCompletion(42, { expectedRevision: context.revision, nonSourceConfirmed: true, evidence }, runtime.options);
  assert.equal(result.outcome, "recorded"); assert.equal(result.context.status, "done"); assert.equal(result.context.completion_evidence_valid, true);
  const writes = runtime.calls.filter(call => call.method === "POST");
  assert.deepEqual(writes, [{ method: "POST", path: "/v1/delivery-work-items/42/complete", body: { input: evidence } }]);
  assert.ok(runtime.calls.every(call => !/start|merge|close|grant/.test(call.path)));
});

test("active source sessions and changed canonical target cannot use non-source completion", async () => {
  for (const activeSource of [false, true]) {
    const runtime = owner({ activeSource }); const context = await readItemCompletionContext(42, runtime.options);
    if (!activeSource) runtime.changeRevision();
    await assert.rejects(submitItemCompletion(42, { expectedRevision: context.revision, nonSourceConfirmed: true, evidence }, runtime.options), /source session|target changed/);
    assert.equal(runtime.calls.filter(call => call.method === "POST").length, 0);
  }
});

test("foreign owner context and foreign completion response never become success", async () => {
  await assert.rejects(readItemCompletionContext(42, owner({ foreignContext: true }).options), /different work item/);
  const runtime = owner({ badPost: true }); const context = await readItemCompletionContext(42, runtime.options);
  await assert.rejects(submitItemCompletion(42, { expectedRevision: context.revision, nonSourceConfirmed: true, evidence }, runtime.options), /unconfirmed/);
});

test("a cold read recovers existing canonical completion and does not repeat the write", async () => {
  const runtime = owner({ done: true }); const context = await readItemCompletionContext(42, runtime.options);
  assert.equal(context.status, "done");
  const result = await submitItemCompletion(42, { expectedRevision: context.revision, nonSourceConfirmed: true, evidence }, runtime.options);
  assert.equal(result.outcome, "already-complete"); assert.equal(runtime.calls.filter(call => call.method === "POST").length, 0);
});

test("evidence and explicit review fail before native mutation; no invented mandatory source file or optional note", async () => {
  assert.equal(completionEvidence(evidence).completion_note, "");
  assert.throws(() => completionEvidence({ ...evidence, test_result_evidence: "passed somehow" }), /bullet prefixes/);
  assert.throws(() => completionEvidence({ ...evidence, source_credential: "not-accepted" }), /evidence prose only/);
  const runtime = owner(); const context = await readItemCompletionContext(42, runtime.options);
  await assert.rejects(submitItemCompletion(42, { expectedRevision: context.revision, nonSourceConfirmed: false, evidence }, runtime.options), /Confirm/);
  await assert.rejects(submitItemCompletion(42, { expectedRevision: context.revision, nonSourceConfirmed: true, evidence, route: ["complete"] }, runtime.options), /existing native/);
  assert.throws(() => assertCompletionContext({ ...context, can_complete: true, source_session_active: true }), /contradicts/);
  assert.equal(runtime.calls.filter(call => call.method === "POST").length, 0);
});

test("completed-parent reconciliation uses the existing stale-open route and explicit justification", async () => {
  const runtime = owner(); const context = await readItemCompletionContext(42, runtime.options);
  const request = { expectedRevision: context.revision, nonSourceConfirmed: true, evidence, route: "stale-open-close" };
  await assert.rejects(submitItemCompletion(42, request, runtime.options), /explicit operator justification/);
  assert.equal(runtime.calls.filter(call => call.method === "POST").length, 0);
  const result = await submitItemCompletion(42, { ...request, staleOpenJustification: "Actual completed descendants satisfy the reviewed parent outcome." }, runtime.options);
  assert.equal(result.outcome, "recorded");
  const write = runtime.calls.find(call => call.method === "POST");
  assert.equal(write.path, "/v1/delivery-work-items/42/stale-open-close");
  assert.equal(write.body.input.stale_open_justification, "Actual completed descendants satisfy the reviewed parent outcome.");
});

test("native paragraph and flat-bullet formats reject the actual input miss before any request", () => {
  assert.throws(() => completionEvidence({ ...evidence, completion_summary: "- This outcome completed." }), /paragraph format/);
  assert.throws(() => completionEvidence({ ...evidence, changed_surfaces: "Product admission completed with its actual receipt." }), /flat bullets/);
  assert.equal(completionEvidence(evidence).changed_surfaces, evidence.changed_surfaces);
});

test("native ART can outlast the generic window and still return its actionable owner rejection", async t => {
  t.mock.method(AbortSignal, "timeout", ms => ms > 12_000
    ? new AbortController().signal : AbortSignal.abort(new DOMException("Generic request window elapsed", "TimeoutError")));
  const runtime = owner(); const read = runtime.options.fetchImpl; let writes = 0;
  const options = { ...runtime.options, fetchImpl: async (url, init) => {
    init.signal.throwIfAborted();
    if (init.method === "POST") {
      writes++;
      return Response.json({ code: "completion_evidence_invalid", error: "Changed surface paths must be code-formatted or markdown-linked." }, { status: 422 });
    }
    return read(url, init);
  } };
  const context = await readItemCompletionContext(42, options);
  await assert.rejects(submitItemCompletion(42, { expectedRevision: context.revision, nonSourceConfirmed: true, evidence }, options),
    error => error.code === "completion_evidence_invalid" && error.status === 422 && /code-formatted/.test(error.message));
  assert.equal(writes, 1);
});
