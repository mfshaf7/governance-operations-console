import type {
  DeliveryRefinementApplyReceipt,
  DeliveryRefinementDraftGroup,
  DeliveryRefinementPacket,
  DeliveryRefinementReadinessGate,
  DeliveryRefinementTreeNode,
  DeliveryTone,
} from "../read-model/index.ts";
import type {
  RefinementApplyCommand,
  RefinementAssistCommand,
  RefinementLiveApiError,
  RefinementOosApplyReceipt,
  RefinementOosAssistResult,
  RefinementOosPacket,
  RefinementOosProjection,
  RefinementOosRun,
  RefinementOosTreeNode,
  RefinementProjectionSnapshot,
} from "./refinement-live-types.ts";

const digestPattern = /^sha256:[a-f0-9]{64}$/;
const stableIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,511}$/;

export function assertRefinementProjectionSnapshot(
  value: unknown,
): RefinementProjectionSnapshot {
  const snapshot = record(value, "Refinement projection snapshot");
  oneOf(snapshot.mode, ["disconnected-preview", "live"], "projection mode");
  oneOf(snapshot.status, ["current", "offline"], "projection status");
  dateTime(snapshot.observedAt, "projection observation time");
  if (snapshot.projection !== null) {
    assertRefinementOosProjection(snapshot.projection);
  }
  nullableString(snapshot.error, "projection error");
  return value as RefinementProjectionSnapshot;
}

export function assertRefinementOosProjection(
  value: unknown,
): RefinementOosProjection {
  const projection = record(value, "Refinement projection");
  exact(projection.schema_version, 1, "projection schema version");
  stableId(projection.package_ref, "projection package reference");
  nonEmpty(projection.source_revision, "projection source revision");
  assertRefinementOosPacket(projection.packet);
  if (projection.active_run !== null) assertRefinementOosRun(projection.active_run);
  if (projection.latest_run !== null) assertRefinementOosRun(projection.latest_run);
  array(projection.history, "projection history", 100).forEach(assertRefinementOosRun);
  dateTime(projection.projected_at, "projection time");
  return value as RefinementOosProjection;
}

export function assertRefinementOosPacket(value: unknown): RefinementOosPacket {
  const packet = record(value, "Refinement packet");
  exact(packet.schema_version, 1, "packet schema version");
  stableId(packet.packet_id, "packet identity");
  nonEmpty(packet.packet_revision, "packet revision");
  oneOf(packet.status, ["drafting", "ready_for_review", "blocked", "stale", "applied"], "packet status");
  oneOf(packet.active_step, ["metadata_draft", "readiness_review", "apply_refinement"], "packet active step");
  const source = record(packet.source, "packet source");
  match(source.delivery_id, /^delivery-[1-9][0-9]*$/, "packet Delivery identity");
  for (const key of ["package_ref", "source_ref", "source_revision", "source_work_design_receipt_id", "tree_snapshot_ref", "finalized_brief_ref"]) {
    nonEmpty(source[key], `packet source ${key}`);
  }
  assertRefinementTreeNode(packet.target_tree);
  array(packet.draft_groups, "packet draft groups").forEach(assertDraftGroup);
  array(packet.readiness_gates, "packet readiness gates").forEach(assertReadinessGate);
  assertApplyPlan(packet.apply_plan);
  dateTime(packet.last_saved_at, "packet save time");
  return value as RefinementOosPacket;
}

export function assertRefinementOosRun(value: unknown): RefinementOosRun {
  const run = record(value, "Refinement run");
  exact(run.schema_version, 1, "run schema version");
  for (const key of ["request_id", "correlation_id", "run_id"]) stableId(run[key], `run ${key}`);
  oneOf(run.state, ["accepted", "running", "completed", "failed", "cancelled"], "run state");
  boolean(run.replayed, "run replay marker");
  dateTime(run.submitted_at, "run submission time");
  dateTime(run.updated_at, "run update time");
  nonEmpty(run.poll_ref, "run poll reference");
  array(run.events, "run events").forEach((value) => {
    const event = record(value, "Refinement run event");
    stableId(event.event_id, "run event identity");
    integer(event.sequence, "run event sequence", 1);
    oneOf(event.event_type, ["accepted", "operation_started", "operation_completed", "operation_skipped", "readback_completed", "failed", "cancelled", "recovered"], "run event type");
    dateTime(event.recorded_at, "run event time");
    nonEmpty(event.message, "run event message");
    oneOf(event.status, ["pending", "running", "completed", "failed", "skipped"], "run event status");
  });
  if (run.receipt !== null) assertRefinementOosApplyReceipt(run.receipt);
  if (run.failure !== null) {
    const failure = record(run.failure, "Refinement run failure");
    stableId(failure.code, "run failure code");
    nonEmpty(failure.message, "run failure message");
    boolean(failure.retryable, "run failure retry marker");
    nullableString(failure.recovery_ref, "run recovery reference");
  }
  if (run.state === "completed" && run.receipt === null) invalid("Completed Refinement run has no receipt.");
  if (run.state !== "completed" && run.receipt !== null) invalid("Non-completed Refinement run cannot carry a receipt.");
  return value as RefinementOosRun;
}

export function assertRefinementOosAssistResult(
  value: unknown,
): RefinementOosAssistResult {
  const result = record(value, "Refinement assist result");
  exact(result.schema_version, 1, "assist schema version");
  for (const key of ["request_id", "correlation_id", "response_id"]) stableId(result[key], `assist ${key}`);
  exact(result.status, "ready", "assist status");
  oneOf(result.confidence, ["low", "medium", "high"], "assist confidence");
  oneOf(result.required_operator_action, ["review", "no_change"], "assist action");
  const suggestion = record(result.suggestion, "Refinement suggestion");
  stableId(suggestion.field_key, "suggestion field key");
  for (const key of ["value", "summary", "rationale"]) string(suggestion[key], `suggestion ${key}`);
  exact(suggestion.resolution, "ai_drafted", "suggestion resolution");
  const evidence = record(result.evidence, "Refinement assist evidence");
  exact(evidence.model_profile_id, "delivery-refinement-advisor-v1", "assist profile");
  exact(evidence.task_contract_ref, "oos.delivery-refinement.v1", "assist contract");
  for (const key of ["generated_at", "output_schema_ref", "cgg_packet_ref", "redaction_receipt_ref", "gateway_audit_ref"]) nonEmpty(evidence[key], `assist evidence ${key}`);
  return value as RefinementOosAssistResult;
}

export function assertRefinementAssistCommand(
  value: unknown,
): RefinementAssistCommand {
  const command = record(value, "Refinement assist command");
  const result: RefinementAssistCommand = {
    allowedValues:
      command.allowedValues === undefined
        ? []
        : stringListValue(command.allowedValues, "assist allowed values"),
    draftValue: stringValue(command.draftValue, "assist draft value"),
    fieldKey: nonEmptyValue(command.fieldKey, "assist field identity"),
    fieldKind: oneOfValue(
      command.fieldKind,
      ["generated", "long_text", "number", "select", "short_text"] as const,
      "assist field kind",
    ),
    fieldLabel: nonEmptyValue(command.fieldLabel, "assist field label"),
    operatorPrompt: nonEmptyValue(
      command.operatorPrompt,
      "assist operator prompt",
    ),
    required: booleanValue(command.required, "assist required marker"),
    selectedNodeIds: stringListValue(
      command.selectedNodeIds,
      "assist selected node identities",
    ),
    sourceValue: stringValue(command.sourceValue, "assist source value"),
  };

  return result;
}

export function assertRefinementApplyCommand(
  value: unknown,
): RefinementApplyCommand {
  const command = record(value, "Refinement apply command");
  const applyPlan = command.applyPlan;
  assertApplyPlan(applyPlan);

  return {
    acceptanceId: nonEmptyValue(
      command.acceptanceId,
      "apply acceptance identity",
    ),
    acceptedAt: dateTimeValue(command.acceptedAt, "apply acceptance time"),
    applyPlan: applyPlan as RefinementApplyCommand["applyPlan"],
    metadataResolutions: enumRecordValue(
      command.metadataResolutions,
      ["accepted", "ai_drafted", "repaired"] as const,
      "apply metadata resolutions",
    ),
    metadataValues: stringRecordValue(
      command.metadataValues,
      "apply metadata values",
    ),
    note: stringValue(command.note, "apply acceptance note"),
  };
}

export function refinementPacketFromProjection(
  projection: RefinementOosProjection,
): DeliveryRefinementPacket {
  const packet = projection.packet;
  const completedRun = projection.latest_run?.state === "completed"
    ? projection.latest_run
    : projection.history.find((run) => run.state === "completed") ?? null;

  return {
    active_step: packet.active_step,
    apply_plan: packet.apply_plan,
    draft_groups: packet.draft_groups.map(refinementDraftGroup),
    handoff: {
      finalized_brief_ref: packet.source.finalized_brief_ref,
      handoff_note: "Canonical Work Design handoff projected by OOS.",
      source_package_ref: packet.source.source_ref,
      source_work_design_receipt_id: packet.source.source_work_design_receipt_id,
      status_label: "Work Design applied",
      tone: "ok",
      tree_snapshot_ref: packet.source.tree_snapshot_ref,
    },
    last_saved_at: packet.last_saved_at,
    packet_id: packet.packet_id,
    packet_revision: packet.packet_revision,
    readiness_gates: packet.readiness_gates.map(refinementReadinessGate),
    receipt: completedRun?.receipt
      ? refinementReceiptFromRun(packet, completedRun)
      : null,
    status: packet.status,
    target_tree: refinementTreeNode(packet.target_tree),
  };
}

export function isRefinementLiveApiError(
  value: unknown,
): value is RefinementLiveApiError {
  return isRecord(value) && value.mode === "live" && value.status === "offline" && typeof value.code === "string" && typeof value.error === "string";
}

function refinementDraftGroup(group: RefinementOosPacket["draft_groups"][number]): DeliveryRefinementDraftGroup {
  return {
    ...group,
    fields: group.fields.map((field) => ({ ...field })),
    tone: toneForFieldStatuses(group.fields.map((field) => field.status)),
  };
}

function refinementReadinessGate(gate: RefinementOosPacket["readiness_gates"][number]): DeliveryRefinementReadinessGate {
  return { ...gate, tone: toneForGateStatus(gate.status) };
}

function refinementTreeNode(node: RefinementOosTreeNode): DeliveryRefinementTreeNode {
  return {
    children: node.children.map(refinementTreeNode),
    description: node.description,
    draft_body: node.draft_body,
    id: node.id,
    kind: node.kind,
    remark: node.remark,
    title: node.title,
    tone: "info",
  };
}

function refinementReceiptFromRun(
  packet: RefinementOosPacket,
  run: RefinementOosRun,
): DeliveryRefinementApplyReceipt {
  const receipt = run.receipt;
  if (!receipt) invalid("Completed Refinement run has no receipt.");
  const fields = packet.draft_groups.flatMap((group) => group.fields);
  return {
    applied_at: receipt.applied_at,
    applied_payload: {
      apply_plan: packet.apply_plan,
      metadata_resolutions: Object.fromEntries(fields.map((field) => [field.field_key, "accepted"])),
      metadata_values: Object.fromEntries(fields.map((field) => [field.field_key, field.value])),
      packet_id: packet.packet_id,
    },
    command_name: "delivery.refinement.apply",
    lines: run.events.map((event) => event.message),
    outcome: "accepted",
    receipt_id: receipt.receipt_id,
    result_state: "recorded",
    schema_version: 1,
    source_work_design_receipt_id: receipt.source_work_design_receipt_id,
    tone: "ok",
  };
}

function assertRefinementOosApplyReceipt(value: unknown): RefinementOosApplyReceipt {
  const receipt = record(value, "Refinement receipt");
  for (const key of ["receipt_id", "run_id"]) stableId(receipt[key], `receipt ${key}`);
  for (const key of ["receipt_ref", "applied_by", "source_work_design_receipt_id"]) nonEmpty(receipt[key], `receipt ${key}`);
  match(receipt.receipt_digest, digestPattern, "receipt digest");
  match(receipt.accepted_draft_digest, digestPattern, "accepted draft digest");
  dateTime(receipt.applied_at, "receipt apply time");
  const target = record(receipt.target, "Refinement receipt target");
  for (const key of ["delivery_ref", "source_revision"]) nonEmpty(target[key], `receipt target ${key}`);
  for (const key of ["created_refs", "updated_refs", "reused_refs"]) stringList(target[key], `receipt target ${key}`);
  exact(target.readback_complete, true, "receipt readback");
  return value as RefinementOosApplyReceipt;
}

function assertRefinementTreeNode(value: unknown) {
  const node = record(value, "Refinement tree node");
  stableId(node.id, "tree node identity");
  oneOf(node.kind, ["Epic", "Feature", "User story", "Defect", "Task", "Risk", "Milestone", "PI Objective"], "tree node kind");
  nonEmpty(node.title, "tree node title");
  for (const key of ["description", "draft_body", "remark"]) string(node[key], `tree node ${key}`);
  array(node.children, "tree node children", 250).forEach(assertRefinementTreeNode);
}

function assertDraftGroup(value: unknown) {
  const group = record(value, "Refinement draft group");
  stableId(group.group_id, "draft group identity");
  nonEmpty(group.title, "draft group title");
  nonEmpty(group.summary, "draft group summary");
  const fields = array(group.fields, "draft group fields");
  if (fields.length === 0) invalid("Refinement draft group must contain a field.");
  fields.forEach(assertDraftField);
}

function assertDraftField(value: unknown) {
  const field = record(value, "Refinement draft field");
  stableId(field.field_key, "draft field identity");
  for (const key of ["backend_field", "label", "validation_hint"]) nonEmpty(field[key], `draft field ${key}`);
  oneOf(field.field_kind, ["generated", "long_text", "number", "select", "short_text"], "draft field kind");
  boolean(field.required, "draft field required marker");
  oneOf(field.status, ["blocked", "complete", "dirty", "missing", "stale"], "draft field status");
  string(field.value, "draft field value");
  if (field.allowed_values !== undefined) stringList(field.allowed_values, "draft field allowed values");
  if (field.target_kinds !== undefined) array(field.target_kinds, "draft field target kinds").forEach((kind) => oneOf(kind, ["Epic", "Feature", "User story", "Defect", "Task", "Risk", "Milestone"], "draft field target kind"));
  if (field.target_node_ids !== undefined) stringList(field.target_node_ids, "draft field target nodes");
  if (field.target_values !== undefined) stringRecord(field.target_values, "draft field target values");
  if (field.target_statuses !== undefined) enumRecord(field.target_statuses, ["blocked", "complete", "dirty", "missing", "stale"], "draft field target statuses");
  if (field.value_limit !== undefined) integer(field.value_limit, "draft field value limit", 1);
  const binding = record(field.route_binding, "draft field route binding");
  oneOf(binding.operation_kind, ["bulk_update", "governance", "plan_apply", "plan_repair", "work_item_create", "work_item_update"], "route operation kind");
  for (const key of ["oos_route", "payload_key"]) nonEmpty(binding[key], `route binding ${key}`);
  oneOf(binding.target, ["initiative", "child_plan", "work_item"], "route target");
}

function assertReadinessGate(value: unknown) {
  const gate = record(value, "Refinement readiness gate");
  stableId(gate.gate_id, "readiness gate identity");
  for (const key of ["label", "detail"]) nonEmpty(gate[key], `readiness gate ${key}`);
  oneOf(gate.status, ["blocked", "open", "passed", "warning"], "readiness gate status");
  if (gate.oos_route !== undefined) nonEmpty(gate.oos_route, "readiness gate route");
}

function assertApplyPlan(value: unknown) {
  const plan = record(value, "Refinement apply plan");
  nonEmpty(plan.summary, "apply plan summary");
  stringList(plan.expected_routes, "apply plan routes");
  const operations = array(plan.operations, "apply plan operations");
  if (operations.length === 0) invalid("Refinement apply plan must contain an operation.");
  operations.forEach((value) => {
    const operation = record(value, "Refinement apply operation");
    stableId(operation.operation_id, "apply operation identity");
    oneOf(operation.kind, ["bulk_update", "governance", "plan_apply", "plan_repair", "work_item_create", "work_item_update"], "apply operation kind");
    for (const key of ["label", "detail", "target", "oos_route"]) nonEmpty(operation[key], `apply operation ${key}`);
    oneOf(operation.status, ["planned", "skipped"], "apply operation status");
  });
}

function toneForFieldStatuses(statuses: string[]): DeliveryTone {
  if (statuses.includes("blocked")) return "danger";
  if (statuses.includes("stale")) return "muted";
  if (statuses.some((status) => status !== "complete")) return "warn";
  return "info";
}

function toneForGateStatus(status: string): DeliveryTone {
  if (status === "blocked") return "danger";
  if (status === "passed") return "ok";
  return "warn";
}

function array(value: unknown, label: string, maxItems = 500): unknown[] {
  if (!Array.isArray(value) || value.length > maxItems) invalid(`${label} is invalid.`);
  return value;
}
function boolean(value: unknown, label: string) { if (typeof value !== "boolean") invalid(`${label} is invalid.`); }
function dateTime(value: unknown, label: string) { nonEmpty(value, label); if (Number.isNaN(Date.parse(value as string))) invalid(`${label} is invalid.`); }
function enumRecord(value: unknown, options: readonly unknown[], label: string) { const item = record(value, label); Object.values(item).forEach((entry) => oneOf(entry, options, label)); }
function exact(value: unknown, expected: unknown, label: string) { if (value !== expected) invalid(`${label} is invalid.`); }
function integer(value: unknown, label: string, minimum: number) { if (!Number.isInteger(value) || (value as number) < minimum) invalid(`${label} is invalid.`); }
function invalid(message: string): never { throw new Error(message); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function match(value: unknown, pattern: RegExp, label: string) { if (typeof value !== "string" || !pattern.test(value)) invalid(`${label} is invalid.`); }
function nonEmpty(value: unknown, label: string) { if (typeof value !== "string" || !value.trim()) invalid(`${label} is invalid.`); }
function nullableString(value: unknown, label: string) { if (value !== null && typeof value !== "string") invalid(`${label} is invalid.`); }
function oneOf(value: unknown, options: readonly unknown[], label: string) { if (!options.includes(value)) invalid(`${label} is invalid.`); }
function record(value: unknown, label: string): Record<string, unknown> { if (!isRecord(value)) invalid(`${label} is invalid.`); return value; }
function stableId(value: unknown, label: string) { match(value, stableIdPattern, label); }
function string(value: unknown, label: string) { if (typeof value !== "string") invalid(`${label} is invalid.`); }
function stringList(value: unknown, label: string) { const items = array(value, label); if (items.some((entry) => typeof entry !== "string" || !entry.trim())) invalid(`${label} is invalid.`); }
function stringRecord(value: unknown, label: string) { const item = record(value, label); if (Object.values(item).some((entry) => typeof entry !== "string")) invalid(`${label} is invalid.`); }
function booleanValue(value: unknown, label: string): boolean { boolean(value, label); return value as boolean; }
function dateTimeValue(value: unknown, label: string): string { dateTime(value, label); return value as string; }
function enumRecordValue<const T extends string>(value: unknown, options: readonly T[], label: string): Record<string, T> { enumRecord(value, options, label); return value as Record<string, T>; }
function nonEmptyValue(value: unknown, label: string): string { nonEmpty(value, label); return value as string; }
function oneOfValue<const T extends string>(value: unknown, options: readonly T[], label: string): T { oneOf(value, options, label); return value as T; }
function stringListValue(value: unknown, label: string): string[] { stringList(value, label); return value as string[]; }
function stringRecordValue(value: unknown, label: string): Record<string, string> { stringRecord(value, label); return value as Record<string, string>; }
function stringValue(value: unknown, label: string): string { string(value, label); return value as string; }
