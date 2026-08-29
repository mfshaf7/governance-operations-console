import type {
  DeliveryCloseoutCommandResult,
  DeliveryCloseoutEvent,
  DeliveryCloseoutImpact,
  DeliveryCloseoutLiveApiError,
  DeliveryCloseoutOperation,
  DeliveryCloseoutProjection,
  DeliveryCloseoutResult,
  DeliveryCloseoutSnapshot,
  DeliveryCloseoutValidationBehavior,
  DeliveryCloseoutWorkspaceCandidate,
} from "./delivery-closeout-live-types.ts";

const commandIdPattern = /^delivery-closeout-command:[A-Za-z0-9._:-]+$/;
const deliveryIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const digestPattern = /^sha256:[a-f0-9]{64}$/;
const recordRefPattern = /^openproject:\/\/work_packages\/[1-9][0-9]*$/;
const sourceRevisionPattern = /^delivery-package:sha256:[a-f0-9]{64}$/;

export function deliveryCloseoutDeliveryId(value: number | string) {
  const source = String(value);
  const normalized = /^(?:[1-9][0-9]*)$/.test(source)
    ? `delivery-${source}`
    : source;
  match(normalized, deliveryIdPattern, "Delivery closeout target");
  return normalized;
}

export function assertDeliveryCloseoutProjection(
  value: unknown,
): DeliveryCloseoutProjection {
  const projection = record(value, "Delivery closeout projection");
  exact(projection.schema_version, 1, "projection schema version");
  match(projection.delivery_id, deliveryIdPattern, "projection Delivery identity");
  match(projection.record_ref, recordRefPattern, "projection record reference");
  match(projection.source_revision, sourceRevisionPattern, "projection source revision");
  oneOf(
    projection.projection_state,
    ["closed", "not_ready", "ready", "reconciliation_required"],
    "projection state",
  );
  const packageProjection = record(projection.package, "projection package");
  nonEmpty(packageProjection.subject, "projection package subject");
  nonEmpty(packageProjection.status, "projection package status");
  assertReadiness(projection.readiness);
  array(projection.outcome_history, "projection outcome history").forEach(
    assertDeliveryCloseoutEvent,
  );
  nullableString(projection.last_event_ref, "projection last event");
  assertNextAction(projection.next_action, "projection next action");
  dateTime(projection.projected_at, "projection time");
  return value as DeliveryCloseoutProjection;
}

export function assertDeliveryCloseoutSnapshot(
  value: unknown,
): DeliveryCloseoutSnapshot {
  const snapshot = record(value, "Delivery closeout snapshot");
  oneOf(snapshot.mode, ["disconnected-preview", "live"], "snapshot mode");
  oneOf(snapshot.status, ["current", "offline"], "snapshot status");
  dateTime(snapshot.observedAt, "snapshot observation time");
  if (snapshot.projection !== null) {
    assertDeliveryCloseoutProjection(snapshot.projection);
  }
  nullableString(snapshot.error, "snapshot error");
  return value as DeliveryCloseoutSnapshot;
}

export function assertDeliveryCloseoutCommandResult(
  value: unknown,
): DeliveryCloseoutCommandResult {
  const commandResult = record(value, "Delivery closeout command result");
  exact(commandResult.mode, "live", "command result mode");
  exact(commandResult.status, "current", "command result status");
  exact(commandResult.error, null, "command result error");
  dateTime(commandResult.observedAt, "command result observation time");
  assertDeliveryCloseoutResult(commandResult.result);
  return value as DeliveryCloseoutCommandResult;
}

export function assertDeliveryCloseoutOperation(
  value: unknown,
): DeliveryCloseoutOperation {
  const operation = record(value, "Delivery closeout operation");
  exact(operation.type, "apply_closeout", "closeout operation type");
  const payload = record(operation.payload, "closeout operation payload");
  const evidence = record(payload.evidence, "closeout evidence");
  for (const key of [
    "changed_surfaces",
    "completion_summary",
    "demo_evidence",
    "demo_outcome",
    "demo_summary",
    "inspect_action_items",
    "inspect_summary",
    "test_result_evidence",
    "validation_evidence",
  ]) {
    nonEmpty(evidence[key], `closeout evidence ${key}`);
  }
  stringList(evidence.evidence_refs, "closeout evidence references", true);
  for (const key of [
    "completion_note",
    "demo_follow_up",
    "inspect_follow_up",
    "residual_follow_up",
  ]) {
    optionalString(evidence[key], `closeout evidence ${key}`);
  }
  optionalDate(evidence.demo_date, "closeout demo date");
  optionalDate(evidence.inspect_date, "closeout inspect date");
  assertImpact(payload.impact);
  return value as DeliveryCloseoutOperation;
}

export function assertDeliveryCloseoutCommandId(value: unknown) {
  match(value, commandIdPattern, "Delivery closeout command identity");
  if ((value as string).length > 200) {
    invalid("Delivery closeout command identity is too long.");
  }
  return value as string;
}

export function assertDeliveryCloseoutSourceRevision(value: unknown) {
  match(value, sourceRevisionPattern, "Delivery closeout source revision");
  return value as string;
}

export function assertDeliveryCloseoutResult(
  value: unknown,
): DeliveryCloseoutResult {
  const result = record(value, "Delivery closeout result");
  exact(result.schema_version, 1, "result schema version");
  assertDeliveryCloseoutCommandId(result.command_id);
  oneOf(result.status, ["applied", "partial_failure", "rejected"], "result status");
  boolean(result.replayed, "result replay marker");
  assertRevisionEvidence(result.before, "result before");
  assertRevisionEvidence(result.after, "result after");
  const event = assertDeliveryCloseoutEvent(result.event);
  exact(event.command_id, result.command_id, "result event command identity");
  if (event.status !== "accepted") {
    exact(event.status, result.status, "result event status");
  }
  assertReceipt(result.receipt, "result receipt");
  assertNextAction(result.next_action, "result next action");
  return value as DeliveryCloseoutResult;
}

export function isDeliveryCloseoutLiveApiError(
  value: unknown,
): value is DeliveryCloseoutLiveApiError {
  return (
    isRecord(value) &&
    value.mode === "live" &&
    value.status === "offline" &&
    typeof value.code === "string" &&
    typeof value.error === "string"
  );
}

function assertReadiness(value: unknown) {
  const readiness = record(value, "closeout readiness");
  nonEmpty(readiness.readiness_ref, "closeout readiness reference");
  boolean(readiness.ready_for_closing, "ready for closing");
  boolean(readiness.ready_for_closeout, "ready for closeout");
  stringList(readiness.reasons, "closeout readiness reasons");
  stringList(readiness.evidence_refs, "closeout readiness evidence");
  const counts = record(readiness.counts, "closeout readiness counts");
  for (const key of [
    "blocked",
    "open_descendants",
    "weak_done_narrative",
    "weak_evidence",
    "without_evidence",
    "without_owner",
  ]) {
    nonNegativeInteger(counts[key], `closeout readiness ${key}`);
  }
}

function assertDeliveryCloseoutEvent(value: unknown): DeliveryCloseoutEvent {
  const event = record(value, "Delivery closeout event");
  exact(event.schema_version, 1, "event schema version");
  nonEmpty(event.event_id, "event identity");
  assertDeliveryCloseoutCommandId(event.command_id);
  match(event.command_digest, digestPattern, "event command digest");
  match(event.delivery_id, deliveryIdPattern, "event Delivery identity");
  exact(event.operation_type, "apply_closeout", "event operation type");
  oneOf(
    event.status,
    ["accepted", "applied", "partial_failure", "rejected"],
    "event status",
  );
  dateTime(event.occurred_at, "event time");
  nonEmpty(event.operator_id, "event operator");
  match(event.source_revision_before, sourceRevisionPattern, "event source revision before");
  match(event.source_revision_after, sourceRevisionPattern, "event source revision after");
  nonEmpty(event.outcome_ref, "event outcome reference");
  assertImpact(event.impact);
  record(event.effect, "event effect");
  assertNextAction(event.next_action, "event next action");
  assertReceipt(event.receipt, "event receipt");
  return value as DeliveryCloseoutEvent;
}

function assertImpact(value: unknown): DeliveryCloseoutImpact {
  const impact = record(value, "closeout impact");
  oneOf(
    impact.kind,
    ["none", "workspace_entrant", "existing_product_change"],
    "closeout impact kind",
  );
  if (impact.kind === "workspace_entrant") {
    assertWorkspaceCandidate(impact.candidate);
  }
  if (impact.kind === "existing_product_change") {
    const product = record(impact.active_product, "active product");
    for (const key of ["product_id", "registry_ref", "registry_version"]) {
      nonEmpty(product[key], `active product ${key}`);
    }
    nonEmpty(impact.change_summary, "product change summary");
    nonEmpty(impact.product_owner_ref, "product owner reference");
  }
  return value as DeliveryCloseoutImpact;
}

function assertWorkspaceCandidate(value: unknown): DeliveryCloseoutWorkspaceCandidate {
  const candidate = record(value, "workspace entrant candidate");
  for (const key of [
    "candidate_ref",
    "candidate_version",
    "canonical_key",
    "correlation_ref",
    "name",
    "source_owner_ref",
  ]) {
    nonEmpty(candidate[key], `workspace entrant ${key}`);
  }
  stringList(candidate.evidence_refs, "workspace entrant evidence", true);
  oneOf(candidate.entrant_kind, ["component", "product", "repository"], "entrant kind");
  const metadata = record(candidate.intake_metadata, "workspace entrant metadata");
  const validation = assertValidationBehavior(metadata.validation_behavior);
  if (candidate.entrant_kind === "repository") {
    nonEmpty(metadata.repo_class, "repository class");
    boolean(metadata.requires_security_bindings, "repository security binding requirement");
    nullableString(metadata.security_owner, "repository security owner");
  } else if (candidate.entrant_kind === "product") {
    for (const key of [
      "intended_endpoint",
      "platform_owner",
      "runtime_owner",
      "security_owner",
    ]) {
      nonEmpty(metadata[key], `product ${key}`);
    }
    stringList(metadata.source_owners, "product source owners", true);
  } else {
    for (const key of ["component_class", "owner_repo", "security_owner"]) {
      nonEmpty(metadata[key], `component ${key}`);
    }
    nullableString(metadata.product, "component product");
  }
  void validation;
  return value as DeliveryCloseoutWorkspaceCandidate;
}

function assertValidationBehavior(value: unknown): DeliveryCloseoutValidationBehavior {
  const validation = record(value, "validation behavior");
  stringList(validation.catalog_refs, "validation catalog references");
  nonEmpty(validation.notes, "validation notes");
  nonEmpty(validation.posture, "validation posture");
  nonEmpty(validation.wgcf_graph_role, "validation WGCF graph role");
  return value as DeliveryCloseoutValidationBehavior;
}

function assertNextAction(value: unknown, label: string) {
  const action = record(value, label);
  for (const key of ["authority", "code", "label"]) {
    nonEmpty(action[key], `${label} ${key}`);
  }
}

function assertReceipt(value: unknown, label: string) {
  const receipt = record(value, label);
  nonEmpty(receipt.ref, `${label} reference`);
  match(receipt.digest, digestPattern, `${label} digest`);
}

function assertRevisionEvidence(value: unknown, label: string) {
  const evidence = record(value, label);
  nonEmpty(evidence.record_ref, `${label} record reference`);
  match(evidence.source_revision, sourceRevisionPattern, `${label} source revision`);
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) invalid(`${label} is invalid.`);
  return value;
}

function boolean(value: unknown, label: string) {
  if (typeof value !== "boolean") invalid(`${label} is invalid.`);
}

function dateTime(value: unknown, label: string) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    invalid(`${label} is invalid.`);
  }
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
  if (typeof value !== "string" || !pattern.test(value)) {
    invalid(`${label} is invalid.`);
  }
}

function nonEmpty(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) invalid(`${label} is invalid.`);
}

function nonNegativeInteger(value: unknown, label: string) {
  if (!Number.isInteger(value) || (value as number) < 0) {
    invalid(`${label} is invalid.`);
  }
}

function nullableString(value: unknown, label: string) {
  if (value !== null && typeof value !== "string") invalid(`${label} is invalid.`);
}

function oneOf(value: unknown, options: readonly unknown[], label: string) {
  if (!options.includes(value)) invalid(`${label} is invalid.`);
}

function optionalDate(value: unknown, label: string) {
  if (value !== undefined && (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))) {
    invalid(`${label} is invalid.`);
  }
}

function optionalString(value: unknown, label: string) {
  if (value !== undefined && (typeof value !== "string" || !value.trim())) {
    invalid(`${label} is invalid.`);
  }
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) invalid(`${label} is invalid.`);
  return value;
}

function stringList(value: unknown, label: string, requireItem = false) {
  const items = array(value, label);
  if (requireItem && items.length === 0) invalid(`${label} is empty.`);
  items.forEach((item) => nonEmpty(item, label));
}
