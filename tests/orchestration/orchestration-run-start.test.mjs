import assert from "node:assert/strict";
import test from "node:test";
import { readOrchestrationStartContext, startOrchestrationRun, readOriginalOrchestrationRun, buildOrchestrationStartRequest } from "../../src/domain-workspaces/orchestration/server/orchestration-start-oos-client.ts";
import { originalOrchestrationRunId } from "../../src/domain-workspaces/orchestration/work-model/run-start/run-start-model.ts";
import { config, definition, draft, now, revision, runProjection, source } from "./orchestration-start-fixtures.mjs";

function owner(id, { allowed = true, ownerSource = source(id), start } = {}) {
  const calls = [];
  return { calls, options: { config, now: () => new Date(now), fetchImpl: async (url, init) => {
    calls.push({ path: new URL(url).pathname, method: init.method, headers: init.headers, body: init.body ? JSON.parse(init.body) : null });
    if (url.endsWith("/definitions")) return Response.json({ schema_version: 1, definitions: [definition(allowed)] });
    if (url.endsWith("/change-control")) return Response.json(ownerSource);
    assert.equal(new URL(url).pathname, "/v1/orchestration/runs");
    const body = JSON.parse(init.body);
    return start ? start(body, calls) : Response.json({ duplicate: false, run_id: originalOrchestrationRunId(`start-${id}`), projection: null });
  } } };
}

test("start review uses current owner media, exact initiative and no browser-supplied source refs", async () => {
  const server = owner(501);
  const current = await readOrchestrationStartContext(501, server.options);
  assert.equal(current.title, "Synthetic initiative");
  assert.equal(current.recordRef, "openproject://work_packages/501");
  assert.equal(current.sourceVersion, revision);
  assert.equal(current.startAllowed, true);
  const sourceRead = server.calls.find(call => call.path.endsWith("/change-control"));
  assert.match(sourceRead.headers.Accept, /console-source-projection/);
  assert.equal(sourceRead.headers["x-oos-caller-id"], config.callerId);
  assert.ok(server.calls.every(call => call.method === "GET"));
});

test("start derives operator and exact approval/digest and accepts a queued owner acknowledgement", async () => {
  const server = owner(502);
  const result = await startOrchestrationRun(draft(502), server.options);
  assert.equal(result.runId, originalOrchestrationRunId("start-502"));
  assert.equal(result.state, null);
  const sent = server.calls.find(call => call.method === "POST").body;
  assert.equal(sent.operator_id, config.operatorId);
  assert.equal(sent.approval_refs[0].authority, config.operatorId);
  assert.equal(sent.approval_refs[0].intent_digest, sent.intent_digest);
  assert.equal(sent.approval_refs[0].scope_ref, sent.source_record_ref);
  assert.equal(sent.approval_refs[0].source_version_ref, revision);
  assert.deepEqual(sent.lock_refs, []);
  assert.deepEqual(sent.input_refs, [sent.source_record_ref, sent.source_projection_ref]);
  assert.equal(sent.idempotency_key, "console-orchestration-start:start-502");
  assert.equal(Date.parse(sent.approval_refs[0].expires_at) - Date.parse(now), 15 * 60_000);
});

test("unknown start acknowledgement retries the identical request and recovers its original identity", async () => {
  let attempts = 0;
  const server = owner(503, { start: () => {
    if (++attempts === 1) throw new Error("Synthetic connection lost after owner effect.");
    return Response.json({ duplicate: true, run_id: originalOrchestrationRunId("start-503"), projection: null });
  } });
  const intent = draft(503);
  await assert.rejects(startOrchestrationRun(intent, server.options), error => error.code === "orchestration_oos_unavailable");
  const result = await startOrchestrationRun(intent, server.options);
  assert.equal(result.duplicate, true);
  const writes = server.calls.filter(call => call.method === "POST");
  assert.deepEqual(writes[0].body, writes[1].body);
});

test("changed source, wrong initiative, stale owner and pending admission never dispatch a start", async () => {
  const changed = owner(504, { ownerSource: source(504, { revision: `delivery-package:sha256:${"c".repeat(64)}`, sequence: 2 }) });
  await assert.rejects(startOrchestrationRun(draft(504), changed.options), error => error.code === "orchestration_start_source_changed");
  assert.ok(changed.calls.every(call => call.method === "GET"));
  const wrong = owner(505, { ownerSource: source(999) });
  await assert.rejects(startOrchestrationRun(draft(505), wrong.options), error => error.code === "source_authority_conflict");
  assert.ok(wrong.calls.every(call => call.method === "GET"));
  const stale = owner(506, { ownerSource: source(506, { freshness: "stale" }) });
  await assert.rejects(startOrchestrationRun(draft(506), stale.options), /current|stale/i);
  assert.ok(stale.calls.every(call => call.method === "GET"));
  const blocked = owner(507, { allowed: false });
  assert.equal((await readOrchestrationStartContext(507, blocked.options)).startAllowed, false);
  await assert.rejects(startOrchestrationRun(draft(507), blocked.options), error => error.code === "orchestration_start_not_admitted");
  assert.ok(blocked.calls.every(call => call.method === "GET"));
});

test("unconfirmed approval, actor injection and expired review fail before owner access", async () => {
  const server = owner(508);
  for (const intent of [draft(508, { approved: false }), { ...draft(508), operator_id: "operator:other" }, draft(508, { issuedAt: "2026-10-19T00:00:00Z" })]) {
    await assert.rejects(startOrchestrationRun(intent, server.options));
  }
  assert.equal(server.calls.length, 0);
});

test("wrong acknowledgement and a mismatched retained projection cannot attest the reviewed run", async () => {
  const wrong = owner(509, { start: () => Response.json({ duplicate: false, run_id: originalOrchestrationRunId("other"), projection: null }) });
  await assert.rejects(startOrchestrationRun(draft(509), wrong.options), error => error.code === "orchestration_start_unconfirmed");
  const mismatch = owner(510, { start: body => {
    const projection = runProjection(body);
    projection.operator_ref = "operator:other";
    return Response.json({ duplicate: true, run_id: projection.run_id, projection });
  } });
  await assert.rejects(startOrchestrationRun(draft(510), mismatch.options), error => error.code === "orchestration_start_binding_invalid");
});

test("original run read returns the exact canonical projection without starting or controlling it", async () => {
  const server = owner(511);
  const context = await readOrchestrationStartContext(511, server.options);
  const request = buildOrchestrationStartRequest(draft(511), context, config.operatorId);
  const projection = runProjection(request);
  let calls = 0;
  const result = await readOriginalOrchestrationRun(projection.run_id, { config, fetchImpl: async (url, init) => {
    ++calls; assert.equal(init.method, "GET"); assert.ok(url.endsWith(encodeURIComponent(projection.run_id)));
    return Response.json(projection);
  } });
  assert.equal(result.request_id, request.request_id);
  assert.equal(result.state, "running");
  assert.equal(calls, 1);
});

test("wire intent matches the vector accepted by the OOS canonical request normalizer", async () => {
  const server = owner(512);
  const context = await readOrchestrationStartContext(512, server.options);
  const request = buildOrchestrationStartRequest(draft(512), context, config.operatorId);
  // Qualified against OOS80323d6 normalizeValidationReadinessRequest;
  // key order is part of this existing owner wire format.
  assert.equal(request.intent_digest, "sha256:f4e1a942d467984da840346e19afebdc06b69f20a45f2640672f12f064d98c94");
});
