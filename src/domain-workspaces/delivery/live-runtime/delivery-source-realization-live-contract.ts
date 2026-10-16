import type { DeliverySourceRealizationInput, DeliverySourceRealizationProjection } from "./delivery-source-realization-live-types.ts";

const digestPattern = /^sha256:[0-9a-f]{64}$/;
const stablePattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;
const states = new Set(["not-started", "accepted", "draft-ready", "applying", "apply-unknown", "source-created", "cancelled", "failed"]);

export function assertDeliverySourceRealizationProjection(value: unknown): DeliverySourceRealizationProjection {
  const item = record(value);
  if (item.schema_version !== 1 || item.workflow_id !== "delivery-art-source-realization" || !states.has(String(item.state))) invalid();
  const next = record(item.next_action);
  const attempt = item.attempt === null ? null : record(item.attempt);
  const change = attempt?.change_set === null || !attempt ? null : record(attempt.change_set);
  const receipt = attempt?.source_receipt === null || !attempt ? null : record(attempt.source_receipt);
  const model = attempt?.model === null || !attempt ? null : record(attempt.model);
  const context = attempt?.context === null || !attempt ? null : record(attempt.context);
  const failure = attempt?.failure === null || !attempt ? null : record(attempt.failure);
  if (attempt && attempt.state !== item.state) invalid();
  if (item.state === "not-started" ? attempt !== null : attempt === null) invalid();
  if (item.state === "draft-ready" && !change) invalid();
  if (item.state === "source-created" && (!receipt || !change || receipt.change_set_digest !== change.digest)) invalid();
  const expectedAction: Record<string, string> = { "not-started": "source-realization-start-required", accepted: "source-realization-in-progress", "draft-ready": "source-realization-acceptance-required", applying: "source-realization-recovery-required", "apply-unknown": "source-realization-recovery-required", "source-created": "work-session-continue-required", cancelled: "source-realization-retry-available", failed: "source-realization-retry-available" };
  if (next.code !== "source-realization-runtime-required" && next.code !== expectedAction[String(item.state)]) invalid();
  if (receipt && item.state !== "source-created") invalid();
  const operations = change ? array(change.operations).map((entry) => {
    const operation = record(entry);
    if (Object.keys(operation).sort().join(",") !== "action,content_digest,expected_digest,path") invalid();
    if (!["create", "replace", "delete"].includes(String(operation.action))) invalid();
    const path = text(operation.path, 240);
    if (!/^[A-Za-z0-9._/-]+$/.test(path) || path.startsWith("/") || path.split("/").some((part) => !part || part === "." || part === ".." || part === ".git")) invalid();
    const contentDigest = nullableDigest(operation.content_digest);
    const expectedDigest = nullableDigest(operation.expected_digest);
    if (operation.action === "create" && (!contentDigest || expectedDigest !== null) ||
        operation.action === "replace" && (!contentDigest || !expectedDigest) ||
        operation.action === "delete" && (contentDigest !== null || !expectedDigest)) invalid();
    return { action: operation.action as "create" | "replace" | "delete", path, content_digest: contentDigest, expected_digest: expectedDigest };
  }) : [];
  if (change && (operations.length < 1 || operations.length > 64 || new Set(operations.map((entry) => entry.path)).size !== operations.length)) invalid();
  const result: DeliverySourceRealizationProjection = {
    schema_version: 1, workflow_id: "delivery-art-source-realization",
    session_id: stable(item.session_id), work_item_id: text(item.work_item_id), revision: date(item.revision),
    state: item.state as DeliverySourceRealizationProjection["state"],
    next_action: { authority: text(next.authority), code: text(next.code), reason: text(next.reason, 2000) },
    replayed: boolean(item.replayed),
    attempt: attempt ? {
      request_id: stable(attempt.request_id), state: text(attempt.state), retry_of: nullableStable(attempt.retry_of), objective_digest: digest(attempt.objective_digest),
      model: model ? { profile_id: text(model.profile_id) } : null,
      context: context ? { packet_ref: text(context.packet_ref, 1024) } : null,
      change_set: change ? { digest: digest(change.digest), commit_message: text(change.commit_message, 120), operations } : null,
      source_receipt: receipt ? { receipt_id: stable(receipt.receipt_id), receipt_digest: digest(receipt.receipt_digest), head_commit: commit(receipt.head_commit), change_set_digest: digest(receipt.change_set_digest) } : null,
      failure: failure ? { code: text(failure.code), retryable: boolean(failure.retryable) } : null,
    } : null,
  };
  if (!/^work-item-[1-9][0-9]*$/.test(result.work_item_id)) invalid();
  return result;
}

export function assertDeliverySourceRealizationInput(value: unknown): DeliverySourceRealizationInput {
  const input = record(value);
  const common = { commandId: stable(input.commandId), requestedAt: date(input.requestedAt) };
  const keys = ["action", "commandId", "requestedAt"];
  let result: DeliverySourceRealizationInput;
  if (input.action === "start") {
    keys.push("expectedSessionRevision", "objective", "budgetTokens", "retryOf");
    const objective = text(input.objective, 12000);
    if (objective.trim().length < 20 || !Number.isInteger(input.budgetTokens) || Number(input.budgetTokens) < 256 || Number(input.budgetTokens) > 8000) invalid();
    result = { ...common, action: "start", expectedSessionRevision: date(input.expectedSessionRevision), objective, budgetTokens: Number(input.budgetTokens), retryOf: nullableStable(input.retryOf) };
  } else if (input.action === "continue") {
    keys.push("expectedRevision", "acceptedChangeSetDigest");
    result = { ...common, action: "continue", expectedRevision: date(input.expectedRevision), acceptedChangeSetDigest: digest(input.acceptedChangeSetDigest) };
  } else if (input.action === "cancel") {
    keys.push("expectedRevision", "reason");
    const reason = text(input.reason, 2000);
    if (reason.trim().length < 20) invalid();
    result = { ...common, action: "cancel", expectedRevision: date(input.expectedRevision), reason };
  } else if (input.action === "recover") {
    keys.push("expectedRevision");
    result = { ...common, action: "recover", expectedRevision: date(input.expectedRevision) };
  } else invalid();
  if (Object.keys(input).sort().join(",") !== keys.sort().join(",")) invalid();
  return result;
}

function invalid(): never { throw new Error("Source realization contains missing, malformed or unauthorized fields."); }
function record(value: unknown): Record<string, unknown> { if (!value || typeof value !== "object" || Array.isArray(value)) invalid(); return value as Record<string, unknown>; }
function text(value: unknown, max = 256): string { if (typeof value !== "string" || !value.trim() || value.length > max) invalid(); return value; }
function array(value: unknown): unknown[] { if (!Array.isArray(value)) invalid(); return value; }
function stable(value: unknown): string { const result = text(value); if (!stablePattern.test(result)) invalid(); return result; }
function nullableStable(value: unknown) { return value === null ? null : stable(value); }
function date(value: unknown): string { const result = text(value, 64); if (!Number.isFinite(Date.parse(result))) invalid(); return result; }
function digest(value: unknown): string { const result = text(value); if (!digestPattern.test(result)) invalid(); return result; }
function nullableDigest(value: unknown) { return value === null ? null : digest(value); }
function commit(value: unknown): string { const result = text(value); if (!/^[0-9a-f]{40}$/.test(result)) invalid(); return result; }
function boolean(value: unknown): boolean { if (typeof value !== "boolean") invalid(); return value; }
