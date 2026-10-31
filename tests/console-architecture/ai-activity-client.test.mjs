import test from "node:test";
import assert from "node:assert/strict";
import { decodeAiActivityPage, readAiActivity } from "../../src/agent-console/server/ai-activity-client.ts";
import { aiActivityWorkspace } from "../../src/agent-console/model/recent-ai-activity.ts";

const config = { baseUrl: "http://127.0.0.1:8080", callerId: "console", callerSecret: "private-test-value", operatorId: "operator-1" };
function page() {
  return { schema_version: 1, artifact_type: "ai-activity-page", caller_id: "console", operator_id: "operator-1", observed_at: "2026-10-31T12:00:00Z", next_cursor: null, coverage: "Retained owner records", items: [{
    id: "session:request", source: "agent-console", session_ref: "oos://agent-console/sessions/session", invocation_id: "request", kind: "proposal-triage", subject_ref: "idea-1400", state: "completed", requested_at: "2026-10-31T11:00:00Z", completed_at: "2026-10-31T11:00:02Z",
    receipt_ref: { uri: "oos://agent-console/receipts/request", digest: `sha256:${"a".repeat(64)}` }, audit_ref: "audit:actual", context_ref: "cgg:actual", error_code: null,
  }] };
}
test("AI history reads use fixed owner/operator binding and a bounded request projection", async () => {
  let request;
  const result = await readAiActivity({ config, fetchImpl: async (url, init) => { request = { url: String(url), headers: new Headers(init.headers), method: init.method ?? "GET" }; return Response.json(page()); } });
  assert.equal(request.method, "GET"); assert.match(request.url, /\/v1\/agent-console\/activity\?limit=10$/);
  assert.equal(request.headers.get("x-oos-operator-id"), "operator-1");
  assert.equal(result.items[0].task, "Proposal triage assistance"); assert.equal(aiActivityWorkspace(result.items[0]), "PROPOSAL");
  assert.equal(result.items[0].receiptRef, "oos://agent-console/receipts/request");
});
test("history rejects cross-operator data, unexpected raw content, duplicate identities and malformed times", () => {
  for (const mutate of [p => { p.operator_id = "another-operator"; }, p => { p.items[0].result = "private output"; }, p => { p.items.push(p.items[0]); }, p => { p.items[0].completed_at = "2020-01-01T00:00:00Z"; }, p => { p.items[0].state = "approved"; }, p => { p.items[0].completed_at = null; }, p => { p.items[0].receipt_ref = null; }, p => { p.next_cursor = "http://external.example"; }]) {
    const value = page(); mutate(value); assert.throws(() => decodeAiActivityPage(value, config));
  }
});
test("older metadata is explicitly absent; request references cannot become executable links", () => {
  const value = page(); value.items[0].kind = null; value.items[0].subject_ref = null;
  const result = decodeAiActivityPage(value, config).items[0];
  assert.equal(result.task, "Assistant request"); assert.equal(result.subject, "Item not recorded"); assert.equal(aiActivityWorkspace(result), null);
  assert.match(result.detail, /older request/);
});
test("owner errors and oversized history are unavailable, never sample activity", async () => {
  await assert.rejects(readAiActivity({ config, fetchImpl: async () => Response.json({ items: [] }, { status: 503 }) }));
  await assert.rejects(readAiActivity({ config, fetchImpl: async () => new Response(" ".repeat(131073)) }), /bounded/);
});
