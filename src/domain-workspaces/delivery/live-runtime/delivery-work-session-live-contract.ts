import type {
  DeliveryWorkSessionDecision,
  DeliveryWorkSessionDecisionInput,
  DeliveryWorkSessionLiveApiError,
  DeliveryWorkSessionProjection,
  DeliveryWorkSessionSnapshot,
} from "./delivery-work-session-live-types.ts";

const commandIdPattern = /^work-session-command:[A-Za-z0-9._:-]+$/;
const digestPattern = /^sha256:[a-f0-9]{64}$/;
const gitCommitPattern = /^[a-f0-9]{40}$/;
const identifierPattern = /^[a-z0-9][a-z0-9._:-]*$/;
const repoPattern = /^[a-z0-9][a-z0-9-]*$/;
const workItemIdPattern = /^work-item-[1-9][0-9]*$/;

export function deliveryWorkSessionTargetId(value: unknown) {
  if (!Number.isInteger(value) || Number(value) < 1) {
    invalid("Delivery work-session target is invalid.");
  }
  return Number(value);
}

export function assertDeliveryWorkSessionSnapshot(
  value: unknown,
): DeliveryWorkSessionSnapshot {
  const snapshot = record(value, "Delivery work-session snapshot");
  oneOf(snapshot.mode, ["disconnected-preview", "live"], "snapshot mode");
  oneOf(snapshot.status, ["current", "offline"], "snapshot status");
  dateTime(snapshot.observedAt, "snapshot observation time");
  if (snapshot.error !== null && typeof snapshot.error !== "string") {
    invalid("Delivery work-session snapshot error is invalid.");
  }
  if (snapshot.projection !== null) {
    assertDeliveryWorkSessionProjection(snapshot.projection);
  }
  return value as DeliveryWorkSessionSnapshot;
}

export function assertDeliveryWorkSessionProjection(
  value: unknown,
): DeliveryWorkSessionProjection {
  const projection = record(value, "Delivery work-session projection");
  exact(
    projection.workflow_id,
    "delivery-art-work-session",
    "projection workflow",
  );
  workItemId(projection.work_item_id, "projection work item");
  nullableText(projection.delivery_id, "projection delivery identity");
  nullableText(projection.landing_unit_id, "projection Landing Unit identity");
  nullableText(projection.session_id, "projection session identity");
  nullableDateTime(projection.session_revision, "projection session revision");
  text(projection.state, "projection state");
  if (projection.next_action !== null) {
    const action = record(projection.next_action, "projection next action");
    text(action.authority, "next-action authority");
    text(action.code, "next-action code");
    text(action.reason, "next-action reason");
  }
  if (projection.decision_draft !== undefined) {
    assertDeliveryWorkSessionDecision(projection.decision_draft, true);
  }
  if (projection.source !== undefined) {
    const source = record(projection.source, "projection source");
    match(source.base_commit, gitCommitPattern, "source base commit");
    text(source.branch, "source branch");
    stringList(source.changed_files, "source changed files");
    match(source.head_commit, gitCommitPattern, "source head commit");
    text(source.state, "source state");
    if (source.upstream_commit !== null) {
      match(source.upstream_commit, gitCommitPattern, "source upstream commit");
    }
  }
  if (projection.command_receipt !== undefined) {
    const receipt = record(
      projection.command_receipt,
      "work-session command receipt",
    );
    match(receipt.command_id, commandIdPattern, "receipt command identity");
    dateTime(receipt.completed_at, "receipt completion time");
    match(receipt.digest, digestPattern, "receipt digest");
    text(receipt.executor_id, "receipt executor identity");
    match(
      receipt.ref,
      /^oos:\/\/delivery-art\/work-session-command-receipts\//,
      "receipt reference",
    );
    match(receipt.request_digest, digestPattern, "receipt request digest");
    text(receipt.result_state, "receipt result state");
    workItemId(receipt.work_item_id, "receipt work item");
  }
  return value as DeliveryWorkSessionProjection;
}

export function assertDeliveryWorkSessionDecision(
  value: unknown,
  allowDraft = false,
): DeliveryWorkSessionDecision {
  const decision = record(value, "Delivery work-session decision");
  exact(decision.schema_version, 1, "decision schema version");
  exact(
    decision.artifact_type,
    "delivery_art_work_session_decision",
    "decision artifact type",
  );
  workItemId(decision.work_item_id, "decision work item");
  workItemIdList(decision.covered_work_item_ids, "covered work items");
  const operator = record(decision.operator, "decision operator");
  text(operator.id, "decision operator identity");
  oneOf(
    operator.decision_source,
    ["operator", "approved-ai-suggestion"],
    "decision source",
  );
  const landingUnit = record(decision.landing_unit, "decision Landing Unit");
  for (const key of [
    "base_ref",
    "branch",
    "id",
    "rollback_boundary",
    "split_reason",
  ]) {
    text(landingUnit[key], `Landing Unit ${key.replaceAll("_", " ")}`);
  }
  match(landingUnit.id, identifierPattern, "Landing Unit identity");
  oneOf(
    landingUnit.decision,
    ["child_isolated_landing_unit", "feature_single_landing_unit"],
    "Landing Unit decision",
  );
  const architecture = record(decision.architecture, "decision architecture");
  if (
    architecture.required !== null &&
    typeof architecture.required !== "boolean"
  ) {
    invalid("Decision architecture requirement is invalid.");
  }
  if (!allowDraft && typeof architecture.required !== "boolean") {
    invalid("Decision architecture requirement is required.");
  }
  if (architecture.artifact_location !== null) {
    const location = record(
      architecture.artifact_location,
      "architecture artifact location",
    );
    match(location.repo, repoPattern, "architecture artifact repo");
    relativePath(location.relative_path, "architecture artifact path");
  }
  if (!allowDraft && architecture.required && !architecture.artifact_location) {
    invalid("Required architecture must name its artifact location.");
  }
  const gates = record(
    decision.human_gate_work_item_ids,
    "decision human gates",
  );
  workItemIdList(gates.security_acceptance, "security acceptance work items");
  return value as DeliveryWorkSessionDecision;
}

export function assertDeliveryWorkSessionDecisionInput(
  value: unknown,
): DeliveryWorkSessionDecisionInput {
  const input = record(value, "Delivery work-session decision input");
  oneOf(
    input.landingUnitDecision,
    ["child_isolated_landing_unit", "feature_single_landing_unit"],
    "Landing Unit decision",
  );
  for (const [key, label] of [
    ["branch", "branch"],
    ["landingUnitId", "Landing Unit identity"],
    ["rollbackBoundary", "rollback boundary"],
    ["splitReason", "split reason"],
  ] as const) {
    text(input[key], label);
  }
  const architecture = record(input.architecture, "decision architecture");
  if (typeof architecture.required !== "boolean") {
    invalid("Decision architecture requirement is invalid.");
  }
  if (architecture.artifactLocation !== null) {
    const location = record(
      architecture.artifactLocation,
      "architecture artifact location",
    );
    match(location.repo, repoPattern, "architecture artifact repo");
    relativePath(location.relative_path, "architecture artifact path");
  }
  if (architecture.required && architecture.artifactLocation === null) {
    invalid("Required architecture must name its artifact location.");
  }
  return value as DeliveryWorkSessionDecisionInput;
}

export function isDeliveryWorkSessionLiveApiError(
  value: unknown,
): value is DeliveryWorkSessionLiveApiError {
  return (
    isRecord(value) &&
    value.mode === "live" &&
    value.status === "offline" &&
    typeof value.code === "string" &&
    typeof value.error === "string"
  );
}

function dateTime(value: unknown, label: string) {
  text(value, label);
  if (Number.isNaN(Date.parse(value as string))) invalid(`${label} is invalid.`);
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

function nullableDateTime(value: unknown, label: string) {
  if (value !== null) dateTime(value, label);
}

function nullableText(value: unknown, label: string) {
  if (value !== null) text(value, label);
}

function oneOf(value: unknown, options: readonly unknown[], label: string) {
  if (!options.includes(value)) invalid(`${label} is invalid.`);
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) invalid(`${label} is invalid.`);
  return value;
}

function relativePath(value: unknown, label: string) {
  text(value, label);
  const path = value as string;
  if (
    path.startsWith("/") ||
    /^[A-Za-z]:[\\/]/.test(path) ||
    path.split("/").includes("..")
  ) {
    invalid(`${label} is invalid.`);
  }
}

function stringList(value: unknown, label: string) {
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "string" || !item.trim())
  ) {
    invalid(`${label} is invalid.`);
  }
}

function text(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) invalid(`${label} is invalid.`);
}

function workItemId(value: unknown, label: string) {
  match(value, workItemIdPattern, label);
}

function workItemIdList(value: unknown, label: string) {
  if (!Array.isArray(value)) invalid(`${label} is invalid.`);
  for (const item of value as unknown[]) workItemId(item, label);
}
