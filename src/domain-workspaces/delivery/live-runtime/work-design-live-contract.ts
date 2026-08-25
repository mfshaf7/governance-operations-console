import type { DeliveryPackageSummary } from "../read-model/index.ts";
import type { WorkDesignNode } from "../work-model/work-design/work-design-types.ts";
import type {
  WorkDesignLiveApiError,
  WorkDesignOosApplyResult,
  WorkDesignOosAssistResult,
  WorkDesignOosNode,
  WorkDesignOosProjection,
  WorkDesignProjectionSnapshot,
} from "./work-design-live-types.ts";

const digestPattern = /^sha256:[a-f0-9]{64}$/;
const stableIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;
const sourceRevisionPattern = /^version-(0|[1-9][0-9]*)$/;
const sourceRefPattern = /^openproject:\/\/work_packages\/[1-9][0-9]*$/;

export function workDesignLivePackageRef(
  deliveryPackage: Pick<DeliveryPackageSummary, "legacy_epic_id">,
) {
  return `delivery-package:${deliveryPackage.legacy_epic_id}`;
}

export function workDesignLiveIdentity(packageRef: string) {
  const recordId = packageRef.match(/^delivery-package:([1-9][0-9]*)$/)?.[1];
  if (!recordId) invalid("Work Design package identity is invalid.");
  return {
    deliveryId: `delivery-${recordId}`,
    packageRef,
    sourceRef: `openproject://work_packages/${recordId}`,
  };
}

export function workDesignOosNode(node: WorkDesignNode): WorkDesignOosNode {
  return {
    ...(node.children ? { children: node.children.map(workDesignOosNode) } : {}),
    description: node.description,
    draft_body: node.draftBody,
    id: node.id,
    kind: node.kind,
    remark: node.remark,
    title: node.title,
  };
}

export function assertWorkDesignProjectionSnapshot(
  value: unknown,
): WorkDesignProjectionSnapshot {
  const snapshot = record(value, "Work Design projection snapshot");
  oneOf(snapshot.mode, ["disconnected-preview", "live"], "projection mode");
  oneOf(snapshot.status, ["current", "offline"], "projection status");
  string(snapshot.observedAt, "projection observation time");
  if (snapshot.projection !== null) {
    assertWorkDesignOosProjection(snapshot.projection);
  }
  if (snapshot.error !== null && typeof snapshot.error !== "string") {
    invalid("Work Design projection error is invalid.");
  }
  return value as WorkDesignProjectionSnapshot;
}

export function assertWorkDesignOosProjection(
  value: unknown,
): WorkDesignOosProjection {
  const projection = record(value, "Work Design projection");
  exact(projection.schema_version, 1, "projection schema version");
  stableId(projection.package_ref, "projection package reference");
  const source = record(projection.source, "Work Design projection source");
  match(source.ref, sourceRefPattern, "projection source reference");
  match(source.revision, sourceRevisionPattern, "projection source revision");
  oneOf(projection.state, ["not-applied", "apply-pending", "applied"], "projection state");
  if (projection.pending_application_id !== null) {
    stableId(projection.pending_application_id, "pending application identity");
  }
  if (projection.latest_application !== null) {
    assertWorkDesignOosApplyResult(projection.latest_application);
  }
  if (!Array.isArray(projection.history) || projection.history.length > 100) {
    invalid("Work Design projection history is invalid.");
  }
  projection.history.forEach(assertWorkDesignOosApplyResult);
  string(projection.projected_at, "projection time");
  return value as WorkDesignOosProjection;
}

export function assertWorkDesignOosAssistResult(
  value: unknown,
): WorkDesignOosAssistResult {
  const result = record(value, "Work Design assist result");
  exact(result.schema_version, 1, "assist schema version");
  stableId(result.request_id, "assist request identity");
  stableId(result.correlation_id, "assist correlation identity");
  stableId(result.response_id, "assist response identity");
  oneOf(result.task_kind, ["context_advice", "tree_advice"], "assist task");
  exact(result.status, "ready", "assist status");
  oneOf(result.confidence, ["low", "medium", "high"], "assist confidence");
  oneOf(result.required_operator_action, ["review", "no_change"], "assist action");
  string(result.text, "assist text");
  const evidence = record(result.evidence, "Work Design assist evidence");
  exact(evidence.model_profile_id, "delivery-work-design-advisor-v1", "assist profile");
  exact(evidence.task_contract_ref, "oos.delivery-work-design.v1", "assist contract");
  for (const key of [
    "generated_at",
    "output_schema_ref",
    "cgg_packet_ref",
    "redaction_receipt_ref",
    "gateway_audit_ref",
  ]) {
    string(evidence[key], `assist evidence ${key}`);
  }
  return value as WorkDesignOosAssistResult;
}

export function assertWorkDesignOosApplyResult(
  value: unknown,
): WorkDesignOosApplyResult {
  const result = record(value, "Work Design apply result");
  exact(result.schema_version, 1, "apply schema version");
  for (const key of [
    "request_id",
    "correlation_id",
    "application_id",
    "applied_by",
  ]) {
    stableId(result[key], `apply ${key}`);
  }
  oneOf(result.status, ["applied", "reconciled"], "apply status");
  string(result.applied_at, "apply time");
  match(result.accepted_draft_digest, digestPattern, "accepted draft digest");
  const target = record(result.target, "Work Design apply target");
  string(target.delivery_ref, "apply target Delivery reference");
  exact(target.readback_complete, true, "apply target readback");
  for (const key of ["created_refs", "updated_refs", "reused_refs"]) {
    stringList(target[key], `apply target ${key}`);
  }
  const receipt = record(result.receipt, "Work Design apply receipt");
  match(
    receipt.ref,
    /^openproject:\/\/work_packages\/[1-9][0-9]*\/activities\/[1-9][0-9]*$/,
    "apply receipt reference",
  );
  match(receipt.digest, digestPattern, "apply receipt digest");
  return value as WorkDesignOosApplyResult;
}

export function assertWorkDesignSourceRevision(value: unknown) {
  match(value, sourceRevisionPattern, "Work Design source revision");
  return value as string;
}

export function assertWorkDesignAcceptanceId(value: unknown) {
  if (typeof value !== "string" || !/^work-design-acceptance:[a-f0-9-]{36}$/.test(value)) {
    invalid("Work Design acceptance identity is invalid.");
  }
  return value;
}

export function assertWorkDesignNode(value: unknown): WorkDesignNode {
  const node = record(value, "Work Design node");
  stableId(node.id, "Work Design node identity");
  oneOf(node.kind, ["Epic", "Feature", "Risk", "User story"], "Work Design node kind");
  for (const key of ["title", "description", "draftBody", "remark"]) {
    if (typeof node[key] !== "string") invalid(`Work Design node ${key} is invalid.`);
  }
  if (node.children !== undefined) {
    if (!Array.isArray(node.children) || node.children.length > 250) {
      invalid("Work Design node children are invalid.");
    }
    node.children.forEach(assertWorkDesignNode);
  }
  return value as unknown as WorkDesignNode;
}

export function isWorkDesignLiveApiError(value: unknown): value is WorkDesignLiveApiError {
  return (
    isRecord(value) &&
    value.mode === "live" &&
    value.status === "offline" &&
    typeof value.code === "string" &&
    typeof value.error === "string"
  );
}

function exact(value: unknown, expected: unknown, label: string) {
  if (value !== expected) invalid(`${label} is invalid.`);
}

function invalid(message: string): never {
  throw new Error(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function match(value: unknown, pattern: RegExp, label: string) {
  if (typeof value !== "string" || !pattern.test(value)) invalid(`${label} is invalid.`);
}

function oneOf(value: unknown, options: readonly unknown[], label: string) {
  if (!options.includes(value)) invalid(`${label} is invalid.`);
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) invalid(`${label} is invalid.`);
  return value;
}

function stableId(value: unknown, label: string) {
  match(value, stableIdPattern, label);
}

function string(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) invalid(`${label} is invalid.`);
}

function stringList(value: unknown, label: string) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) {
    invalid(`${label} is invalid.`);
  }
}
