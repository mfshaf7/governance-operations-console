import type {
  DeliveryChangeCommandResult,
  DeliveryChangeLiveApiError,
  DeliveryChangeNode,
  DeliveryChangeOperation,
  DeliveryChangeProjection,
  DeliveryChangeResult,
  DeliveryChangeSnapshot,
} from "./delivery-change-live-types.ts";

const commandIdPattern = /^delivery-change-command:[A-Za-z0-9._:-]+$/;
const deliveryIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const digestPattern = /^sha256:[a-f0-9]{64}$/;
const sourceRevisionPattern = /^delivery-package:sha256:[a-f0-9]{64}$/;
const workItemIdPattern = /^(?:work-item-)?[1-9][0-9]*$/;

const operationTypes = [
  "add_work_item",
  "revise_work_item",
  "move_work_item",
  "remove_work_item",
  "manage_dependency",
  "manage_blocker",
  "manage_parking",
  "request_repository",
  "link_repository",
  "rollback_change",
] as const;

export function deliveryChangeDeliveryId(value: number | string) {
  const source = String(value);
  const normalized = /^(?:[1-9][0-9]*)$/.test(source)
    ? `delivery-${source}`
    : source;
  match(normalized, deliveryIdPattern, "Delivery change target");
  return normalized;
}

export function assertDeliveryChangeProjection(
  value: unknown,
): DeliveryChangeProjection {
  const projection = record(value, "Delivery change projection");
  exact(projection.schema_version, 1, "projection schema version");
  match(projection.delivery_id, deliveryIdPattern, "projection Delivery identity");
  nonEmpty(projection.record_ref, "projection record reference");
  match(projection.source_revision, sourceRevisionPattern, "projection source revision");
  exact(projection.projection_state, "current", "projection state");
  const packageProjection = record(projection.package, "projection package");
  assertDeliveryChangeNode(packageProjection.execution_tree);
  array(packageProjection.dependency_relations, "projection dependencies");
  nullableString(projection.last_event_ref, "projection last event");
  dateTime(projection.projected_at, "projection time");
  return value as DeliveryChangeProjection;
}

export function assertDeliveryChangeSnapshot(
  value: unknown,
): DeliveryChangeSnapshot {
  const snapshot = record(value, "Delivery change snapshot");
  oneOf(snapshot.mode, ["disconnected-preview", "live"], "snapshot mode");
  oneOf(snapshot.status, ["current", "offline"], "snapshot status");
  dateTime(snapshot.observedAt, "snapshot observation time");
  if (snapshot.projection !== null) {
    assertDeliveryChangeProjection(snapshot.projection);
  }
  nullableString(snapshot.error, "snapshot error");
  return value as DeliveryChangeSnapshot;
}

export function assertDeliveryChangeCommandResult(
  value: unknown,
): DeliveryChangeCommandResult {
  const commandResult = record(value, "Delivery change command result");
  exact(commandResult.mode, "live", "command result mode");
  exact(commandResult.status, "current", "command result status");
  dateTime(commandResult.observedAt, "command result observation time");
  exact(commandResult.error, null, "command result error");
  assertDeliveryChangeResult(commandResult.result);
  return value as DeliveryChangeCommandResult;
}

export function assertDeliveryChangeOperation(
  value: unknown,
): DeliveryChangeOperation {
  const operation = record(value, "Delivery change operation");
  oneOf(operation.type, operationTypes, "operation type");
  const payload = record(operation.payload, "operation payload");
  switch (operation.type) {
    case "add_work_item":
      workItemId(payload.parent_work_item_id, "add parent");
      nonEmpty(payload.type, "add type");
      nonEmpty(payload.subject, "add subject");
      break;
    case "revise_work_item":
      workItemId(payload.work_item_id, "revision target");
      if (Object.keys(record(payload.changes, "revision changes")).length === 0) {
        invalid("Delivery change revision has no changes.");
      }
      break;
    case "move_work_item":
      workItemId(payload.work_item_id, "move target");
      workItemId(payload.new_parent_work_item_id, "move parent");
      break;
    case "remove_work_item":
      workItemId(payload.work_item_id, "remove target");
      nonEmpty(payload.retirement_reason, "retirement reason");
      break;
    case "manage_dependency":
      oneOf(payload.action, ["clear", "set"], "dependency action");
      workItemId(payload.target_work_item_id, "dependency target");
      workItemId(payload.depends_on_work_item_id, "dependency source");
      break;
    case "manage_blocker":
      oneOf(payload.action, ["clear", "set"], "blocker action");
      workItemId(payload.work_item_id, "blocker target");
      break;
    case "manage_parking":
      oneOf(payload.action, ["park", "resume"], "parking action");
      workItemId(payload.work_item_id, "parking target");
      break;
    case "request_repository":
      workItemId(payload.work_item_id, "repository request target");
      nonEmpty(payload.reason, "repository request reason");
      break;
    case "link_repository":
      workItemId(payload.work_item_id, "repository link target");
      nonEmpty(payload.owner_repo, "repository owner");
      nonEmpty(payload.catalog_item_id, "repository catalog");
      record(payload.catalog_request, "repository catalog request");
      break;
    case "rollback_change":
      nonEmpty(payload.target_event_ref, "rollback event");
      nonEmpty(payload.reason, "rollback reason");
      break;
  }
  return value as DeliveryChangeOperation;
}

export function assertDeliveryChangeCommandId(value: unknown) {
  match(value, commandIdPattern, "Delivery change command identity");
  if ((value as string).length > 200) invalid("Delivery change command identity is too long.");
  return value as string;
}

export function assertDeliveryChangeSourceRevision(value: unknown) {
  match(value, sourceRevisionPattern, "Delivery change source revision");
  return value as string;
}

export function assertDeliveryChangeResult(value: unknown): DeliveryChangeResult {
  const result = record(value, "Delivery change result");
  exact(result.schema_version, 1, "result schema version");
  assertDeliveryChangeCommandId(result.command_id);
  oneOf(result.status, ["applied", "routed", "partial_failure", "rejected"], "result status");
  boolean(result.replayed, "result replay marker");
  assertRevisionEvidence(result.before, "result before");
  assertRevisionEvidence(result.after, "result after");
  const event = record(result.event, "result event");
  exact(event.schema_version, 1, "result event schema version");
  nonEmpty(event.event_id, "result event identity");
  exact(event.command_id, result.command_id, "result event command identity");
  match(event.command_digest, digestPattern, "result event command digest");
  match(event.delivery_id, deliveryIdPattern, "result event Delivery identity");
  oneOf(event.operation_type, operationTypes, "result operation type");
  exact(event.status, result.status, "result event status");
  dateTime(event.occurred_at, "result event time");
  nonEmpty(event.operator_id, "result event operator");
  match(event.source_revision_before, sourceRevisionPattern, "result event source revision before");
  match(event.source_revision_after, sourceRevisionPattern, "result event source revision after");
  record(event.effect, "result effect");
  const rollback = record(event.rollback, "result rollback");
  oneOf(
    rollback.mode,
    ["compensating_command_required", "not_applicable", "not_supported"],
    "result rollback mode",
  );
  nonEmpty(rollback.reason, "result rollback reason");
  if (result.status === "applied" && event.operation_type === "add_work_item") {
    workItemId(
      record(event.effect, "result effect").work_item_id,
      "added work item identity",
    );
  }
  assertNextAction(event.next_action, "result event next action");
  assertReceipt(event.receipt, "result event receipt");
  assertReceipt(result.receipt, "result receipt");
  assertNextAction(result.next_action, "result next action");
  return value as DeliveryChangeResult;
}

export function isDeliveryChangeLiveApiError(
  value: unknown,
): value is DeliveryChangeLiveApiError {
  return (
    isRecord(value) &&
    value.mode === "live" &&
    value.status === "offline" &&
    typeof value.code === "string" &&
    typeof value.error === "string"
  );
}

function assertDeliveryChangeNode(value: unknown): DeliveryChangeNode {
  const node = record(value, "Delivery change tree node");
  integer(node.id, "tree node identity");
  for (const key of ["record_ref", "status", "subject", "type"]) {
    nonEmpty(node[key], `tree node ${key}`);
  }
  array(node.children, "tree node children").forEach(assertDeliveryChangeNode);
  return value as DeliveryChangeNode;
}

function assertNextAction(value: unknown, label: string) {
  const action = record(value, label);
  for (const key of ["authority", "code", "label"]) nonEmpty(action[key], `${label} ${key}`);
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
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) invalid(`${label} is invalid.`);
}

function exact(value: unknown, expected: unknown, label: string) {
  if (value !== expected) invalid(`${label} is invalid.`);
}

function integer(value: unknown, label: string) {
  if (!Number.isInteger(value) || (value as number) < 1) invalid(`${label} is invalid.`);
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

function nonEmpty(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) invalid(`${label} is invalid.`);
}

function nullableString(value: unknown, label: string) {
  if (value !== null && typeof value !== "string") invalid(`${label} is invalid.`);
}

function oneOf(value: unknown, options: readonly unknown[], label: string) {
  if (!options.includes(value)) invalid(`${label} is invalid.`);
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) invalid(`${label} is invalid.`);
  return value;
}

function workItemId(value: unknown, label: string) {
  match(value, workItemIdPattern, label);
}
