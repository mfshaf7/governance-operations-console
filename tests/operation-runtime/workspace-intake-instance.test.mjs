import { canonicalSourceResponse } from "../support/console-source-projection.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import { prepareWorkspaceIntake, submitWorkspaceIntake, continueWorkspaceIntake } from "../../src/console-integration/workspace-intake/server/workspace-intake-oos-client.ts";
import { assertWorkspaceIntakePreparation, assertWorkspaceIntakeResult, assertWorkspaceIntakeRequestPage } from "../../src/console-integration/workspace-intake/workspace-intake-live-contract.ts";
import { preparation, intent, result, config, at, bind, digest } from "../support/instance-intake-fixture.mjs";

async function accepted(prepared = preparation()) {
  let command;
  const projected = await submitWorkspaceIntake(intent(prepared), { config, now: () => new Date(at), fetchImpl: async (url, init) => {
    if (String(url).endsWith("/preparations")) {
      assert.equal(JSON.parse(init.body).repository_custody.request_id, "custody:current");
      return Response.json(prepared);
    }
    command = JSON.parse(init.body);
    return Response.json(result(command));
  } });
  return { command, projected };
}

test("internal registration binds this installation, policy and current custody without changing its immutable origin", async () => {
  const prepared = preparation();
  const { command, projected } = await accepted(prepared);
  assert.equal(command.request.artifact_type, "instance-repository-intake-request");
  assert.equal(command.request.schema_version, 1);
  assert.equal(command.request.instance_id, prepared.canonical_authority.instance_id);
  assert.equal(command.request.custody_request_id, prepared.custody_request_id);
  assert.deepEqual(command.request.source, prepared.source_candidate.source);
  assert.deepEqual(command.request.policy_ref, prepared.policy_ref);
  assert.deepEqual(command.request.expected_state, { record_version: null, record_digest: null });
  assert.equal(command.request.expected_state.register_digest, undefined);
  assert.equal(projected.cancel_allowed, true);
  assert.deepEqual(assertWorkspaceIntakeResult(projected), projected);
  assert.doesNotMatch(JSON.stringify(command), /synthetic-secret|merge_commit|register_digest/);
});

test("internal registration completion requires its exact digest-bound record and receipt, with no Git review", async () => {
  const { command } = await accepted();
  const complete = result(command, "succeeded");
  const value = await continueWorkspaceIntake(command.request.request_id, { config, fetchImpl: async () => Response.json(complete) });
  assert.equal(value.status, "succeeded");
  assert.equal(value.review, null);
  assert.equal(value.cancel_allowed, false);
  assert.equal(value.receipt.receipt_id, undefined);
  assert.equal(value.receipt.record_digest, digest(complete.readback.record));
  assert.deepEqual(assertWorkspaceIntakeResult(value), value);
  for (const change of [
    v => { v.receipt.instance_id = "different-installation"; },
    v => { v.receipt.record_id = "repo:different-project"; },
    v => { v.readback.record.notes = "Substituted private metadata"; },
    v => { v.receipt.receipt_digest = digest("wrong"); },
    v => { v.request.requested_record.notes = "Changed reviewed source"; },
    v => { v.review = {}; }, v => { v.cancel_allowed = true; },
    v => { v.readback = null; }, v => { v.receipt = null; },
    v => { v.receipt = bind({ ...v.receipt, operator_ref: "different-operator", receipt_digest: undefined }, "receipt_digest"); },
  ]) {
    const wrong = structuredClone(complete); change(wrong);
    await assert.rejects(continueWorkspaceIntake(command.request.request_id, { config, fetchImpl: async () => Response.json(wrong) }));
  }
});

test("internal updates compare the reviewed version and keep original request identity on recovery", async () => {
  const prepared = preparation();
  prepared.expected_state = { record_version: 7, record_digest: digest("previous") };
  const { command } = await accepted(prepared);
  assert.equal(command.request.action, "update");
  const complete = result(command, "succeeded");
  const value = await continueWorkspaceIntake(command.request.request_id, { config, fetchImpl: async () => Response.json(complete) });
  assert.equal(value.receipt.version, 8);
  assert.equal(value.request_id, command.request.request_id);
  assert.deepEqual(value.receipt.previous, { version: 7, digest: digest("previous") });
});

test("changed policy, version, installation or custody blocks stale review before submission", async () => {
  for (const change of [v => { v.policy_ref.contract_digest = digest("changed"); },
    v => { v.expected_state = { record_version: 1, record_digest: digest("updated") }; },
    v => { v.canonical_authority.instance_id = "different-installation"; }, v => { v.custody_request_id = "custody:replacement"; }]) {
    let writes = 0;
    const fresh = preparation(); change(fresh);
    await assert.rejects(submitWorkspaceIntake(intent(), { config, fetchImpl: async (url) => {
      if (!String(url).endsWith("/preparations")) writes++;
      return Response.json(fresh);
    } }), /changed after review/);
    assert.equal(writes, 0);
  }
});

test("malformed internal preparation fails closed instead of falling back to Git", async () => {
  for (const change of [v => { v.authority_kind = "unknown-storage"; },
    v => { v.canonical_authority.record_id = "repo:different"; }, v => { v.expected_state.register_digest = digest("extra"); },
    v => { v.expected_state.record_digest = digest("missing-version"); }, v => { delete v.source_candidate; },
    v => { v.policy_ref.revision = "2".repeat(40); }, v => { v.custody_request_id = ""; }]) {
    const wrong = preparation(); change(wrong);
    assert.throws(() => assertWorkspaceIntakePreparation(wrong));
  }
  const wrong = preparation(); wrong.source_candidate.requested_record.notes = "altered";
  await assert.rejects(prepareWorkspaceIntake(wrong.target, { config, fetchImpl: async () => Response.json(wrong) }), /digest/);
});

test("internal history retains the immutable origin under its separate current custody selector", () => {
  const prep = preparation();
  const page = { schema_version: 1, workflow_id: "workspace-intake", target: prep.target, custody_request_id: prep.custody_request_id,
    revision: 1, pending_request_count: 1, updated_at: at, next_cursor: null, records: [{ request_id: intent().request_id,
      authority_kind: prep.authority_kind, custody_request_id: prep.custody_request_id,
      requested_at: at, updated_at: at, revision: 1, status: "accepted", classification: "proposed", candidate: prep.source_candidate }] };
  const selected = assertWorkspaceIntakeRequestPage(page, prep.target.name, prep.custody_request_id);
  assert.equal(selected.records[0].candidate.source.ref, prep.source_candidate.source.ref);
  assert.equal(selected.records[0].custody_request_id, "custody:current");
  const wrong = structuredClone(page); wrong.records[0].custody_request_id = "custody:other";
  assert.throws(() => assertWorkspaceIntakeRequestPage(wrong, prep.target.name, prep.custody_request_id));
});


test("lost submit acknowledgement and later timestamp retry recover the exact original reviewed command", async () => {
  let saved = null, posts = 0, reads = 0;
  const fetchImpl = async (url, init) => {
    if (String(url).endsWith("/preparations")) return Response.json(preparation());
    if (init.method === "GET") {
      reads++;
      return canonicalSourceResponse(result(saved), { recordRef: `oos://workspace-intake/requests/${saved.request.request_id}`, sourceOwner: "operator-orchestration-service" });
    }
    posts++;
    if (!saved) { saved = JSON.parse(init.body); throw new Error("Synthetic response lost after durable acceptance"); }
    return Response.json({ code: "workspace_intake_idempotency_conflict", message: "The first server timestamp is retained." }, { status: 409 });
  };
  const first = await submitWorkspaceIntake(intent(), { config, fetchImpl, now: () => new Date(at) });
  const retry = await submitWorkspaceIntake(intent(), { config, fetchImpl, now: () => new Date("2026-11-04T01:05:00Z") });
  assert.equal(first.request_id, saved.request.request_id); assert.equal(retry.request_id, first.request_id);
  assert.equal(first.status, "accepted"); assert.equal(posts, 2); assert.equal(reads, 2);
  assert.equal(saved.request.requested_at, at);
});

test("submission recovery preserves uncertainty when the original request cannot be read", async () => {
  let posts = 0;
  await assert.rejects(submitWorkspaceIntake(intent(), { config, now: () => new Date(at), fetchImpl: async (url, init) => {
    if (String(url).endsWith("/preparations")) return Response.json(preparation());
    if (init.method === "POST") posts++;
    throw new Error("Synthetic unavailable connection");
  } }), error => error.code === "workspace_intake_submission_unconfirmed" && error.retryable === true);
  assert.equal(posts, 1);
});

test("submission recovery rejects an original request with different reviewed input", async () => {
  const { command } = await accepted();
  const prepared = preparation();
  prepared.source_candidate.requested_record = { ...prepared.source_candidate.requested_record, notes: "Different reviewed purpose" };
  const candidateBody = { ...prepared.source_candidate }; delete candidateBody.candidate_digest;
  prepared.source_candidate.candidate_digest = digest(candidateBody);
  const submission = intent(prepared);
  await assert.rejects(submitWorkspaceIntake(submission, { config, now: () => new Date(at), fetchImpl: async (url, init) => {
    if (String(url).endsWith("/preparations")) return Response.json(prepared);
    if (init.method === "GET") return canonicalSourceResponse(result(command), { recordRef: `oos://workspace-intake/requests/${command.request.request_id}`, sourceOwner: "operator-orchestration-service" });
    return Response.json({ code: "workspace_intake_idempotency_conflict", message: "Different reviewed input" }, { status: 409 });
  } }), error => error.code === "workspace_intake_idempotency_conflict");
});
