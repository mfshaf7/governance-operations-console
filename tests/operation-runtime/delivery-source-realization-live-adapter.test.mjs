import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { assertDeliverySourceRealizationInput, assertDeliverySourceRealizationProjection } from "../../src/domain-workspaces/delivery/live-runtime/delivery-source-realization-live-contract.ts";
import { commandDeliverySourceRealization, readDeliverySourceRealization } from "../../src/domain-workspaces/delivery/server/delivery-source-realization-oos-client.ts";
import { canonicalDigest } from "../../src/domain-workspaces/delivery/server/delivery-oos-client.ts";
import { assertCanonicalSourceRequest, canonicalSourceResponse } from "../support/console-source-projection.mjs";

const env = { GOVERNANCE_CONSOLE_OPERATOR_ID: "operator:console-owner", OOS_BASE_URL: "http://127.0.0.1:8080", OOS_CALLER_ID: "governance-operations-console", OOS_CALLER_SECRET: "test-only-secret" };
const at = "2026-10-16T00:00:00.000Z";
const digest = `sha256:${"a".repeat(64)}`;
function projection(state = "draft-ready") {
  const result = {
    schema_version: 1, workflow_id: "delivery-art-source-realization", session_id: "session:sample", work_item_id: "work-item-71", revision: at, state, replayed: false,
    attempt: state === "not-started" ? null : {
      request_id: "realization:sample", state, retry_of: null, objective_digest: digest,
      context: { packet_ref: "cgg://packets/sample", private_diagnostic: "must-not-project" }, model: { profile_id: "source-realization-v1" },
      change_set: { digest, commit_message: "feat: implement sample product", operations: [{ action: "create", path: "src/app.ts", content_digest: digest, expected_digest: null }] }, source_receipt: null, failure: null,
    },
    next_action: { code: ({ "draft-ready": "source-realization-acceptance-required", "source-created": "work-session-continue-required", cancelled: "source-realization-retry-available", "not-started": "source-realization-start-required" })[state], authority: "operator", reason: "Review the exact owner-projected change set." },
  };
  if (state === "source-created") {
    const receipt = { schema_version: 1, receipt_id: "source-realization-receipt:sample", head_commit: "b".repeat(40), change_set_digest: digest, outcome: "committed" };
    result.attempt.source_receipt = { ...receipt, receipt_digest: canonicalDigest(receipt) };
  }
  return result;
}

test("realization canonical GET preserves exact caller/operator/target and strips private metadata", async () => {
  const result = await readDeliverySourceRealization(71, { env, fetchImpl: async (url, init) => {
    assert.match(url, /\/71\/work-session\/realization$/);
    assertCanonicalSourceRequest(init);
    assert.equal(init.headers["x-oos-operator-id"], env.GOVERNANCE_CONSOLE_OPERATOR_ID);
    assert.equal(init.headers["x-oos-caller-secret"], env.OOS_CALLER_SECRET);
    return canonicalSourceResponse(projection(), { recordRef: "openproject://work_packages/71/source-realization", sourceOwner: "workspace-delivery-art" });
  } });
  assert.equal(result.attempt.change_set.digest, digest);
  assert.equal(JSON.stringify(result).includes("must-not-project"), false);
  assert.deepEqual(assertDeliverySourceRealizationProjection(result), result);
});

test("start/replay identity and exact acceptance are server-bound without source contents or browser authority", async () => {
  const start = { action: "start", commandId: "console:sample", requestedAt: at, expectedSessionRevision: at, objective: "Implement the accepted sample to-do product and focused tests.", budgetTokens: 4000, retryOf: null };
  const bodies = [];
  const fetchImpl = async (_url, init) => {
    const body = JSON.parse(init.body).realization; bodies.push(body);
    assert.equal(body.operator_id, undefined);
    const result = projection(); result.attempt.request_id = body.request_id;
    result.attempt.objective_digest = canonicalDigest(body.objective);
    result.attempt.retry_of = body.retry_of;
    return Response.json(result);
  };
  await commandDeliverySourceRealization(71, start, { env, fetchImpl });
  await commandDeliverySourceRealization(71, start, { env, fetchImpl });
  assert.deepEqual(bodies[0], bodies[1]);
  assert.match(bodies[0].request_id, /^source-realization:console:/);
  assert.equal(bodies[0].retry_of, null);
  const accepted = { action: "continue", commandId: "console:accept", requestedAt: at, expectedRevision: at, acceptedChangeSetDigest: digest };
  await commandDeliverySourceRealization(71, accepted, { env, fetchImpl: async (url, init) => {
    assert.match(url, /\/continue$/);
    const body = JSON.parse(init.body).realization;
    assert.equal(body.accepted_change_set_digest, digest);
    assert.equal(body.expected_revision, at);
    assert.equal("operations" in body, false);
    return Response.json(projection("source-created"));
  } });
});

test("unknown-outcome recovery, substantive cancellation and linked retry use only existing finite commands", async () => {
  for (const input of [
    { action: "cancel", expectedRevision: at, reason: "Cancel this unapplied draft after explicit operator inspection." },
    { action: "recover", expectedRevision: at },
    { action: "start", expectedSessionRevision: at, objective: "Retry the accepted product implementation without changing scope.", budgetTokens: 4000, retryOf: "realization:previous" },
  ]) {
    await commandDeliverySourceRealization(71, { ...input, commandId: `console:${input.action}`, requestedAt: at }, { env, fetchImpl: async (url, init) => {
      assert.ok(url.endsWith(`/${input.action}`));
      const body = JSON.parse(init.body).realization;
      if (input.action === "start") assert.equal(body.retry_of, "realization:previous");
      else assert.equal(body.expected_revision, at);
      const result = projection(input.action === "cancel" ? "cancelled" : input.action === "recover" ? "source-created" : "draft-ready");
      if (input.action === "start") { result.attempt.request_id = body.request_id; result.attempt.objective_digest = canonicalDigest(body.objective); result.attempt.retry_of = body.retry_of; }
      return Response.json(result);
    } });
  }
  assert.throws(() => assertDeliverySourceRealizationInput({ action: "cancel", commandId: "console:cancel", requestedAt: at, expectedRevision: at, reason: "no" }));
});

test("legacy GET, wrong targets, malformed paths, source bytes, receipt mismatch and extra authority fail closed", async () => {
  await assert.rejects(readDeliverySourceRealization(71, { env, fetchImpl: async () => Response.json(projection()) }));
  const wrong = projection(); wrong.work_item_id = "work-item-72";
  await assert.rejects(readDeliverySourceRealization(71, { env, fetchImpl: async () => canonicalSourceResponse(wrong, { recordRef: "openproject://work_packages/71/source-realization", sourceOwner: "workspace-delivery-art" }) }));
  for (const badPath of ["../outside", "/absolute", "src/.git/config", "src//file"]) {
    const value = projection(); value.attempt.change_set.operations[0].path = badPath;
    assert.throws(() => assertDeliverySourceRealizationProjection(value));
  }
  const source = projection(); source.attempt.change_set.operations[0].content = "private file bytes";
  assert.throws(() => assertDeliverySourceRealizationProjection(source));
  const command = { action: "recover", commandId: "console:recover", requestedAt: at, expectedRevision: at };
  assert.throws(() => assertDeliverySourceRealizationInput({ ...command, operatorId: "browser-authority" }));
  const result = projection("source-created");
  const receipt = { schema_version: 1, receipt_id: "source-realization-receipt:sample", head_commit: "b".repeat(40), change_set_digest: digest, outcome: "committed" };
  result.attempt.source_receipt = { ...receipt, receipt_digest: canonicalDigest(receipt) };
  await commandDeliverySourceRealization(71, command, { env, fetchImpl: async () => Response.json(result) });
  result.attempt.source_receipt.head_commit = "c".repeat(40);
  await assert.rejects(commandDeliverySourceRealization(71, command, { env, fetchImpl: async () => Response.json(result) }), /receipt does not verify/);
});

test("all realization mutation routes retain shared session authorization and the UI offers no CLI/source editing bypass", () => {
  for (const action of ["start", "continue", "cancel", "recover"]) {
    const source = readFileSync(new URL(`../../src/app/api/delivery/execution/[workItemId]/work-session/realization/${action}/route.ts`, import.meta.url), "utf8");
    assert.match(source, /authorizeConsoleMutation\(request/);
    assert.match(source, new RegExp(`workItemId, "${action}"`));
  }
  const panel = readFileSync(new URL("../../src/domain-workspaces/delivery/presentation/surfaces/execution-board/work-session/execution-source-realization-panel.tsx", import.meta.url), "utf8");
  assert.match(panel, /acceptedChangeSetDigest: draft.digest/);
  assert.match(panel, /Recover accepted source action/);
  assert.match(panel, /Generate linked retry/);
  assert.doesNotMatch(panel, /execFile|child_process|content_base64|writeFile|prototype-local/);
});
