// Synthetic owner wire fixtures. They are never loaded by product runtime.
export const now = "2026-10-20T00:00:00.000Z";
export const revision = `delivery-package:sha256:${"a".repeat(64)}`;
export const config = { baseUrl: "http://127.0.0.1:8080", callerId: "governance-operations-console", callerSecret: "synthetic-secret", operatorId: "operator:synthetic" };
export function definition(allowed = true) {
  return {
    schema_version: 1, definition_id: "validation-readiness-run", definition_version: 1, title: "Validation readiness run", purpose: "Read-only readiness.", qualification: "durable-candidate", lifecycle: allowed ? "active" : "admission-review", source_domain: "workspace-governance-control-fabric", source_record_type: "workspace-delivery-art-initiative", business_owner: "workspace-governance", implementation_repo: "operator-orchestration-service", execution_owner: "operator-orchestration-service", execution_node_owners: ["workspace-governance-control-fabric"], trigger: { request_type: "validation-readiness" }, approval_requirements: ["explicit-operator-approval"], source_version_refs: { immutable: true }, idempotency_strategy: { key: "request" }, lock_strategy: { required: false },
    execution_graph: [{ node_id: "wgcf-validation-readiness", node_type: "activity", label: "Evaluate readiness", owner: "workspace-governance-control-fabric", adapter: "temporal-activity", task_queue: "wgcf.validation-readiness.v1", activity_name: "wgcf.validation-readiness.evaluate", dependencies: [], optional: false }],
    wait_and_signal_contract: { accepted_controls: ["cancel"] }, retry_and_timeout_contract: { automatic_max_attempts: 3 }, compensation_strategy: { required: false }, cancellation_boundary: "Cancellation stops future work.", completion_condition: "WGCF returns a decision.", expected_receipt: "orchestration-validation-readiness-receipt", return_projection: "oos.validation-readiness-run.v1", evidence_and_retention: { owner_receipt_refs_only: true }, security_requirements: { allowed_caller_ids: ["governance-operations-console"] }, rollout_and_rollback: { start_disabled_by_default: true }, admission: { start_allowed: allowed, gates: Array.from({ length: 14 }, (_, index) => ({ gate_id: `gate-${index + 1}`, satisfied: allowed || index !== 0, owner: "platform-engineering", detail: allowed ? "Admitted." : "Owner admission is pending." })) },
  };
}
export function source(id, overrides = {}) {
  const sourceRevision = overrides.revision ?? revision;
  return {
    schema_version: 1, artifact_type: "console-source-projection",
    binding: { authority: "operator-orchestration-service", record_ref: `openproject://work_packages/${id}`, source_owner: "workspace-delivery-art", source_ref: `oos://v1/delivery-initiatives/delivery-${id}/change-control` },
    revision: { source_revision: sourceRevision, event_sequence: overrides.sequence ?? 1, event_cursor: `event:${overrides.sequence ?? 1}` },
    freshness: { state: overrides.freshness ?? "current", observed_at: now, valid_until: "2026-10-20T00:02:00.000Z" },
    projection: { schema_version: 1, delivery_id: `delivery-${id}`, record_ref: `openproject://work_packages/${id}`,
      projection_state: "current", source_revision: sourceRevision, projected_at: now, last_event_ref: null,
      package: { execution_tree: { id, type: "Epic", record_ref: `openproject://work_packages/${id}`, subject: "Synthetic initiative", children: [] }, dependency_relations: [] } },
  };
}
export function draft(id, overrides = {}) {
  return { requestId: `start-${id}`, initiativeId: id, expectedSourceVersion: revision, purpose: "Read-only qualification.", approved: true, issuedAt: now, ...overrides };
}
export function runProjection(request) {
  const digest = `sha256:${"b".repeat(64)}`;
  return {
    activation_evidence_digest: digest, schema_version: 1, request_id: request.request_id,
    run_id: `oos:validation-readiness-run:v1:${request.idempotency_key}`, workflow_id: "workflow:synthetic",
    definition_id: request.definition_id, definition_version: 1, source_domain: request.source_domain,
    source_record_ref: request.source_record_ref, source_version_ref: request.source_version_ref, intent_digest: request.intent_digest,
    correlation_ref: request.correlation_ref, causation_ref: request.causation_ref, caller_ref: config.callerId,
    operator_ref: request.operator_id, approval_ref: request.approval_refs[0].decision_ref, state: "running",
    current_node: { node_id: "wgcf-validation-readiness", node_type: "activity", label: "Evaluate readiness", owner: "workspace-governance-control-fabric", state: "running", attempt: 1 },
    progress: { planned: 1, active: 1, completed: 0, skipped: 0, failed: 0 }, wait: null, blocker: null, failure: null,
    retry_status: { attempts: 1, max_attempts: 3, retry_available: false, next_eligible_at: null }, effect_posture: "possible",
    control_availability: [{ action: "cancel", authority: "operator", available: true, disabled_reason: null, expected_effect: "Stop future work." }],
    artifact_refs: [], log_refs: [], receipt_refs: [], event_refs: ["event:synthetic:1"],
    events: [{ event_id: "event:synthetic:1", sequence: 1, state: "running", node_id: "wgcf-validation-readiness", summary: "Run started.", occurred_at: now }],
    controls: [], aggregate_receipt: null, source_projection_ref: request.source_projection_ref, source_projection_version: request.source_projection_version,
    runtime: { activation_evidence_digest: digest, adapter: "temporal", execution_run_id: "temporal:synthetic", workflow_type: "validationReadinessRunV1", workflow_task_queue: `oos.validation-readiness-run.v1.${"b".repeat(64)}`, activity_name: "wgcf.validation-readiness.evaluate", activity_task_queue: "wgcf.validation-readiness.v1" },
    created_at: now, last_projected_at: now, completed_at: null,
  };
}
