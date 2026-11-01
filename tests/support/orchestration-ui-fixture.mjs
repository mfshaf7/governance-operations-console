// Synthetic owner wire data for browser tests only; never imported by runtime.
import { definition, now } from "../orchestration/orchestration-start-fixtures.mjs";
export { definition };
export function retainedRun() {
  const digest = `sha256:${"a".repeat(64)}`;
  return {
    activation_evidence_digest: digest, schema_version: 1, request_id: "request:synthetic", run_id: "run:synthetic", workflow_id: "workflow:synthetic",
    definition_id: "validation-readiness-run", definition_version: 1, source_domain: "workspace-governance-control-fabric", source_record_ref: "art:delivery-512", source_version_ref: "source:v1",
    intent_digest: digest, correlation_ref: "correlation:synthetic", causation_ref: "causation:synthetic", caller_ref: "governance-operations-console", operator_ref: "operator:synthetic", approval_ref: "approval:synthetic", state: "running",
    current_node: { node_id: "wgcf-validation-readiness", node_type: "activity", label: "Evaluate readiness", owner: "workspace-governance-control-fabric", state: "running", attempt: 1 },
    progress: { planned: 1, active: 1, completed: 0, skipped: 0, failed: 0 }, wait: null, blocker: null, failure: null,
    retry_status: { attempts: 1, max_attempts: 3, retry_available: false, next_eligible_at: null }, effect_posture: "possible",
    control_availability: [{ action: "cancel", authority: "operator", available: true, disabled_reason: null, expected_effect: "Stop future execution without claiming rollback." }],
    artifact_refs: [], log_refs: [], receipt_refs: [], event_refs: ["event:synthetic"],
    events: [{ event_id: "event:synthetic", sequence: 1, state: "running", node_id: "wgcf-validation-readiness", summary: "Run started.", occurred_at: now }],
    controls: [{ schema_version: 1, control_id: "control:retained", action: "resume", operator_id: "operator:synthetic", reason_ref: "reason:synthetic", idempotency_key: "control:retained", recorded_at: now }],
    aggregate_receipt: null, source_projection_ref: "projection:synthetic", source_projection_version: "projection:v1",
    runtime: { activation_evidence_digest: digest, adapter: "temporal", execution_run_id: "temporal:synthetic", workflow_type: "validationReadinessRunV1", workflow_task_queue: `oos.validation-readiness-run.v1.${"a".repeat(64)}`, activity_name: "wgcf.validation-readiness.evaluate", activity_task_queue: "wgcf.validation-readiness.v1" },
    created_at: now, last_projected_at: now, completed_at: null,
  };
}

export function ownerWorkspace({ empty = false, denied = false } = {}) {
  const entry = definition();
  if (denied) { entry.admission.start_allowed = false; entry.admission.gates[0].satisfied = false; }
  return { mode: "live", status: "current", error: null, observedAt: now, definitions: empty ? [] : [entry], runs: empty ? [] : [retainedRun()] };
}
