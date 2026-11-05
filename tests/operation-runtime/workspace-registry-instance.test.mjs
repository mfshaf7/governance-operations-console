import assert from "node:assert/strict";
import test from "node:test";
import { workspaceRegistryFixture } from "../../src/workspace-registry/fixtures/workspace-registry.fixture.ts";
import { readWorkspaceRegistry, prepareWorkspaceInventoryPromotion, prepareWorkspaceInventoryLifecycle,
  submitWorkspaceInventoryPromotion, submitWorkspaceInventoryLifecycle, continueWorkspaceInventoryPromotion,
  continueWorkspaceInventoryLifecycle } from "../../src/workspace-registry/server/workspace-registry-oos-client.ts";
import { assertWorkspaceRegistrySnapshot } from "../../src/workspace-registry/workspace-registry-contract.ts";
import { canonicalSourceResponse } from "../support/console-source-projection.mjs";
import { config, at, digest, bind, page, promotionPreparation, promotionIntent, nativeResult, lifecyclePreparation } from "../support/instance-inventory-fixture.mjs";

function sourcePage(url, value) {
  return canonicalSourceResponse(value, { recordRef: `oos://workspace-inventory/instance-records?${new URL(url).searchParams}`, sourceOwner: "operator-orchestration-service" });
}
function registry(value = workspaceRegistryFixture) {
  return canonicalSourceResponse(value, { recordRef: "repo://workspace-governance/contracts/inventory", sourceOwner: "workspace-governance", sourceRevision: value.authority_revision });
}
function harness(prepared = promotionPreparation(), previous, { errorField = "error", missingCode = null } = {}) {
  let command = null, posts = 0, reads = 0;
  const family = prepared.workflow_id === "workspace-inventory-promotion" ? "promotion" : "lifecycle";
  const root = family === "promotion" ? "/v1/workspace-inventory/promotions" : "/v1/workspace-inventory/lifecycle/requests";
  const fetchImpl = async (url, init) => {
    const path = new URL(url).pathname;
    if (new URL(url).searchParams.has("target_kind")) return canonicalSourceResponse({ schema_version: 1, workflow_id: prepared.workflow_id,
      target: prepared.target, revision: 0, pending_request_count: 0, updated_at: null, next_cursor: null, records: [], canonical_mutation: false },
      { recordRef: `oos://${path.slice(4)}?${new URL(url).searchParams}`, sourceOwner: "operator-orchestration-service" });
    if (path.endsWith("/preparations")) return Response.json(prepared);
    if (init.method === "GET") {
      reads++;
      if (!command) return Response.json({ [errorField]: missingCode ?? (family === "promotion" ? "workspace_inventory_not_found" : "workspace_inventory_lifecycle_not_found"), message: "No original request", details: null }, { status: 404 });
      return canonicalSourceResponse(nativeResult(command, "accepted", previous), { recordRef: `oos://${decodeURIComponent(path.slice(4))}`, sourceOwner: "workspace-governance" });
    }
    if (path.endsWith("/continue")) return Response.json(nativeResult(command, "succeeded", previous));
    posts++;
    if (command) return Response.json({ code: "workspace_inventory_idempotency_conflict", message: "Original timestamp is retained" }, { status: 409 });
    command = JSON.parse(init.body);
    return Response.json(nativeResult(command));
  };
  return { options: { config, fetchImpl, now: () => new Date(at) }, get command() { return command; }, get posts() { return posts; }, get reads() { return reads; }, root };
}

test("Registry composes private pages with their actual authority while preserving the retained Git snapshot", async () => {
  const native = page(); let mutations = 0;
  const snapshot = await readWorkspaceRegistry({ config, selection: { scope: "eligible" }, now: () => new Date(at), fetchImpl: async (url, init) => {
    if (init.method !== "GET") mutations++;
    return new URL(url).pathname.endsWith("/registry") ? registry() : sourcePage(url, native);
  } });
  assert.equal(snapshot.workflow_id, "workspace-registry-view");
  assert.equal(snapshot.canonical_authority, undefined);
  assert.deepEqual(snapshot.legacy_snapshot, workspaceRegistryFixture);
  assert.equal(snapshot.eligible_promotions.at(-1).canonical_authority.instance_id, native.authority.instance_id);
  assert.deepEqual(assertWorkspaceRegistrySnapshot(snapshot), snapshot);
  assert.equal(mutations, 0);
});

test("an unavailable, substituted or missing private Registry protocol cannot become an empty successful Git-only view", async () => {
  const wrongDigest = page(); wrongDigest.eligible_promotions[0].active_record.value.owns = ["Substituted metadata"];
  const overlap = page(); overlap.eligible_promotions[0].target = workspaceRegistryFixture.eligible_promotions[0].target;
  for (const value of [wrongDigest, overlap, { schema_version: 1, mode: "not-configured", projected_at: at, records: [] }]) {
    await assert.rejects(readWorkspaceRegistry({ config, selection: { scope: "eligible" }, fetchImpl: async url => new URL(url).pathname.endsWith("/registry") ? registry() : sourcePage(url, value) }));
  }
  for (const status of [404, 503]) await assert.rejects(readWorkspaceRegistry({ config, fetchImpl: async url => new URL(url).pathname.endsWith("/registry") ? registry() : Response.json({ code: "synthetic_unavailable" }, { status }) }));
});

test("native promotion uses exact reviewed project state and internal receipt without public Git workflow fields", async () => {
  const h = harness(), intent = promotionIntent();
  const prep = await prepareWorkspaceInventoryPromotion(intent.candidate.target, h.options);
  assert.equal(prep.authority_kind, "internal-instance-record");
  const submitted = await submitWorkspaceInventoryPromotion(intent, h.options);
  assert.equal(submitted.status, "accepted");
  assert.equal(h.command.request.artifact_type, "instance-repository-inventory-request");
  assert.equal(h.command.request.active_record, undefined);
  assert.equal(h.command.request.expected_state.active_inventory_digest, undefined);
  const complete = await continueWorkspaceInventoryPromotion(intent.request_id, h.options);
  assert.equal(complete.status, "succeeded");
  assert.equal(complete.review, null);
  assert.equal(complete.receipt.version, 2);
  assert.equal(complete.receipt.receipt_id, undefined);
  assert.equal(h.posts, 1);
  const retry = await submitWorkspaceInventoryPromotion(intent, { ...h.options, now: () => new Date("2026-11-04T01:05:00Z") });
  assert.equal(retry.request_id, submitted.request_id);
  assert.equal(h.posts, 1);
});

test("native original lookup retains code-envelope compatibility and denies unrelated absence errors before any write", async () => {
  const compatible = harness(promotionPreparation(), undefined, { errorField: "code" });
  await submitWorkspaceInventoryPromotion(promotionIntent(), compatible.options);
  assert.equal(compatible.posts, 1);
  const unrelated = harness(promotionPreparation(), undefined, { missingCode: "different_authority_not_found" });
  await assert.rejects(submitWorkspaceInventoryPromotion(promotionIntent(), unrelated.options),
    error => error.code === "different_authority_not_found" && error.status === 404);
  assert.equal(unrelated.posts, 0, "Only the exact owner/family absence may permit a fresh submission");
});

test("native lifecycle preserves current identity and restores only against the latest actual receipt", async () => {
  const promo = harness(); await submitWorkspaceInventoryPromotion(promotionIntent(), promo.options);
  const active = nativeResult(promo.command, "succeeded").readback;
  const prep = lifecyclePreparation(active), h = harness(prep, active);
  const intent = { action: "suspend", request_id: "workspace-inventory-lifecycle-request:synthetic-private", reason: "Synthetic operator suspension",
    approval_refs: ["console://synthetic/approval"], impact_acknowledgements: ["Dependent work reviewed"], requested_value: null,
    reviewed_preparation: prep, reviewed_projection: { authority_revision: prep.authority_revision, projection_digest: digest("selected-page") } };
  await prepareWorkspaceInventoryLifecycle(prep.target, h.options);
  await submitWorkspaceInventoryLifecycle(intent, h.options);
  const complete = await continueWorkspaceInventoryLifecycle(intent.request_id, h.options);
  assert.equal(complete.readback.record.posture, "suspended");
  assert.equal(complete.merged_state, null);
  assert.equal(complete.receipt.version, 3);
  const suspended = complete.readback, restoredPrep = lifecyclePreparation(suspended), restore = harness(restoredPrep, suspended);
  await submitWorkspaceInventoryLifecycle({ ...intent, action: "restore", request_id: `${intent.request_id}:restore`, reviewed_preparation: restoredPrep }, restore.options);
  assert.equal(restore.command.request.prior_receipt_digest, suspended.receipt.receipt_digest);
});

test("native preparation and completed result reject changed record bytes and recomputed unrelated receipts", async () => {
  const prep = promotionPreparation(); prep.current_record.notes = "Substituted source";
  await assert.rejects(prepareWorkspaceInventoryPromotion(prep.target, { config, fetchImpl: async () => Response.json(prep) }));
  const h = harness(); await submitWorkspaceInventoryPromotion(promotionIntent(), h.options);
  for (const mutate of [v => { v.readback.record.owns = ["Changed metadata"]; }, v => { v.receipt.previous.digest = digest("wrong-state"); },
    v => { v.receipt = bind({ ...v.receipt, decision_digest: digest("different-decision"), receipt_digest: undefined }, "receipt_digest"); v.readback.receipt = v.receipt; }]) {
    const wrong = nativeResult(h.command, "succeeded"); mutate(wrong);
    await assert.rejects(continueWorkspaceInventoryPromotion(h.command.request.request_id, { config, fetchImpl: async () => Response.json(wrong) }));
  }
});

test("native submission recovers a lost acceptance reply before another write and rejects stale policy before POST", async () => {
  const h = harness(), baseFetch = h.options.fetchImpl;
  let dropped = false;
  const recovered = await submitWorkspaceInventoryPromotion(promotionIntent(), { ...h.options, fetchImpl: async (url, init) => {
    const response = await baseFetch(url, init);
    if (init.method === "POST" && new URL(url).pathname === h.root && !dropped) { dropped = true; throw new Error("Synthetic reply lost after durable acceptance"); }
    return response;
  } });
  assert.equal(recovered.status, "accepted");
  assert.equal(h.posts, 1);
  const fresh = promotionPreparation(); fresh.authority_revision = "2".repeat(40); fresh.policy_ref.revision = fresh.authority_revision;
  const other = harness();
  await assert.rejects(submitWorkspaceInventoryPromotion(promotionIntent(), { ...other.options, fetchImpl: async (url, init) => {
    if (new URL(url).pathname.endsWith("/preparations")) return Response.json(fresh);
    return other.options.fetchImpl(url, init);
  } }), error => error.code === "workspace_inventory_preparation_stale");
  assert.equal(other.posts, 0);
});
