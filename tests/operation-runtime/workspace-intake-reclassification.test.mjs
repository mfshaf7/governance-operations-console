import assert from "node:assert/strict";
import test from "node:test";
import { completedDirectIntakeCandidate, directWorkspaceIntakeCandidate, emptyDirectIntakeDraft } from "../../src/console-integration/workspace-intake/workspace-intake-direct-candidate.ts";
import { assertWorkspaceIntakeResult } from "../../src/console-integration/workspace-intake/workspace-intake-live-contract.ts";
import { submitWorkspaceIntake } from "../../src/console-integration/workspace-intake/server/workspace-intake-oos-client.ts";

const digest = character => `sha256:${character.repeat(64)}`;
const target = { kind: "product", name: "synthetic-app", record_id: "product:synthetic-app" };
const at = "2026-10-23T00:00:00Z";
const source = { class: "direct", ref: "console://workspace-intake/direct/product/synthetic-app", digest: digest("a") };
const requested = { kind: "product", notes: "Original operator source context.", platform_owner: "synthetic-platform",
  runtime_owner: "synthetic-app", security_owner: "synthetic-security", source_owners: ["synthetic-app"], intended_endpoint: "local-preview" };
function page() {
  return { schema_version: 1, workflow_id: "workspace-intake", target, source_class: "direct", custody_request_id: null,
    revision: 50, pending_request_count: 0, updated_at: at, next_cursor: null,
    records: [{ request_id: "workspace-intake-request:original", requested_at: at, updated_at: at, status: "succeeded", revision: 5,
      classification: "proposed", candidate: { schema_version: 1, artifact_type: "workspace-intake-source-candidate", candidate_digest: digest("b"),
        source, target, requested_record: requested, evidence_refs: [source.ref] } }] };
}
function result(status = "accepted", command = null) {
  return { ...(command ?? {}), schema_version: 1, workflow_id: "workspace-intake", request_id: command?.request.request_id ?? "workspace-intake-request:original",
    revision: 1, status, canonical_mutation: false, failure: null, review: null, receipt: null, readback: null,
    next_action: ["rejected", "requires-action"].includes(status) ? "submit-corrected-request" : "continue",
    history: [{ sequence: 1, status, at, details: null }] };
}

test("completed reclassification retains the exact immutable origin and recorded metadata, including an older page", async () => {
  const history = page();
  const candidate = completedDirectIntakeCandidate(history, history.records[0].request_id);
  assert.deepEqual(candidate.source, source);
  assert.deepEqual(candidate.requested_record, requested);
  assert.equal(candidate.target.name, target.name);
  assert.equal(candidate.request_id, undefined);
  const changedDraft = { ...emptyDirectIntakeDraft, notes: "Additional review context", evidence: "receipt://new/review",
    platformOwner: "synthetic-platform", runtimeOwner: "synthetic-app", securityOwner: "synthetic-security", sourceOwners: "synthetic-app",
    endpoint: "local-preview", validationPosture: "covered-by-owner-repo", graphRole: "product-readiness-aggregate", validationNotes: "Owner checks." };
  const differentOrigin = await directWorkspaceIntakeCandidate({ kind: target.kind, name: target.name }, changedDraft,
    ["synthetic-platform", "synthetic-app", "synthetic-security"], []);
  assert.notEqual(differentOrigin.source.digest, candidate.source.digest);
  candidate.requested_record.notes = "Caller changes its local copy";
  assert.equal(history.records[0].candidate.requested_record.notes, requested.notes);
});

test("reclassification denies pending records beyond the visible page, incomplete or foreign source candidates", () => {
  for (const mutate of [
    value => { value.pending_request_count = 1; }, value => { value.source_class = "prototype"; },
    value => { value.custody_request_id = "custody:foreign"; }, value => { value.records[0].status = "rejected"; },
    value => { value.records[0].candidate.source = { ...source, class: "prototype" }; },
    value => { value.records[0].candidate.target = { ...target, name: "other" }; },
    value => { value.records[0].candidate.target = { ...target, record_id: "product:other" }; },
  ]) { const invalid = structuredClone(page()); mutate(invalid); assert.throws(() => completedDirectIntakeCandidate(invalid, "workspace-intake-request:original")); }
  assert.throws(() => completedDirectIntakeCandidate(page(), "workspace-intake-request:missing"));
});

test("a new explicit Admitted decision updates the existing record using the completed candidate's original provenance", async () => {
  const candidate = completedDirectIntakeCandidate(page(), "workspace-intake-request:original");
  const preparation = { schema_version: 1, workflow_id: "workspace-intake", authority_revision: "1".repeat(40), target,
    canonical_authority: { repo: "workspace-governance", path: "contracts/intake-register.yaml", branch: "main" }, canonical_mutation: false,
    expected_state: { register_digest: digest("c"), record_version: 1, record_digest: digest("d") } };
  const calls = [];
  const value = await submitWorkspaceIntake({ candidate, decision: "admitted", request_id: "workspace-intake-request:reclassification",
    reviewed_preparation: preparation }, { config: { baseUrl: "http://127.0.0.1:8080", callerId: "synthetic-caller", callerSecret: "synthetic-secret" },
    fetchImpl: async (url, init) => {
      const body = JSON.parse(init.body); calls.push(body);
      return Response.json(String(url).endsWith("/preparations") ? preparation : result("accepted", body));
    } });
  assert.equal(calls.length, 2);
  assert.equal(calls[1].request.action, "update");
  assert.equal(calls[1].request.expected_state.record_version, 1);
  assert.equal(calls[1].request.requested_classification, "admitted");
  assert.deepEqual(calls[1].request.source, source);
  assert.deepEqual(calls[1].request.requested_record, requested);
  assert.equal(value.request_id, "workspace-intake-request:reclassification");
});

test("owner rejection findings survive native and browser projection without leaking raw readiness or losing request binding", () => {
  const finding = { code: "source-identity-changed", severity: "blocking", message: "Preserve the original entrant source.", next_action: "correct-request" };
  const native = { ...result("rejected"), readiness: { receipt: { schema_version: 1, artifact_type: "wgcf-workspace-intake-readiness",
    request_ref: { id: "workspace-intake-request:original", digest: digest("c") }, receipt_digest: digest("d"), outcome: "denied", findings: [finding] } } };
  const projected = assertWorkspaceIntakeResult(native);
  assert.deepEqual(projected.readiness_findings, [finding]);
  assert.deepEqual(assertWorkspaceIntakeResult(projected).readiness_findings, [finding]);
  assert.deepEqual(assertWorkspaceIntakeResult({ ...native, readiness_findings: [{ next_action: finding.next_action,
    severity: finding.severity, message: finding.message, code: finding.code }] }).readiness_findings, [finding]);
  assert.equal(projected.readiness, undefined);
  for (const mutate of [
    value => { value.readiness.receipt.request_ref.id = "workspace-intake-request:foreign"; },
    value => { value.readiness.receipt.outcome = "allowed"; },
    value => { value.readiness.receipt.findings = []; },
    value => { value.readiness.receipt.findings[0].raw = "not-admitted"; },
    value => { value.readiness.receipt.findings[0].severity = "invented"; },
    value => { value.readiness_findings = [{ ...finding, message: "Contradictory" }]; },
  ]) { const invalid = structuredClone(native); mutate(invalid); assert.throws(() => assertWorkspaceIntakeResult(invalid)); }
  assert.throws(() => assertWorkspaceIntakeResult({ ...result(), readiness_findings: [finding] }));
  assert.deepEqual(assertWorkspaceIntakeResult({ ...native, ...result("requires-action"), readiness: {
    receipt: { ...native.readiness.receipt, outcome: "requires-action" } } }).readiness_findings, [finding]);
});
