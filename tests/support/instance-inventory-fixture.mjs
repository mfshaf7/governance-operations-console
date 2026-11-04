import { preparation as intakePreparation, at, bind, digest } from "./instance-intake-fixture.mjs";
export { at, bind, digest };
export const config = { baseUrl: "http://127.0.0.1:8080", callerId: "governance-operations-console", callerSecret: "synthetic-secret" };
export function admitted() {
  const prep = intakePreparation(), { kind: _kind, ...metadata } = prep.source_candidate.requested_record;
  const record = { ...metadata, phase: "intake", status: "admitted", owner_route: "workspace-governance",
    validation_behavior: { posture: "covered-by-owner-repo", wgcf_graph_role: "product-runtime-source", catalog_refs: [], notes: "Synthetic source checks" },
    record: { id: prep.target.record_id, version: 1, source: prep.source_candidate.source,
      decision: { id: "synthetic-admission", ref: "oos://synthetic/decisions/admission", digest: digest("synthetic-admission") },
      last_mutation: { request_digest: digest("original-request"), decision_digest: digest("synthetic-admission"), idempotency_key: "original:v1" } } };
  return { record, receipt: bind({ schema_version: 1, artifact_type: "instance-operational-record-receipt", authority: prep.authority_kind,
    instance_id: prep.canonical_authority.instance_id, record_id: prep.target.record_id, version: 1, record_digest: digest(record), previous: { version: null, digest: null },
    idempotency_key: "original:v1", command_digest: digest("synthetic-original-command"), actor: "synthetic-oos", action: "intake.add", accepted_at: at,
    policy_ref: `git://workspace-governance/${prep.policy_ref.revision}/contracts/instance-operational-records.yaml@${prep.policy_ref.contract_digest}`,
    decision_digest: record.record.decision.digest, readiness_digest: digest("synthetic-admission-readiness"), operator_ref: config.callerId }, "receipt_digest") };
}
export function promotionPreparation() {
  const prep = intakePreparation(), current = admitted(), { phase: _phase, ...domain } = current.record;
  const active = { posture: "active", lifecycle: "active", repo_class: domain.repo_class, provider_repository: domain.provider_repository,
    requires_security_bindings: false, owns: [domain.notes],
    must_not_own: ["Workspace governance, shared orchestration, Platform release, Security acceptance, authenticated identity or privileged runtime authority"],
    allowed_authoritative_refs: [], validation_behavior: domain.validation_behavior };
  const intake_entry_ref = { id: prep.target.record_id, version: 1, digest: current.receipt.record_digest };
  const candidate = bind({ authority_kind: prep.authority_kind, canonical_authority: prep.canonical_authority, target: prep.target,
    intake_entry_ref, active_record: { kind: "repo", id: prep.target.record_id, value: active }, owner_refs: [prep.target.name],
    approval_refs: [domain.record.decision.ref, domain.record.decision.id] }, "candidate_digest");
  return { schema_version: 1, workflow_id: "workspace-inventory-promotion", authority_kind: prep.authority_kind,
    authority_revision: prep.authority_revision, canonical_authority: prep.canonical_authority, policy_ref: prep.policy_ref,
    expected_state: { record_version: 1, record_digest: current.receipt.record_digest }, target: prep.target,
    current_record: domain, latest_receipt_ref: { version: 1, digest: current.receipt.receipt_digest, action: current.receipt.action },
    intake_entry_ref, candidate, canonical_mutation: false };
}
export function promotionIntent(prep = promotionPreparation()) {
  return { candidate: prep.candidate, reviewed_preparation: prep, request_id: "workspace-inventory-request:synthetic-private",
    reviewed_projection: { authority_revision: prep.authority_revision, projection_digest: digest("synthetic-page") } };
}
export function nativeResult(command, status = "accepted", previous = admitted()) {
  const request = command.request, authority = { kind: "internal-instance-record", instance_id: request.instance_id, record_id: request.target.record_id };
  let readback = null;
  if (status === "succeeded") {
    const record = request.action === "promote" ? { ...request.requested_value, phase: "inventory", record: {
      id: request.target.record_id, lineage: { source: "workspace-intake", source_ref: request.target.record_id,
        source_digest: previous.receipt.record_digest, intake_entry_version: previous.receipt.version } } } : structuredClone(previous.record);
    const posture = { promote: "active", suspend: "suspended", retire: "retired", restore: "active", update: request.requested_value?.posture }[request.action];
    Object.assign(record, request.requested_value ?? {}, { posture, lifecycle: posture });
    record.record.version = previous.receipt.version + 1;
    record.record.last_mutation = { id: `instance-inventory:${request.idempotency_key}`, action: request.action, applied_at: at,
      request_ref: request.request_id, request_digest: request.request_digest, idempotency_key: request.idempotency_key,
      readiness_ref: `instance-inventory-readiness:${request.request_id}`, readiness_digest: digest("synthetic-inventory-readiness") };
    const { receipt_digest: _old, ...prior } = previous.receipt;
    readback = { record, receipt: bind({ ...prior, action: `inventory.${request.action}`, version: record.record.version, record_digest: digest(record),
      previous: { version: previous.receipt.version, digest: previous.receipt.record_digest }, idempotency_key: request.idempotency_key,
      decision_digest: digest({ request_ref: { id: request.request_id, digest: request.request_digest }, operator_acceptance: request.operator_acceptance }),
      readiness_digest: record.record.last_mutation.readiness_digest, command_digest: digest({ request, operator_ref: request.operator_ref }), operator_ref: request.operator_ref }, "receipt_digest") };
  }
  return { ...command, schema_version: 1, workflow_id: request.action === "promote" ? "workspace-inventory-promotion" : "workspace-inventory-lifecycle",
    authority_kind: authority.kind, canonical_authority: authority, request_id: request.request_id, status, revision: 1,
    history: [{ sequence: 1, status, at, details: null }], failure: null, review: null, readiness: null,
    readback, receipt: readback?.receipt ?? null, canonical_mutation: status === "succeeded", cancel_allowed: status === "accepted",
    next_action: status === "succeeded" ? "complete" : "continue", ...(request.action === "promote" ? {} : { merged_state: null }) };
}
export function lifecyclePreparation(current) {
  const prep = intakePreparation(), { phase: _phase, ...domain } = current.record;
  return { schema_version: 1, workflow_id: "workspace-inventory-lifecycle", authority_kind: prep.authority_kind,
    authority_revision: prep.authority_revision, canonical_authority: prep.canonical_authority, policy_ref: prep.policy_ref,
    expected_state: { record_version: current.receipt.version, record_digest: current.receipt.record_digest }, target: prep.target,
    current_record: domain, latest_receipt_ref: { version: current.receipt.version, digest: current.receipt.receipt_digest, action: current.receipt.action }, canonical_mutation: false };
}
export function page(scope = "eligible", current = null) {
  const prep = promotionPreparation(), { record_id: _id, ...authority } = prep.canonical_authority;
  const records = current ? [{ authority_kind: prep.authority_kind, canonical_authority: prep.canonical_authority,
    id: prep.target.record_id, kind: "repo", name: prep.target.name, version: current.receipt.version, record_digest: current.receipt.record_digest,
    posture: current.record.posture, maturity: null, owner_refs: [prep.target.name], lineage: current.record.record.lineage,
    last_mutation: Object.fromEntries(["id", "action", "applied_at", "request_ref", "readiness_ref"].map(key => [key, current.record.record.last_mutation[key]])) }] : [];
  return bind({ schema_version: 1, mode: "current", artifact_type: "instance-repository-registry-page", authority,
    selection: { query: "", scope }, after: null, next_after: null,
    counts: { intake: { "out-of-scope": 0, proposed: 0, admitted: scope === "eligible" ? 1 : 0 },
      inventory: { active: current?.record.posture === "active" ? 1 : 0, suspended: current?.record.posture === "suspended" ? 1 : 0, retired: current?.record.posture === "retired" ? 1 : 0 } },
    records, eligible_promotions: scope === "eligible" ? [prep.candidate] : [], projected_at: at }, "projection_digest");
}
