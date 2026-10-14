import type { OosOrchestrationDefinition, OosOrchestrationRun } from "./orchestration-live-types.ts";

const runStates = new Set(["blocked", "cancelled", "completed", "failed", "queued", "running", "waiting"]);

export function assertOosOrchestrationDefinitions(value: unknown): OosOrchestrationDefinition[] {
  const source = record(value, "definition list");
  exact(source, ["schema_version", "definitions"], "definition list");
  if (source.schema_version !== 1 || !Array.isArray(source.definitions) || source.definitions.length > 100) invalid("definition list");
  const definitions = source.definitions.map((candidate, index) => assertDefinition(candidate, index));
  if (new Set(definitions.map((definition) => `${definition.definition_id}:${definition.definition_version}`)).size !== definitions.length) invalid("duplicate definition identity");
  return definitions;
}

export function assertOosOrchestrationRuns(value: unknown): OosOrchestrationRun[] {
  const source = record(value, "run list");
  exact(source, ["schema_version", "runs"], "run list");
  if (source.schema_version !== 1 || !Array.isArray(source.runs) || source.runs.length > 100) invalid("run list");
  const runs = source.runs.map((candidate, index) => assertRun(candidate, index));
  if (new Set(runs.map((run) => run.run_id)).size !== runs.length) invalid("duplicate run identity");
  return runs;
}

export function assertOosOrchestrationRun(value: unknown): OosOrchestrationRun { return assertRun(value, 0); }

function assertDefinition(value: unknown, index: number): OosOrchestrationDefinition {
  const source = record(value, `definition[${index}]`);
  const required = ["schema_version", "definition_id", "definition_version", "title", "purpose", "qualification", "lifecycle", "source_domain", "source_record_type", "business_owner", "implementation_repo", "execution_owner", "execution_node_owners", "trigger", "approval_requirements", "source_version_refs", "idempotency_strategy", "lock_strategy", "execution_graph", "wait_and_signal_contract", "retry_and_timeout_contract", "compensation_strategy", "cancellation_boundary", "completion_condition", "expected_receipt", "return_projection", "evidence_and_retention", "security_requirements", "rollout_and_rollback", "admission"];
  exact(source, required, `definition[${index}]`);
  const admission = record(source.admission, "definition admission");
  exact(admission, ["start_allowed", "gates"], "definition admission");
  if (source.schema_version !== 1 || source.definition_id !== "validation-readiness-run" || source.definition_version !== 1 || !text(source.title) || !text(source.purpose) || source.qualification !== "durable-candidate" || !new Set(["active", "admission-review"]).has(String(source.lifecycle)) || source.source_domain !== "workspace-governance-control-fabric" || source.source_record_type !== "workspace-delivery-art-initiative" || source.business_owner !== "workspace-governance" || source.implementation_repo !== "operator-orchestration-service" || source.execution_owner !== "operator-orchestration-service" || !Array.isArray(source.execution_node_owners) || source.execution_node_owners.length === 0 || source.execution_node_owners.some((owner) => !identifier(owner)) || !Array.isArray(source.execution_graph) || source.execution_graph.length === 0 || !Array.isArray(source.approval_requirements) || source.approval_requirements.length === 0 || source.approval_requirements.some((requirement) => !identifier(requirement)) || !isPlainObject(source.trigger) || !isPlainObject(source.source_version_refs) || !isPlainObject(source.idempotency_strategy) || !isPlainObject(source.lock_strategy) || !isPlainObject(source.wait_and_signal_contract) || !isPlainObject(source.retry_and_timeout_contract) || !isPlainObject(source.compensation_strategy) || !text(source.cancellation_boundary) || !text(source.completion_condition) || source.expected_receipt !== "orchestration-validation-readiness-receipt" || source.return_projection !== "oos.validation-readiness-run.v1" || !isPlainObject(source.evidence_and_retention) || !isPlainObject(source.security_requirements) || JSON.stringify(source.security_requirements.allowed_caller_ids) !== JSON.stringify(["governance-operations-console"]) || !isPlainObject(source.rollout_and_rollback) || typeof admission.start_allowed !== "boolean" || !Array.isArray(admission.gates) || admission.gates.length !== 14) invalid(`definition[${index}]`);
  source.execution_graph.forEach((raw, nodeIndex) => {
    const node = record(raw, `definition[${index}].execution_graph[${nodeIndex}]`);
    exact(node, ["node_id", "node_type", "label", "owner", "adapter", "task_queue", "activity_name", "dependencies", "optional"], `definition[${index}].execution_graph[${nodeIndex}]`);
    if (!identifier(node.node_id) || !["activity", "subworkflow", "wait"].includes(String(node.node_type)) || !text(node.label) || !identifier(node.owner) || !identifier(node.adapter) || !identifier(node.task_queue) || !identifier(node.activity_name) || !Array.isArray(node.dependencies) || node.dependencies.some((dependency) => !identifier(dependency)) || typeof node.optional !== "boolean") invalid(`definition[${index}].execution_graph[${nodeIndex}]`);
  });
  admission.gates.forEach((raw, gateIndex) => {
    const gate = record(raw, `gate[${gateIndex}]`);
    exact(gate, ["gate_id", "satisfied", "owner", "detail"], `gate[${gateIndex}]`);
    if (!identifier(gate.gate_id) || typeof gate.satisfied !== "boolean" || !identifier(gate.owner) || !text(gate.detail)) invalid(`gate[${gateIndex}]`);
  });
  if (new Set(admission.gates.map((raw) => (raw as Record<string, unknown>).gate_id)).size !== admission.gates.length) invalid("duplicate admission gate identity");
  return value as OosOrchestrationDefinition;
}

function assertRun(value: unknown, index: number): OosOrchestrationRun {
  const source = record(value, `run[${index}]`);
  const required = ["activation_evidence_digest", "schema_version", "request_id", "run_id", "workflow_id", "definition_id", "definition_version", "source_domain", "source_record_ref", "source_version_ref", "intent_digest", "correlation_ref", "causation_ref", "caller_ref", "operator_ref", "approval_ref", "state", "current_node", "progress", "wait", "blocker", "failure", "retry_status", "effect_posture", "control_availability", "artifact_refs", "log_refs", "receipt_refs", "event_refs", "events", "controls", "aggregate_receipt", "source_projection_ref", "source_projection_version", "runtime", "created_at", "last_projected_at", "completed_at"];
  exact(source, required, `run[${index}]`);
  if (source.schema_version !== 1 || !digest(source.activation_evidence_digest) || !identifier(source.request_id) || !identifier(source.run_id) || !identifier(source.workflow_id) || !identifier(source.definition_id) || !positiveInteger(source.definition_version) || !identifier(source.source_domain) || !identifier(source.source_record_ref) || !identifier(source.source_version_ref) || !digest(source.intent_digest) || !identifier(source.correlation_ref) || !identifier(source.causation_ref) || !identifier(source.caller_ref) || !identifier(source.operator_ref) || !identifier(source.approval_ref) || !runStates.has(String(source.state)) || !identifier(source.source_projection_ref) || !identifier(source.source_projection_version) || !timestamp(source.created_at) || !timestamp(source.last_projected_at) || (source.completed_at !== null && !timestamp(source.completed_at))) invalid(`run[${index}]`);
  validateCurrentNode(source.current_node, index);
  validateProgress(source.progress, index);
  validateWait(source.wait, index);
  validateBlocker(source.blocker, index);
  validateFailure(source.failure, index);
  validateRetry(source.retry_status, index);
  if (!["none", "possible", "partial", "verified"].includes(String(source.effect_posture))) invalid(`run[${index}].effect_posture`);
  validateControlAvailability(source.control_availability, index);
  validateIdentifierArray(source.artifact_refs, `run[${index}].artifact_refs`, 64);
  validateIdentifierArray(source.log_refs, `run[${index}].log_refs`, 64);
  validateReceiptRefs(source.receipt_refs, index);
  validateIdentifierArray(source.event_refs, `run[${index}].event_refs`, 64);
  validateEvents(source.events, index);
  validateRecordedControls(source.controls, index);
  validateAggregateReceipt(source.aggregate_receipt, source, index);
  validateRuntime(source.runtime, source.activation_evidence_digest, index);
  return value as OosOrchestrationRun;
}

function validateCurrentNode(value: unknown, runIndex: number) {
  const node = record(value, `run[${runIndex}].current_node`);
  exact(node, ["node_id", "node_type", "label", "owner", "state", "attempt"], `run[${runIndex}].current_node`);
  if (!identifier(node.node_id) || !["activity", "subworkflow", "wait"].includes(String(node.node_type)) || !text(node.label) || !identifier(node.owner) || !runStates.has(String(node.state)) || !nonNegativeInteger(node.attempt)) invalid(`run[${runIndex}].current_node`);
}
function validateProgress(value: unknown, runIndex: number) {
  const progress = record(value, `run[${runIndex}].progress`);
  exact(progress, ["planned", "active", "completed", "skipped", "failed"], `run[${runIndex}].progress`);
  if (Object.values(progress).some((entry) => !nonNegativeInteger(entry))) invalid(`run[${runIndex}].progress`);
}
function validateWait(value: unknown, runIndex: number) {
  if (value === null) return;
  const wait = record(value, `run[${runIndex}].wait`);
  exact(wait, ["wait_id", "kind", "owner", "reason_ref", "expected_signal", "entered_at", "deadline", "timeout_behavior"], `run[${runIndex}].wait`);
  if (!identifier(wait.wait_id) || !["authority-decision", "dependency", "external-event", "timer"].includes(String(wait.kind)) || !identifier(wait.owner) || !identifier(wait.reason_ref) || !text(wait.expected_signal) || !timestamp(wait.entered_at) || (wait.deadline !== null && !timestamp(wait.deadline)) || !identifier(wait.timeout_behavior)) invalid(`run[${runIndex}].wait`);
}
function validateBlocker(value: unknown, runIndex: number) {
  if (value === null) return;
  const blocker = record(value, `run[${runIndex}].blocker`);
  exact(blocker, ["blocker_id", "owner", "status_code", "detail", "remediation", "supported_dispositions", "evidence_refs"], `run[${runIndex}].blocker`);
  if (!identifier(blocker.blocker_id) || !identifier(blocker.owner) || !identifier(blocker.status_code) || !text(blocker.detail) || !text(blocker.remediation) || !Array.isArray(blocker.supported_dispositions) || blocker.supported_dispositions.length > 8 || new Set(blocker.supported_dispositions).size !== blocker.supported_dispositions.length || blocker.supported_dispositions.some((entry) => !["remove", "workaround", "accept-risk", "defer"].includes(String(entry)))) invalid(`run[${runIndex}].blocker`);
  validateIdentifierArray(blocker.evidence_refs, `run[${runIndex}].blocker.evidence_refs`, 64);
}
function validateFailure(value: unknown, runIndex: number) {
  if (value === null) return;
  const failure = record(value, `run[${runIndex}].failure`);
  exact(failure, ["failure_id", "failed_node_id", "owner", "failure_type", "detail", "retryable", "retry_exhausted"], `run[${runIndex}].failure`);
  if (!identifier(failure.failure_id) || !identifier(failure.failed_node_id) || !identifier(failure.owner) || !identifier(failure.failure_type) || !text(failure.detail) || typeof failure.retryable !== "boolean" || typeof failure.retry_exhausted !== "boolean") invalid(`run[${runIndex}].failure`);
}
function validateRetry(value: unknown, runIndex: number) {
  const retry = record(value, `run[${runIndex}].retry_status`);
  exact(retry, ["attempts", "max_attempts", "retry_available", "next_eligible_at"], `run[${runIndex}].retry_status`);
  if (!nonNegativeInteger(retry.attempts) || !positiveInteger(retry.max_attempts) || Number(retry.attempts) > Number(retry.max_attempts) || typeof retry.retry_available !== "boolean" || (retry.next_eligible_at !== null && !timestamp(retry.next_eligible_at))) invalid(`run[${runIndex}].retry_status`);
}
function validateControlAvailability(value: unknown, runIndex: number) {
  if (!Array.isArray(value) || value.length > 5) invalid(`run[${runIndex}].control_availability`);
  const actions = new Set<string>();
  value.forEach((raw, controlIndex) => {
    const control = record(raw, `run[${runIndex}].control_availability[${controlIndex}]`);
    exact(control, ["action", "authority", "available", "disabled_reason", "expected_effect"], `run[${runIndex}].control_availability[${controlIndex}]`);
    if (!["retry", "resume", "signal", "cancel", "defer"].includes(String(control.action)) || control.authority !== "operator" || typeof control.available !== "boolean" || (control.disabled_reason !== null && !text(control.disabled_reason)) || !text(control.expected_effect) || actions.has(String(control.action))) invalid(`run[${runIndex}].control_availability[${controlIndex}]`);
    actions.add(String(control.action));
  });
}
function validateReceiptRefs(value: unknown, runIndex: number) {
  if (!Array.isArray(value) || value.length > 64) invalid(`run[${runIndex}].receipt_refs`);
  value.forEach((raw, receiptIndex) => {
    const receipt = record(raw, `run[${runIndex}].receipt_refs[${receiptIndex}]`);
    exact(receipt, ["receipt_id", "digest"], `run[${runIndex}].receipt_refs[${receiptIndex}]`);
    if (!identifier(receipt.receipt_id) || !digest(receipt.digest)) invalid(`run[${runIndex}].receipt_refs[${receiptIndex}]`);
  });
}
function validateEvents(value: unknown, runIndex: number) {
  if (!Array.isArray(value) || value.length > 64) invalid(`run[${runIndex}].events`);
  value.forEach((raw, eventIndex) => {
    const event = record(raw, `run[${runIndex}].events[${eventIndex}]`);
    exact(event, ["event_id", "sequence", "state", "node_id", "summary", "occurred_at"], `run[${runIndex}].events[${eventIndex}]`);
    if (!identifier(event.event_id) || event.sequence !== eventIndex + 1 || !runStates.has(String(event.state)) || !identifier(event.node_id) || !text(event.summary) || !timestamp(event.occurred_at)) invalid(`run[${runIndex}].events[${eventIndex}]`);
  });
}
function validateRecordedControls(value: unknown, runIndex: number) {
  if (!Array.isArray(value) || value.length > 16) invalid(`run[${runIndex}].controls`);
  value.forEach((raw, controlIndex) => {
    const control = record(raw, `run[${runIndex}].controls[${controlIndex}]`);
    exact(control, ["schema_version", "control_id", "action", "operator_id", "reason_ref", "idempotency_key", "recorded_at"], `run[${runIndex}].controls[${controlIndex}]`);
    if (control.schema_version !== 1 || !identifier(control.control_id) || !["retry", "resume", "signal", "cancel", "defer"].includes(String(control.action)) || !identifier(control.operator_id) || !identifier(control.reason_ref) || !identifier(control.idempotency_key) || !timestamp(control.recorded_at)) invalid(`run[${runIndex}].controls[${controlIndex}]`);
  });
}
function validateAggregateReceipt(value: unknown, source: Record<string, unknown>, runIndex: number) {
  if (value === null) { if (["completed", "failed", "cancelled"].includes(String(source.state))) invalid(`run[${runIndex}].aggregate_receipt`); return; }
  const receipt = record(value, `run[${runIndex}].aggregate_receipt`);
  exact(receipt, ["activation_evidence_digest", "receipt_id", "receipt_type", "outcome", "request_id", "run_id", "source_record_ref", "source_version_ref", "intent_digest", "caller_ref", "operator_ref", "approval_ref", "source_projection_ref", "source_projection_version", "receipt_refs", "artifact_refs", "recorded_at"], `run[${runIndex}].aggregate_receipt`);
  if (!digest(receipt.activation_evidence_digest) || !identifier(receipt.receipt_id) || receipt.receipt_type !== "orchestration-validation-readiness-receipt" || !["completed", "cancelled-no-effect", "cancelled-with-retained-evidence", "failed-no-effect", "failed-with-retained-evidence"].includes(String(receipt.outcome)) || receipt.request_id !== source.request_id || receipt.run_id !== source.run_id || receipt.source_record_ref !== source.source_record_ref || receipt.source_version_ref !== source.source_version_ref || receipt.intent_digest !== source.intent_digest || receipt.caller_ref !== source.caller_ref || receipt.operator_ref !== source.operator_ref || receipt.approval_ref !== source.approval_ref || receipt.source_projection_ref !== source.source_projection_ref || receipt.source_projection_version !== source.source_projection_version || !timestamp(receipt.recorded_at)) invalid(`run[${runIndex}].aggregate_receipt`);
  validateReceiptRefs(receipt.receipt_refs, runIndex);
  validateIdentifierArray(receipt.artifact_refs, `run[${runIndex}].aggregate_receipt.artifact_refs`, 64);
}
function validateRuntime(value: unknown, activationDigest: unknown, runIndex: number) {
  const runtime = record(value, `run[${runIndex}].runtime`);
  exact(runtime, ["activation_evidence_digest", "adapter", "execution_run_id", "workflow_type", "workflow_task_queue", "activity_name", "activity_task_queue"], `run[${runIndex}].runtime`);
  if (runtime.activation_evidence_digest !== activationDigest || runtime.adapter !== "temporal" || !identifier(runtime.execution_run_id) || runtime.workflow_type !== "validationReadinessRunV1" || typeof runtime.workflow_task_queue !== "string" || !/^oos\.validation-readiness-run\.v1\.[0-9a-f]{64}$/.test(runtime.workflow_task_queue) || runtime.activity_name !== "wgcf.validation-readiness.evaluate" || runtime.activity_task_queue !== "wgcf.validation-readiness.v1") invalid(`run[${runIndex}].runtime`);
}
function validateIdentifierArray(value: unknown, label: string, maxItems: number) { if (!Array.isArray(value) || value.length > maxItems || value.some((entry) => !identifier(entry))) invalid(label); }

function record(value: unknown, label: string): Record<string, unknown> { if (!value || typeof value !== "object" || Array.isArray(value)) invalid(label); return value as Record<string, unknown>; }
function isPlainObject(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function exact(value: Record<string, unknown>, fields: readonly string[], label: string) { if (Object.keys(value).some((key) => !fields.includes(key)) || fields.some((key) => !Object.hasOwn(value, key))) invalid(label); }
function text(value: unknown): value is string { return typeof value === "string" && value.length > 0 && value.length <= 8192; }
function identifier(value: unknown): value is string { return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:/@+\-]{0,255}$/.test(value); }
function digest(value: unknown): value is string { return typeof value === "string" && /^sha256:[0-9a-f]{64}$/.test(value); }
function nonNegativeInteger(value: unknown) { return Number.isSafeInteger(value) && Number(value) >= 0; }
function positiveInteger(value: unknown) { return Number.isSafeInteger(value) && Number(value) >= 1; }
function timestamp(value: unknown) { return text(value) && !Number.isNaN(Date.parse(value)); }
function invalid(label: string): never { throw new Error(`OOS orchestration ${label} is malformed.`); }
