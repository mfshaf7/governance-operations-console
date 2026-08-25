import type {
  PrototypeDeliveryApplicationResult,
  PrototypeDeliveryLiveApiError,
  PrototypeDeliveryPacket,
} from "./prototype-delivery-live-types.ts";

const digestPattern = /^sha256:[a-f0-9]{64}$/;
const gitCommitPattern = /^[a-f0-9]{40}$/;
const identifierPattern = /^[A-Za-z0-9][A-Za-z0-9._:/@+\-]{0,1023}$/;
const kebabPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function assertPrototypeDeliveryPacket(
  value: unknown,
): PrototypeDeliveryPacket {
  const packet = record(value, "Prototype Delivery packet");
  const content = record(packet.content, "Prototype Delivery packet content");
  const source = record(content.source, "Prototype Delivery source");
  const revision = record(source.revision, "Prototype Delivery source revision");
  const baseline = record(content.baseline, "Prototype Delivery baseline");
  const work = record(content.work, "Prototype Delivery work");
  const posture = record(content.posture, "Prototype Delivery posture");
  const authorization = record(
    content.authorization,
    "Prototype Delivery authorization",
  );

  exact(packet.schema_version, 1, "packet schema version");
  match(packet.packet_id, kebabPattern, "packet identity");
  match(
    packet.packet_ref,
    /^record:\/\/delivery-packets\/[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "packet reference",
  );
  match(packet.packet_digest, digestPattern, "packet digest");
  exact(content.intent, "governed-delivery", "packet intent");
  exact(content.target, "workspace-delivery-art", "packet target");
  exact(source.kind, "prototype", "source kind");
  match(source.prototype_id, kebabPattern, "prototype identity");
  match(
    source.record_ref,
    /^record:\/\/prototypes\/[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "source record reference",
  );
  match(source.record_version, gitCommitPattern, "source record version");
  exact(source.lifecycle, "baseline-approved", "source lifecycle");
  strings(source, ["owner", "repository"]);
  strings(revision, ["ref"]);
  for (const key of ["base_commit", "head_commit", "tree"] as const) {
    match(revision[key], gitCommitPattern, `source revision ${key}`);
  }
  strings(baseline, ["record_ref", "baseline_id", "version"]);
  if (!Number.isInteger(baseline.schema_version) || Number(baseline.schema_version) < 1) {
    invalid("Prototype Delivery baseline schema version is invalid.");
  }
  match(baseline.record_digest, digestPattern, "baseline digest");
  strings(work, ["title", "objective"]);
  stringList(work.included_scope, "included scope", true);
  stringList(work.excluded_scope, "excluded scope");
  stringList(work.remaining_work, "remaining work", true);
  oneOf(posture.visibility_tier, [
    "private-internal",
    "operator-review",
    "client-review",
    "public-demo",
  ], "visibility tier");
  oneOf(posture.data_mode, [
    "mock",
    "synthetic",
    "real-readonly",
    "real-mutable",
  ], "data mode");
  oneOf(posture.mutation_boundary, [
    "none",
    "read-only",
    "prototype-local",
    "external-sandbox",
    "real-system",
  ], "mutation boundary");
  assertCustody(content.custody);
  exact(authorization.decision, "approved", "source authorization decision");
  strings(authorization, ["operator_id", "decision_ref"]);
  identifier(authorization.operator_id, "source authorization operator");
  identifier(authorization.decision_ref, "source authorization reference");
  stringList(content.evidence_refs, "evidence references", true);
  string(content.rationale, "packet rationale");

  return value as PrototypeDeliveryPacket;
}

export function assertPrototypeDeliveryApplicationResult(
  value: unknown,
): PrototypeDeliveryApplicationResult {
  const result = record(value, "Prototype Delivery application result");
  const source = record(result.source, "Prototype Delivery result source");
  const readiness = record(result.readiness, "Prototype Delivery readiness");
  const readinessRef = record(readiness.receipt_ref, "Prototype readiness receipt");
  const decision = record(result.operator_decision, "Prototype operator decision");
  const target = record(result.target, "Prototype Delivery target");
  const receipt = record(result.receipt, "Prototype Delivery receipt");
  const custody = record(receipt.custody, "Prototype Delivery receipt custody");

  exact(result.schema_version, 1, "result schema version");
  exact(result.workflow_id, "prototype-delivery-application", "workflow identity");
  match(
    result.application_id,
    /^prototype-delivery-application:[a-f0-9]{64}$/,
    "application identity",
  );
  match(
    result.ingress_id,
    /^delivery-ingress:prototype:[a-f0-9]{64}$/,
    "ingress identity",
  );
  oneOf(result.resolution, ["created", "reused", "read"], "result resolution");
  strings(source, [
    "prototype_id",
    "record_ref",
    "packet_ref",
    "baseline_ref",
  ]);
  match(source.record_version, gitCommitPattern, "result source version");
  match(source.packet_digest, digestPattern, "result packet digest");
  assertCustody(source.custody);
  exact(readiness.outcome, "allow", "readiness outcome");
  strings(readiness, ["receipt_id", "evaluated_at"]);
  strings(readinessRef, ["uri"]);
  match(readinessRef.digest, digestPattern, "readiness receipt digest");
  exact(decision.decision, "apply", "operator decision");
  strings(decision, ["operator_id", "decision_ref"]);
  identifier(decision.operator_id, "operator identity");
  identifier(decision.decision_ref, "operator decision reference");
  strings(target, ["record_ref"]);
  match(target.record_ref, /^openproject:\/\/work_packages\/[1-9][0-9]*$/, "target record");
  if (!Number.isInteger(target.record_version) || Number(target.record_version) < 1) {
    invalid("Prototype Delivery target version is invalid.");
  }
  exact(target.record_system, "openproject", "target record system");
  exact(target.record_project, "workspace-delivery-art", "target project");
  exact(target.record_type, "delivery-epic", "target type");
  oneOf(target.application_state, ["created", "reused"], "target state");
  exact(target.prototype_backlink_state, "recorded", "Prototype backlink");
  exact(target.baseline_backlink_state, "recorded", "baseline backlink");
  exact(target.source_receipt_state, "emitted", "source receipt state");
  if (target.owner_repo !== null) string(target.owner_repo, "target owner repo");
  exact(receipt.owner, "operator-orchestration-service", "receipt owner");
  strings(receipt, ["receipt_ref", "recorded_at"]);
  match(receipt.content_digest, digestPattern, "receipt digest");
  exact(custody.state, "durable", "receipt custody state");
  exact(custody.backend, "openproject-activity", "receipt custody backend");
  match(
    custody.uri,
    /^openproject:\/\/work_packages\/[1-9][0-9]*\/activities\/[1-9][0-9]*$/,
    "receipt custody URI",
  );

  return value as PrototypeDeliveryApplicationResult;
}

export function assertPrototypeDeliveryResultMatchesPacket({
  packet,
  result,
}: {
  packet: PrototypeDeliveryPacket;
  result: PrototypeDeliveryApplicationResult;
}) {
  if (
    result.source.prototype_id !== packet.content.source.prototype_id ||
    result.source.record_ref !== packet.content.source.record_ref ||
    result.source.record_version !== packet.content.source.record_version ||
    result.source.packet_ref !== packet.packet_ref ||
    result.source.packet_digest !== packet.packet_digest ||
    result.source.baseline_ref !== packet.content.baseline.record_ref ||
    !sameCustody(result.source.custody, packet.content.custody)
  ) {
    invalid("Prototype Delivery result does not match its source packet.");
  }
  return result;
}

function sameCustody(left: unknown, right: unknown) {
  if (!isRecord(left) || !isRecord(right)) return false;
  return [
    "classification",
    "owner",
    "rationale",
    "repository_gate_state",
    "repository_mode",
    "source_ref",
  ].every((key) => left[key] === right[key]);
}

export function isPrototypeDeliveryLiveApiError(
  value: unknown,
): value is PrototypeDeliveryLiveApiError {
  return (
    isRecord(value) &&
    value.mode === "live" &&
    value.status === "offline" &&
    typeof value.code === "string" &&
    typeof value.error === "string"
  );
}

function assertCustody(value: unknown) {
  const custody = record(value, "Prototype source custody");
  strings(custody, ["classification", "repository_mode", "repository_gate_state", "owner", "rationale"]);
  const classification = custody.classification;
  if (classification === "existing-repo" || classification === "new-repo-required") {
    exact(custody.repository_gate_state, "resolved", "repository gate state");
    exact(
      custody.repository_mode,
      classification === "existing-repo" ? "existing" : "new",
      "repository mode",
    );
    string(custody.source_ref, "custody source reference");
    return;
  }
  oneOf(classification, ["platform-internal", "non-source-work"], "custody classification");
  exact(custody.repository_mode, "not-required", "repository mode");
  exact(custody.repository_gate_state, "not-required", "repository gate state");
  exact(custody.source_ref, null, "custody source reference");
}

function exact(value: unknown, expected: unknown, label: string) {
  if (value !== expected) invalid(`${label} is invalid.`);
}

function invalid(message: string): never {
  throw new Error(message);
}

function identifier(value: unknown, label: string) {
  if (typeof value !== "string" || !identifierPattern.test(value)) {
    invalid(`${label} is invalid.`);
  }
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

function string(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    invalid(`${label} is invalid.`);
  }
}

function stringList(value: unknown, label: string, required = false) {
  if (
    !Array.isArray(value) ||
    (required && value.length === 0) ||
    value.some((item) => typeof item !== "string" || !item.trim())
  ) {
    invalid(`${label} is invalid.`);
  }
}

function strings(value: Record<string, unknown>, keys: readonly string[]) {
  for (const key of keys) string(value[key], key);
}
