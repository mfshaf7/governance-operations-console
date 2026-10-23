import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { directIntakeTarget, directWorkspaceIntakeCandidate, emptyDirectIntakeDraft } from "../../src/console-integration/workspace-intake/workspace-intake-direct-candidate.ts";
import { assertWorkspaceIntakeRequestPage } from "../../src/console-integration/workspace-intake/workspace-intake-live-contract.ts";
import { listDirectWorkspaceIntakeRequests } from "../../src/console-integration/workspace-intake/server/workspace-intake-oos-client.ts";
import { canonicalSourceResponse, assertCanonicalSourceRequest } from "../support/console-source-projection.mjs";

const owners = ["synthetic-app", "synthetic-platform", "synthetic-security"];
const draft = { ...emptyDirectIntakeDraft, notes: "Synthetic local app; no deployed runtime.",
  evidence: "receipt://synthetic/graduation\nopenproject://work_packages/1", platformOwner: owners[1],
  runtimeOwner: owners[0], securityOwner: owners[2], sourceOwners: owners[0], endpoint: "local-preview",
  validationPosture: "covered-by-owner-repo", graphRole: "product-readiness-aggregate", catalogRefs: "", validationNotes: "Owner checks prove source quality, not runtime activation." };
const config = { baseUrl: "http://127.0.0.1:8080", callerId: "synthetic-caller", callerSecret: "synthetic-secret" };
function sorted(value) {
  if (Array.isArray(value)) return value.map(sorted);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, sorted(value[key])]));
  return value;
}
async function page(kind = "product") {
  const target = directIntakeTarget(kind, "synthetic-app");
  const candidate = await directWorkspaceIntakeCandidate(target, { ...draft, ownerRepo: owners[0], componentClass: "synthetic-component" }, owners, []);
  const body = { schema_version: 1, artifact_type: "workspace-intake-source-candidate", source: candidate.source,
    target: { ...target, record_id: `${kind}:synthetic-app` }, requested_record: candidate.requested_record, evidence_refs: [candidate.source.ref] };
  const projected = { ...body, candidate_digest: `sha256:${createHash("sha256").update(JSON.stringify(sorted(body))).digest("hex")}` };
  return { schema_version: 1, workflow_id: "workspace-intake", source_class: "direct", target: body.target,
    custody_request_id: null, revision: 28, pending_request_count: 26, updated_at: "2026-10-23T01:00:00Z", next_cursor: "a".repeat(64),
    records: [{ request_id: "workspace-intake-request:original", requested_at: "2026-10-23T01:00:00Z", updated_at: "2026-10-23T01:00:00Z",
      revision: 2, status: "review-required", classification: "admitted", candidate: projected }] };
}

test("direct candidate preserves explicit owners and contextual evidence without claiming source-owner attestation", async () => {
  const target = directIntakeTarget("product", "synthetic-app");
  const candidate = await directWorkspaceIntakeCandidate(target, draft, owners, []);
  assert.equal(candidate.source.class, "direct");
  assert.match(candidate.requested_record.notes, /not source-owner attestation/);
  for (const ref of draft.evidence.split("\n")) assert.ok(candidate.requested_record.notes.includes(ref));
  assert.equal(candidate.requested_record.runtime_owner, owners[0]);
  assert.equal(candidate.requested_record.intended_endpoint, "local-preview");
  assert.equal(candidate.requested_record.validation_behavior.posture, "covered-by-owner-repo");
  assert.deepEqual(candidate.requested_record.validation_behavior.catalog_refs, []);
  assert.deepEqual(await directWorkspaceIntakeCandidate(target, draft, owners, []), candidate);
  assert.notEqual((await directWorkspaceIntakeCandidate(target, { ...draft, notes: "Changed boundary" }, owners, [])).source.digest, candidate.source.digest);
  for (const change of [{ platformOwner: "unknown" }, { sourceOwners: "" }, { sourceOwners: "unknown" }, { endpoint: "" }, { notes: "" }, { evidence: "" },
    { validationPosture: "" }, { graphRole: "" }, { validationNotes: "" }]) {
    await assert.rejects(directWorkspaceIntakeCandidate(target, { ...draft, ...change }, owners, []));
  }
  for (const [kind, name] of [["repo", "synthetic-app"], ["product", "../path"], ["component", ""]]) assert.throws(() => directIntakeTarget(kind, name));
});

for (const kind of ["product", "component"]) test(`direct ${kind} journal reads exact native source and original request without writes`, async () => {
  const wire = await page(kind);
  assert.equal(assertWorkspaceIntakeRequestPage(wire, "synthetic-app", null, kind).pending_request_count, 26);
  const query = `target_kind=${kind}&target_name=synthetic-app&source_class=direct`;
  const options = value => ({ config, fetchImpl: async (url, init) => {
    assert.equal(String(url), `${config.baseUrl}/v1/workspace-intake/requests?${query}`);
    assert.equal(init.method, "GET"); assertCanonicalSourceRequest(init);
    assert.equal(init.headers["x-oos-caller-secret"], config.callerSecret);
    return canonicalSourceResponse(value, { recordRef: `oos://workspace-intake/requests?${query}`, sourceOwner: "operator-orchestration-service" });
  } });
  assert.equal((await listDirectWorkspaceIntakeRequests(kind, "synthetic-app", null, options(wire))).records[0].request_id, "workspace-intake-request:original");
  for (const mutate of [
    value => { value.source_class = "delivery"; }, value => { value.custody_request_id = "custody:wrong"; },
    value => { value.target.name = "other"; }, value => { value.records[0].candidate.source.class = "prototype"; },
    value => { value.records[0].candidate.requested_record.notes = "Changed"; },
    value => { value.records.push(structuredClone(value.records[0])); }, value => { value.pending_request_count = 0; },
    value => { value.records[0].secret = "no"; }, value => { value.next_cursor = "../path"; },
  ]) {
    const invalid = structuredClone(wire); mutate(invalid);
    await assert.rejects(listDirectWorkspaceIntakeRequests(kind, "synthetic-app", null, options(invalid)));
  }
  await assert.rejects(listDirectWorkspaceIntakeRequests(kind, "synthetic-app", null, {
    config, fetchImpl: async () => Response.json(wire),
  }));
});
