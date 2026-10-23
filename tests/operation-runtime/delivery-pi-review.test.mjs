import assert from "node:assert/strict";
import test from "node:test";
import { readItemCompletionContext, submitItemPiReview } from "../../src/domain-workspaces/delivery/server/delivery-item-completion-client.ts";
import { assertCompletionContext, itemPiReview } from "../../src/domain-workspaces/delivery/live-runtime/delivery-item-completion-contract.ts";
import { canonicalSourceResponse } from "../support/console-source-projection.mjs";

const env = { OOS_BASE_URL: "http://127.0.0.1:8080", OOS_CALLER_ID: "governance-operations-console", OOS_CALLER_SECRET: "test-only", GOVERNANCE_CONSOLE_OPERATOR_ID: "operator:test-owner" };
const review = { actualBusinessValue: 8, reviewOutcome: "Met", reviewNote: "Actual accepted product and original owner receipts were independently verified." };
function owner({ activeSource = false, wrongMetadata = false, wrongResult = false, lostResponse = false, reject = false, already = false } = {}) {
  const calls = [];
  let actual = already ? 8 : null, outcome = already ? "Met" : null, updated = "2026-01-01T00:00:00.000Z";
  function node() { return { id: wrongMetadata ? 43 : 42, record_ref: "openproject://work_packages/42", type: "PI Objective", subject: "Deliver an actual product", status: "new", updated_at: updated,
    target_pi: "PI-A", planned_business_value: 8, actual_business_value: actual, pi_objective_review_outcome: outcome, children: [] }; }
  const options = { env, fetchImpl: async (url, init) => {
    const path = new URL(url).pathname; calls.push({ path, method: init.method, body: init.body ? JSON.parse(init.body) : null });
    if (path.endsWith("/work-session")) return canonicalSourceResponse({ workflow_id: "delivery-art-work-session", delivery_id: "delivery-40", work_item_id: "work-item-42",
      session_id: activeSource ? "session:test" : null, session_revision: activeSource ? updated : null, landing_unit_id: activeSource ? "landing:test" : null,
      state: activeSource ? "source-work" : "decision-required", next_action: null }, { recordRef: "openproject://work_packages/42", sourceOwner: "workspace-delivery-art" });
    if (path.endsWith("/continuation-context")) return Response.json({ workflow_id: "delivery-work-item-continuation-context", delivery_id: "delivery-40",
      work_item_id: "work-item-42", work_item_record_ref: "openproject://work_packages/42",
      continuation_context: { target_item: { ...node(), id: 42, blocked: false, dependency_blocked: false, ready_contract_satisfied: actual !== null,
        completion_narrative_contract_satisfied: true, completion_status_transition_available: true, completion_evidence_present: false, completion_evidence_formatting_valid: false },
      summary: { open_descendant_count: 0, open_child_count: 0, completed_related_count: 1 } } });
    if (path.endsWith("/change-control")) return canonicalSourceResponse({ schema_version: 1, delivery_id: "delivery-40", record_ref: "openproject://work_packages/40",
      source_revision: "delivery-package:sha256:" + "a".repeat(64), projection_state: "current", projected_at: updated, last_event_ref: null,
      package: { execution_tree: { id: 40, record_ref: "openproject://work_packages/40", type: "Epic", subject: "Product", status: "in-progress", children: [node()] }, dependency_relations: [] } },
    { recordRef: "openproject://work_packages/40", sourceOwner: "workspace-delivery-art" });
    assert.equal(path, "/v1/delivery-initiatives/delivery-40/pi-review");
    assert.equal(init.method, "POST");
    if (reject) return Response.json({ code: "native_outcome_invalid", message: "Use an allowed native review outcome." }, { status: 422 });
    actual = 8; outcome = "Met"; updated = "2026-01-01T00:01:00.000Z";
    if (lostResponse) throw new Error("Response lost after native write");
    return Response.json({ workflow_id: "delivery-pi-review", delivery_id: "delivery-40", delivery_record_ref: "openproject://work_packages/40",
      updated: [{ work_package: { id: wrongResult ? 43 : 42, record_ref: "openproject://work_packages/42", target_pi: "PI-A", actual_business_value: "8", review_outcome: "Met" } }] });
  } };
  return { calls, options, changeRevision() { updated = "2026-01-01T00:02:00.000Z"; } };
}
const request = context => ({ expectedRevision: context.revision, reviewConfirmed: true, review });

test("earned review uses the exact native objective and PI without completing source or ART", async () => {
  const runtime = owner(); const context = await readItemCompletionContext(42, runtime.options);
  assert.equal(context.can_complete, false); assert.equal(context.pi_review.can_review, true);
  const result = await submitItemPiReview(42, request(context), runtime.options);
  assert.equal(result.context.status, "new"); assert.equal(result.context.pi_review.actual_business_value, 8); assert.equal(result.context.can_complete, true);
  assert.deepEqual(runtime.calls.filter(x => x.method === "POST"), [{ path: "/v1/delivery-initiatives/delivery-40/pi-review", method: "POST", body: { input: {
    target_pi: "PI-A", reviews: [{ target_work_package_id: 42, actual_business_value: 8, review_outcome: "Met", review_note: review.reviewNote }],
  } } }]);
  assertCompletionContext(result.context);
});

test("foreign objective metadata, stale revision and source sessions prevent review writes", async () => {
  await assert.rejects(readItemCompletionContext(42, owner({ wrongMetadata: true }).options), /different objective/);
  for (const activeSource of [false, true]) {
    const runtime = owner({ activeSource }); const context = await readItemCompletionContext(42, runtime.options);
    if (!activeSource) runtime.changeRevision();
    await assert.rejects(submitItemPiReview(42, request(context), runtime.options), /changed|cannot be reviewed/);
    assert.equal(runtime.calls.filter(x => x.method === "POST").length, 0);
  }
});

test("explicit review and native values are validated before mutation", async () => {
  const runtime = owner(); const context = await readItemCompletionContext(42, runtime.options);
  await assert.rejects(submitItemPiReview(42, { ...request(context), reviewConfirmed: false }, runtime.options), /Approve/);
  for (const patch of [{ actualBusinessValue: -1 }, { actualBusinessValue: 1.5 }, { actualBusinessValue: "8" }, { reviewOutcome: "" }, { reviewNote: 42 }, { status: "done" }]) {
    assert.throws(() => itemPiReview({ ...review, ...patch }), /Review requires/);
  }
  assert.equal(runtime.calls.filter(x => x.method === "POST").length, 0);
  assert.equal(itemPiReview({ actualBusinessValue: 0, reviewOutcome: "Not met" }).reviewNote, "");
});

test("native review denials and foreign write responses never become success or retries", async () => {
  for (const settings of [{ reject: true }, { wrongResult: true }]) {
    const runtime = owner(settings); const context = await readItemCompletionContext(42, runtime.options);
    await assert.rejects(submitItemPiReview(42, request(context), runtime.options), /allowed native|unconfirmed/);
    assert.equal(runtime.calls.filter(x => x.method === "POST").length, 1);
  }
});

test("lost native response recovers earned fields by cold read without repeating mutation", async () => {
  const runtime = owner({ lostResponse: true }); const context = await readItemCompletionContext(42, runtime.options);
  await assert.rejects(submitItemPiReview(42, request(context), runtime.options), /Response lost/);
  const recovered = await readItemCompletionContext(42, runtime.options);
  assert.equal(recovered.pi_review.actual_business_value, 8); assert.equal(recovered.pi_review.review_outcome, "Met"); assert.equal(recovered.status, "new");
  const result = await submitItemPiReview(42, request(recovered), runtime.options);
  assert.equal(result.outcome, "already-recorded"); assert.equal(runtime.calls.filter(x => x.method === "POST").length, 1);
});
