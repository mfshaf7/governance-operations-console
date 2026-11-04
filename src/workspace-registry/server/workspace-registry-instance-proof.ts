import type {
  InstanceInventoryPreparationBase, InstanceInventoryRequest, WorkspaceInventoryLifecycleAction,
} from "../model/workspace-registry-types.ts";

type Wire = Record<string, unknown>;
type Digest = (value: unknown) => string;
const object = (value: unknown): value is Wire => typeof value === "object" && value !== null && !Array.isArray(value);
function invalid(): never { throw new Error("Internal Inventory evidence does not bind its original accepted change."); }

export function buildInstanceInventoryCommand(input: Readonly<{
  preparation: InstanceInventoryPreparationBase;
  requestId: string;
  action: "promote" | WorkspaceInventoryLifecycleAction;
  requestedValue: Readonly<Record<string, unknown>> | null;
  approvalRefs: readonly string[];
  impactAcknowledgements: readonly string[];
  reason: string | null;
  callerId: string;
  now: Date;
}>, digest: Digest) {
  const { preparation, requestId, action, callerId } = input, at = input.now.toISOString();
  const body = { schema_version: 1 as const, artifact_type: "instance-repository-inventory-request" as const,
    instance_id: preparation.canonical_authority.instance_id, request_id: requestId, requested_at: at,
    operator_ref: callerId, operator_acceptance: { state: "accepted" as const, operator_ref: callerId, recorded_at: at },
    correlation_ref: `console:workspace-registry:${preparation.target.record_id}`, idempotency_key: `${requestId}:v1`, action,
    target: preparation.target, expected_state: preparation.expected_state, requested_value: input.requestedValue,
    prior_receipt_digest: action === "restore" ? preparation.latest_receipt_ref.digest : null,
    reason: input.reason, impact_acknowledgements: input.impactAcknowledgements, approval_refs: input.approvalRefs,
    policy_ref: preparation.policy_ref };
  const request: InstanceInventoryRequest = { ...body, request_digest: digest(body) };
  const lane = action === "promote" ? "" : "lifecycle/";
  return { authority_revision: preparation.authority_revision, request,
    session_ref: `console://workspace-registry/${lane}sessions/${encodeURIComponent(requestId)}`,
    execution_ref: `console://workspace-registry/${lane}executions/${encodeURIComponent(requestId)}` };
}

export function verifyInstanceInventoryResult(value: unknown, digest: Digest) {
  if (!object(value) || value.authority_kind !== "internal-instance-record") return;
  if (!object(value.request)) invalid();
  const { request_digest: expected, ...input } = value.request;
  if (digest(input) !== expected) invalid();
  if (value.status !== "succeeded") return;
  if (!object(value.receipt) || !object(value.readback) || !object(value.readback.record) || !object(value.readback.receipt)) invalid();
  const { receipt_digest: receiptDigest, ...receiptBody } = value.receipt;
  const record = value.readback.record, envelope = record.record;
  if (digest(receiptBody) !== receiptDigest || digest(value.receipt) !== digest(value.readback.receipt) || digest(record) !== value.receipt.record_digest ||
      !object(envelope) || !object(envelope.last_mutation) || !object(value.request.target) || !object(value.request.expected_state) || !object(value.request.policy_ref)) invalid();
  const request = value.request as InstanceInventoryRequest, receipt = value.receipt;
  const decision = digest({ request_ref: { id: request.request_id, digest: request.request_digest }, operator_acceptance: request.operator_acceptance });
  const posture = { promote: "active", suspend: "suspended", retire: "retired", restore: "active", update: request.requested_value?.posture }[request.action];
  if (receipt.version !== request.expected_state.record_version + 1 || envelope.id !== request.target.record_id || envelope.version !== receipt.version ||
      receipt.decision_digest !== decision || receipt.policy_ref !== `git://workspace-governance/${request.policy_ref.revision}/contracts/instance-operational-records.yaml@${request.policy_ref.contract_digest}` ||
      record.phase !== "inventory" || record.posture !== posture || record.lifecycle !== posture ||
      envelope.last_mutation.request_digest !== request.request_digest || envelope.last_mutation.idempotency_key !== request.idempotency_key) invalid();
  if (request.requested_value) for (const [key, expectedValue] of Object.entries(request.requested_value)) {
    if (digest(record[key]) !== digest(expectedValue)) invalid();
  }
}

export function verifyInstanceInventoryPreparation(value: unknown, digest: Digest) {
  if (!object(value) || value.authority_kind !== "internal-instance-record") return;
  const phase = value.workflow_id === "workspace-inventory-promotion" ? "intake" : "inventory";
  if (!object(value.current_record) || !object(value.expected_state) ||
      digest({ phase, ...value.current_record }) !== value.expected_state.record_digest) invalid();
  if (phase === "intake") {
    if (!object(value.candidate)) invalid();
    const { candidate_digest: expected, ...candidate } = value.candidate;
    if (digest(candidate) !== expected) invalid();
  }
}

export function sameInstanceInventoryInput(left: unknown, right: unknown, digest: Digest) {
  const semantic = (value: unknown) => {
    if (!object(value) || !object(value.request) || !object(value.request.operator_acceptance)) invalid();
    const { request_digest: _digest, requested_at: _at, operator_acceptance: acceptance, ...input } = value.request;
    const { recorded_at: _recorded, ...operator } = acceptance as Wire;
    return { request: { ...input, operator_acceptance: operator }, session_ref: value.session_ref, execution_ref: value.execution_ref };
  };
  return digest(semantic(left)) === digest(semantic(right));
}
