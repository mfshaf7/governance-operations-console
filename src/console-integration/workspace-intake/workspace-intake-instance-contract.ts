import type { InstanceIntakeReceipt, InstanceRecordAuthority } from "./workspace-intake-live-types.ts";

type Wire = Record<string, unknown>;
type Fail = (message: string) => Error;
const digest = /^sha256:[0-9a-f]{64}$/;
const instance = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;
const recordId = /^repo:[a-z0-9][a-z0-9._-]{0,185}$/;
const object = (v: unknown): v is Wire => typeof v === "object" && v !== null && !Array.isArray(v);
const keys = (v: Wire, names: string[]) => Object.keys(v).sort().join(",") === names.sort().join(",");
const text = (v: unknown, max = 256): v is string => typeof v === "string" && v.trim().length > 0 && v.length <= max;

export function assertInstanceAuthority(value: unknown, fail: Fail): InstanceRecordAuthority {
  if (!object(value) || !keys(value, ["kind", "instance_id", "record_id"]) || value.kind !== "internal-instance-record" ||
      typeof value.instance_id !== "string" || !instance.test(value.instance_id) ||
      typeof value.record_id !== "string" || !recordId.test(value.record_id)) {
    throw fail("Internal registration authority is invalid.");
  }
  return value as InstanceRecordAuthority;
}

export function assertInstancePreparationFields(value: Wire, fail: Fail) {
  const authority = assertInstanceAuthority(value.canonical_authority, fail);
  const policy = value.policy_ref, expected = value.expected_state;
  if (value.authority_kind !== "internal-instance-record" || !text(value.custody_request_id) ||
      !object(policy) || !keys(policy, ["repo", "revision", "contract_digest"]) || policy.repo !== "workspace-governance" ||
      policy.revision !== value.authority_revision || !digest.test(String(policy.contract_digest)) ||
      !object(expected) || !keys(expected, ["record_version", "record_digest"]) ||
      !((expected.record_version === null && expected.record_digest === null) ||
        (Number.isSafeInteger(expected.record_version) && Number(expected.record_version) >= 1 && digest.test(String(expected.record_digest))))) {
    throw fail("Internal registration policy or current record binding is invalid.");
  }
  return { canonical_authority: authority,
    custody_request_id: value.custody_request_id,
    policy_ref: { repo: "workspace-governance" as const, revision: String(policy.revision), contract_digest: String(policy.contract_digest) },
    expected_state: { record_version: expected.record_version as number | null, record_digest: expected.record_digest as string | null } };
}

export function assertInstanceReceipt(value: unknown, authority: InstanceRecordAuthority, fail: Fail): InstanceIntakeReceipt {
  const required = ["schema_version", "artifact_type", "authority", "instance_id", "record_id", "version", "record_digest", "previous",
    "idempotency_key", "command_digest", "actor", "action", "accepted_at", "policy_ref", "decision_digest", "readiness_digest", "operator_ref", "receipt_digest"];
  if (!object(value) || !keys(value, [...required, ...(value.ai_decision_id === undefined ? [] : ["ai_decision_id"])]) ||
      value.schema_version !== 1 || value.artifact_type !== "instance-operational-record-receipt" || value.authority !== authority.kind ||
      value.instance_id !== authority.instance_id || value.record_id !== authority.record_id ||
      !Number.isSafeInteger(value.version) || Number(value.version) < 1 ||
      !["record_digest", "command_digest", "decision_digest", "readiness_digest", "receipt_digest"].every(key => digest.test(String(value[key]))) ||
      !["idempotency_key", "actor", "operator_ref"].every(key => text(value[key])) || !text(value.action, 64) ||
      !text(value.policy_ref, 512) || !text(value.accepted_at) || Number.isNaN(Date.parse(value.accepted_at)) ||
      (value.ai_decision_id !== undefined && !text(value.ai_decision_id)) ||
      !object(value.previous) || !keys(value.previous, ["version", "digest"]) ||
      !(value.version === 1 ? value.previous.version === null && value.previous.digest === null :
        value.previous.version === Number(value.version) - 1 && digest.test(String(value.previous.digest)))) {
    throw fail("Internal registration receipt is invalid or belongs to another record.");
  }
  return value as InstanceIntakeReceipt;
}

export function assertInstanceResult(value: Wire, fail: Fail) {
  const authority = assertInstanceAuthority(value.canonical_authority, fail);
  const terminal = ["succeeded", "cancelled", "rejected", "requires-action"].includes(String(value.status));
  if (value.review !== null || value.readiness != null || typeof value.cancel_allowed !== "boolean" ||
      (terminal && value.cancel_allowed) || ["review-and-merge", "inspect-review-or-cancel"].includes(String(value.next_action)) ||
      value.status === "review-required") throw fail("Internal registration must retain its storage authority and cancellation boundary.");
  const receipt = value.receipt === null ? null : assertInstanceReceipt(value.receipt, authority, fail);
  if (value.status === "succeeded") {
    if (!receipt || !object(value.readback) || !keys(value.readback, ["record", "receipt"]) || !object(value.readback.record) ||
        !object(value.readback.receipt) || value.readback.receipt.receipt_digest !== receipt.receipt_digest) {
      throw fail("Completed internal registration requires its original durable record and receipt.");
    }
  } else if (receipt || value.readback !== null) throw fail("Unconfirmed internal registration cannot claim a stored outcome.");
  return { authority_kind: "internal-instance-record" as const, canonical_authority: authority, cancel_allowed: value.cancel_allowed, receipt };
}
