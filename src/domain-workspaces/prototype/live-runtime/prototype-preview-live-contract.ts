import { createHash } from "node:crypto";

import type {
  PrototypePreviewCommandIntent,
  PrototypePreviewOwnerCommandResult,
  PrototypePreviewOwnerProjection,
  PrototypePreviewOwnerProof,
  PrototypePreviewOwnerReceipt,
  PrototypePreviewOwnerReceiptRef,
  PrototypePreviewOwnerRuntimeState,
} from "./prototype-preview-live-types.ts";

const digestPattern = /^sha256:[a-f0-9]{64}$/;
const revisionPattern = /^[a-f0-9]{40}$/;
const safeIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const safeSlugPattern = /^[a-z0-9][a-z0-9-]{2,63}$/;
const runtimeStates = new Set(["running", "stale", "stopped"]);
const receiptActions = new Set(["restart", "start", "stop"]);

export class PrototypePreviewContractError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "PrototypePreviewContractError";
    this.code = code;
  }
}

export function assertPrototypePreviewSlug(value: string) {
  const slug = value.replace(/^prototype[:-]/, "");
  if (!safeSlugPattern.test(slug)) {
    throw new PrototypePreviewContractError(
      "prototype_preview_identity_invalid",
      "Preview Runtime requires a safe Prototype identity.",
    );
  }
  return slug;
}

export function assertPrototypePreviewProjection(
  value: unknown,
  expected: { prototypeSlug: string; sourceRevision: string },
): PrototypePreviewOwnerProjection {
  const record = object(value, "Prototype Preview projection");
  const boundary = object(record.boundary, "Prototype Preview boundary");
  const runtimeState = runtimeStateValue(record.runtime_state);
  const endpoint = nullableString(record.endpoint, "endpoint");
  const instanceId = nullableString(record.instance_id, "instance_id");
  const latestReceipt = nullableReceiptRef(record.latest_receipt);
  const actions = stringArray(record.operator_actions, "operator_actions");
  const expectedActions = ["start", "status", "restart", "stop", "proof"];
  if (
    record.schema_version !== 1 ||
    record.profile_id !== expected.prototypeSlug ||
    record.prototype_id !== `prototype:${expected.prototypeSlug}` ||
    record.source_revision !== expected.sourceRevision ||
    record.maturity_claim !== "prototype-preview-only" ||
    !digestPattern.test(string(record.profile_digest, "profile_digest")) ||
    !digestPattern.test(string(record.source_digest, "source_digest")) ||
    JSON.stringify(actions) !== JSON.stringify(expectedActions) ||
    boundary.public_ingress !== false ||
    boundary.external_network !== false ||
    boundary.mutation_boundary !== "none" ||
    boundary.persistence_model !== "runtime-metadata-only" ||
    !new Set(["mock", "synthetic"]).has(String(boundary.data_mode)) ||
    !new Set(["private-internal", "operator-review"]).has(String(boundary.visibility_tier))
  ) {
    throw invalid("Studio Preview projection violates its bounded owner contract.");
  }
  if (runtimeState === "running") {
    let parsed: URL;
    try {
      parsed = new URL(endpoint ?? "");
    } catch {
      throw invalid("Running Preview projection has an invalid endpoint.");
    }
    if (parsed.protocol !== "http:" || parsed.hostname !== "127.0.0.1" || !instanceId) {
      throw invalid("Running Preview projection is not loopback and instance bound.");
    }
  } else if (endpoint !== null || instanceId !== null) {
    throw invalid("Inactive Preview projection exposes a live endpoint or instance.");
  }
  return record as PrototypePreviewOwnerProjection;
}

export function assertPrototypePreviewCommandIntent(
  value: unknown,
): PrototypePreviewCommandIntent {
  const record = object(value, "Preview Runtime command");
  const expected = object(record.expected, "Preview Runtime expected state");
  const action = string(record.action, "action");
  const requestId = string(record.request_id, "request_id");
  if (!receiptActions.has(action) || !safeIdPattern.test(requestId)) {
    throw new PrototypePreviewContractError(
      "prototype_preview_command_invalid",
      "Preview Runtime command action or request identity is invalid.",
    );
  }
  const sourceRevision = string(expected.source_revision, "expected.source_revision");
  const profileDigest = string(expected.profile_digest, "expected.profile_digest");
  if (!revisionPattern.test(sourceRevision) || !digestPattern.test(profileDigest)) {
    throw invalid("Preview Runtime expected source binding is invalid.");
  }
  return {
    action: action as PrototypePreviewCommandIntent["action"],
    expected: {
      instance_id: nullableString(expected.instance_id, "expected.instance_id"),
      profile_digest: profileDigest,
      runtime_state: runtimeStateValue(expected.runtime_state),
      source_revision: sourceRevision,
    },
    request_id: requestId,
  };
}

export function samePrototypePreviewState(
  projection: PrototypePreviewOwnerProjection,
  expected: PrototypePreviewCommandIntent["expected"],
) {
  return (
    projection.instance_id === expected.instance_id &&
    projection.profile_digest === expected.profile_digest &&
    projection.runtime_state === expected.runtime_state &&
    projection.source_revision === expected.source_revision
  );
}

export function assertPrototypePreviewCommandResult(
  value: unknown,
  expected: { prototypeSlug: string; requestId: string; sourceRevision: string },
): PrototypePreviewOwnerCommandResult {
  const record = object(value, "Preview Runtime command result");
  const status = string(record.status, "status");
  if (record.schema_version !== 1 || !new Set(["applied", "replayed"]).has(status)) {
    throw invalid("Preview Runtime command result status is invalid.");
  }
  const receipt = assertReceipt(record.receipt, expected);
  return { receipt, schema_version: 1, status: status as "applied" | "replayed" };
}

export function assertPrototypePreviewProof(
  value: unknown,
  projection: PrototypePreviewOwnerProjection,
): PrototypePreviewOwnerProof {
  const record = object(value, "Preview Runtime proof");
  const receipt = receiptRef(record.receipt);
  const negativeChecks = object(record.negative_checks, "negative_checks");
  const positiveChecks = stringArray(record.positive_checks, "positive_checks");
  if (
    record.schema_version !== 1 ||
    record.status !== "proven" ||
    record.profile_id !== projection.profile_id ||
    record.prototype_id !== projection.prototype_id ||
    record.security_gate !== "gate:preview-runtime-operating-acceptance" ||
    record.security_decision !== "evaluated-by-oos-before-operating-ready" ||
    record.projection_digest !== canonicalDigest(projection) ||
    !digestPattern.test(string(record.health_digest, "health_digest")) ||
    !projection.latest_receipt ||
    receipt.digest !== projection.latest_receipt.digest ||
    receipt.ref !== projection.latest_receipt.ref ||
    positiveChecks.length < 4 ||
    Object.keys(negativeChecks).length < 8 ||
    Object.values(negativeChecks).some((check) => check !== true)
  ) {
    throw invalid("Preview Runtime proof does not bind current owner truth.");
  }
  return record as PrototypePreviewOwnerProof;
}

export function canonicalDigest(value: unknown) {
  return `sha256:${createHash("sha256").update(canonicalStringify(value)).digest("hex")}`;
}

function assertReceipt(
  value: unknown,
  expected: { prototypeSlug: string; requestId: string; sourceRevision: string },
): PrototypePreviewOwnerReceipt {
  const receipt = object(value, "Preview Runtime receipt");
  const body = { ...receipt };
  delete body.receipt_digest;
  if (
    receipt.schema_version !== 1 ||
    receipt.request_id !== expected.requestId ||
    receipt.profile_id !== expected.prototypeSlug ||
    receipt.prototype_id !== `prototype:${expected.prototypeSlug}` ||
    receipt.source_revision !== expected.sourceRevision ||
    receipt.outcome !== "applied" ||
    !receiptActions.has(String(receipt.action)) ||
    !runtimeStates.has(String(receipt.before_state)) ||
    !runtimeStates.has(String(receipt.after_state)) ||
    !digestPattern.test(string(receipt.profile_digest, "receipt.profile_digest")) ||
    !digestPattern.test(string(receipt.source_digest, "receipt.source_digest")) ||
    !digestPattern.test(string(receipt.receipt_digest, "receipt.receipt_digest")) ||
    receipt.receipt_digest !== canonicalDigest(body) ||
    typeof receipt.completed_at !== "string" ||
    !/^prototype-preview-receipt:[a-f0-9]{24}$/.test(String(receipt.receipt_id))
  ) {
    throw invalid("Preview Runtime receipt is incomplete or digest-invalid.");
  }
  return receipt as PrototypePreviewOwnerReceipt;
}

function nullableReceiptRef(value: unknown): PrototypePreviewOwnerReceiptRef | null {
  return value === null ? null : receiptRef(value);
}

function receiptRef(value: unknown): PrototypePreviewOwnerReceiptRef {
  const ref = object(value, "receipt reference");
  const digest = string(ref.digest, "receipt digest");
  const uri = string(ref.ref, "receipt ref");
  if (!digestPattern.test(digest) || !uri.startsWith("preview-runtime://receipts/")) {
    throw invalid("Preview Runtime receipt reference is invalid.");
  }
  return { digest, ref: uri };
}

function runtimeStateValue(value: unknown): PrototypePreviewOwnerRuntimeState {
  const state = string(value, "runtime_state");
  if (!runtimeStates.has(state)) throw invalid("Preview Runtime state is invalid.");
  return state as PrototypePreviewOwnerRuntimeState;
}

function canonicalStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalStringify(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw invalid(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function string(value: unknown, label: string) {
  if (typeof value !== "string" || !value) throw invalid(`${label} must be a string.`);
  return value;
}

function nullableString(value: unknown, label: string) {
  if (value === null) return null;
  return string(value, label);
}

function stringArray(value: unknown, label: string) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw invalid(`${label} must be a string array.`);
  }
  return value as string[];
}

function invalid(message: string) {
  return new PrototypePreviewContractError("prototype_preview_projection_invalid", message);
}
