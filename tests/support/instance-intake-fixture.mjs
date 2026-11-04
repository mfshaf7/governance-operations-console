import { createHash } from "node:crypto";
export const at = "2026-11-04T01:00:00.000Z";
export const config = { baseUrl: "http://127.0.0.1:8080", callerId: "synthetic-console", callerSecret: "synthetic-secret" };
const sorted = value => Array.isArray(value) ? value.map(sorted) : value && typeof value === "object"
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, sorted(value[key])])) : value;
export const digest = value => `sha256:${createHash("sha256").update(JSON.stringify(sorted(value))).digest("hex")}`;
export const bind = (value, key) => ({ ...value, [key]: digest(value) });
export function preparation() {
  const target = { kind: "repo", name: "synthetic-private", record_id: "repo:synthetic-private" };
  const source = { class: "repository-custody", digest: digest("original-source"),
    ref: `oos://repository-custody/requests/custody%3Aoriginal/intake/${"c".repeat(64)}` };
  const requested_record = { kind: "repo", notes: "Synthetic private source registration.", repo_class: "product-source",
    requires_security_bindings: false, security_owner: null,
    provider_repository: { provider: "github", provider_repository_id: "123456789", full_name: "example-organization/synthetic-private" } };
  return { schema_version: 1, workflow_id: "workspace-intake", authority_kind: "internal-instance-record", authority_revision: "1".repeat(40),
    canonical_authority: { kind: "internal-instance-record", instance_id: "synthetic-installation", record_id: target.record_id },
    expected_state: { record_version: null, record_digest: null }, canonical_mutation: false,
    policy_ref: { repo: "workspace-governance", revision: "1".repeat(40), contract_digest: digest("policy") },
    custody_request_id: "custody:current", target,
    source_candidate: bind({ schema_version: 1, artifact_type: "workspace-intake-source-candidate", source, target, requested_record,
      evidence_refs: ["oos://receipts/custody/synthetic.json"] }, "candidate_digest") };
}
export function intent(prepared = preparation()) {
  const source = prepared.source_candidate;
  return { candidate: { label: "Synthetic private project", requested_record: source.requested_record, evidence_refs: source.evidence_refs,
    source: source.source, target: { kind: "repo", name: source.target.name } },
    decision: "proposed", request_id: "workspace-intake-request:synthetic-private", reviewed_preparation: prepared };
}
export function result(command, status = "accepted") {
  const request = command.request, decision = command.decision;
  const authority = { kind: "internal-instance-record", instance_id: request.instance_id, record_id: request.target.record_id };
  let native = null;
  if (status === "succeeded") {
    const { kind: _kind, ...metadata } = request.requested_record;
    const record = { ...metadata, phase: "intake", status: request.requested_classification, owner_route: request.owner_route,
      record: { id: request.target.record_id, version: (request.expected_state.record_version ?? 0) + 1, source: request.source,
        last_mutation: { request_digest: request.request_digest, decision_digest: decision.decision_digest, idempotency_key: request.idempotency_key } } };
    const receipt = bind({ schema_version: 1, artifact_type: "instance-operational-record-receipt", authority: authority.kind,
      instance_id: authority.instance_id, record_id: authority.record_id, version: record.record.version, record_digest: digest(record),
      previous: { version: request.expected_state.record_version, digest: request.expected_state.record_digest },
      idempotency_key: request.idempotency_key, command_digest: digest("synthetic-canonical-command"), actor: "synthetic-oos",
      action: `intake.${request.action}`, accepted_at: at,
      policy_ref: `git://workspace-governance/${request.policy_ref.revision}/contracts/instance-operational-records.yaml@${request.policy_ref.contract_digest}`,
      decision_digest: decision.decision_digest, readiness_digest: digest("synthetic-readiness"), operator_ref: config.callerId }, "receipt_digest");
    native = { record, receipt };
  }
  return { ...command, schema_version: 1, workflow_id: "workspace-intake", authority_kind: authority.kind, canonical_authority: authority,
    request_id: request.request_id, revision: 1, status, canonical_mutation: status === "succeeded", cancel_allowed: status === "accepted",
    failure: null, review: null, readiness: null, receipt: native?.receipt ?? null, readback: native,
    next_action: status === "succeeded" ? "complete" : "continue", history: [{ sequence: 1, status, at, details: null }] };
}
