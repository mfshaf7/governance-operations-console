import { assertEffectiveModelSelection } from "../../../console-integration/governed-ai/model-selection.ts";
import type { PrototypeGenerationRequest, PrototypeOwnerPreparation, PrototypeSourceCommand, PrototypeSourceDraft, PrototypeSourceIntent, PrototypeSourceProjection, PrototypeSourceRequest, PrototypeSourceSummary } from "./prototype-source-types.ts";
import { assertPrototypeDeliveryPreparation } from "./prototype-delivery-preparation-contract.ts";

export function sourceObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid();
  return value as Record<string, unknown>;
}
export function sourceText(value: unknown, max = 256): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) invalid();
  return value;
}
export function sourceTimestamp(value: unknown): string {
  const result = sourceText(value, 64);
  if (!/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(result) || !Number.isFinite(Date.parse(result))) invalid();
  return result;
}
export function sourceId(value: unknown): string {
  const result = sourceText(value);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/.test(result)) invalid();
  return result;
}
export function prototypeSourceRequestId(value: unknown): string {
  const result = sourceId(value);
  if (!/^prototype-source-request:[A-Za-z0-9][A-Za-z0-9._:-]{0,230}$/.test(result)) invalid();
  return result;
}
export function sourceIntentReference(value: unknown): string {
  const result = sourceText(value);
  if (!/^source-intent:[A-Za-z0-9][A-Za-z0-9._:/@+\-]{0,241}$/.test(result)) invalid();
  return result;
}
export function sourceDigest(value: unknown): string {
  const result = sourceText(value); if (!/^sha256:[0-9a-f]{64}$/.test(result)) invalid(); return result;
}
export function sourceCommit(value: unknown): string {
  const result = sourceText(value); if (!/^[0-9a-f]{40}$/.test(result)) invalid(); return result;
}
function nullable<T>(value: unknown, parse: (value: unknown) => T): T | null { return value === null ? null : parse(value); }
function array(value: unknown, max: number): unknown[] { if (!Array.isArray(value) || value.length > max) invalid(); return value; }
function exact(value: Record<string, unknown>, keys: string[]) { if (Object.keys(value).sort().join(",") !== keys.sort().join(",")) invalid(); }
function path(value: unknown) {
  const result = sourceText(value, 240);
  if (!/^[A-Za-z0-9._/-]+$/.test(result) || result.startsWith("/") || result.split("/").some(part => !part || part === "." || part === ".." || part === ".git")) invalid();
  return result;
}
function prototypeId(value: unknown) { const result = sourceText(value); if (!/^prototype:[a-z0-9]+(?:-[a-z0-9]+)*$/.test(result)) invalid(); return result; }
function nextAction(value: unknown) { const item = sourceObject(value); return { code: sourceId(item.code), authority: sourceId(item.authority), ...(item.reason === undefined ? {} : { reason: sourceText(item.reason, 4096) }) }; }
function pullRequest(value: unknown) {
  const item = sourceObject(value), url = sourceText(item.url, 1024);
  if (!/^https:\/\/github\.com\/[A-Za-z0-9-]+\/[A-Za-z0-9._-]+\/pull\/[1-9][0-9]*$/.test(url)) invalid();
  return { url, head_commit: sourceCommit(item.head_commit) };
}
function command(value: unknown): PrototypeSourceCommand {
  const item = sourceObject(value);
  exact(item, ["schema_version", "command_id", "expected_revision", "requested_at", "expected_pull_request"]);
  if (item.schema_version !== 1) invalid();
  return { schema_version: 1, command_id: sourceId(item.command_id), expected_revision: sourceTimestamp(item.expected_revision), requested_at: sourceTimestamp(item.requested_at), expected_pull_request: nullable(item.expected_pull_request, pullRequest) };
}
function generation(value: unknown): PrototypeGenerationRequest {
  const item = sourceObject(value);
  exact(item, ["schema_version", "request_id", "execution_id", "expected_revision", "budget_tokens", "retry_of", "requested_at", "source_intent_ref"]);
  if (item.schema_version !== 1 || !Number.isInteger(item.budget_tokens) || Number(item.budget_tokens) < 1 || Number(item.budget_tokens) > 8000) invalid();
  return { schema_version: 1, request_id: sourceId(item.request_id), execution_id: sourceId(item.execution_id), expected_revision: sourceTimestamp(item.expected_revision), budget_tokens: Number(item.budget_tokens), retry_of: nullable(item.retry_of, sourceId), requested_at: sourceTimestamp(item.requested_at), source_intent_ref: sourceIntentReference(item.source_intent_ref) };
}
export function assertPrototypeSourceRequest(value: unknown): PrototypeSourceRequest {
  const item = sourceObject(value);
  exact(item, ["schema_version", "request_id", "prototype_id", "expected_registry_revision", "expected_source_revision", "objective", "requested_at", ...(Object.hasOwn(item, "owner_preparation") ? ["owner_preparation"] : [])]);
  const objective = sourceText(item.objective, 16384);
  if (item.schema_version !== 1 || objective.trim().length < 8 || new TextEncoder().encode(objective).length > 16384) invalid();
  return { schema_version: 1, request_id: prototypeSourceRequestId(item.request_id), prototype_id: prototypeId(item.prototype_id), expected_registry_revision: sourceCommit(item.expected_registry_revision), expected_source_revision: sourceCommit(item.expected_source_revision), objective, requested_at: sourceTimestamp(item.requested_at), ...(Object.hasOwn(item, "owner_preparation") ? { owner_preparation: assertPrototypeOwnerPreparation(item.owner_preparation) } : {}) };
}
export function assertPrototypeOwnerPreparation(value: unknown): PrototypeOwnerPreparation {
  const item = sourceObject(value);
  if (item.kind === "delivery-packet") return assertPrototypeDeliveryPreparation(value);
  exact(item, ["kind", "port", "support_profile", "runtime_activation", "ttl_seconds", "decision_ref"]);
  if (item.kind !== "preview-profile" || !Number.isInteger(item.port) || Number(item.port) < 1024 || Number(item.port) > 65535 ||
      !["interactive", "unattended"].includes(String(item.support_profile)) || typeof item.runtime_activation !== "boolean" ||
      !Number.isInteger(item.ttl_seconds) || Number(item.ttl_seconds) < 300 || Number(item.ttl_seconds) > 86400) invalid();
  const decision = sourceText(item.decision_ref, 512);
  if (!/^record:\/\/[A-Za-z0-9._:/-]+$/.test(decision)) invalid();
  return { kind: "preview-profile", port: Number(item.port), support_profile: item.support_profile as "interactive" | "unattended",
    runtime_activation: item.runtime_activation, ttl_seconds: Number(item.ttl_seconds), decision_ref: decision };
}
function ownerPreparationEvidence(value: unknown): { plan_digest: string; request_digest: string } | null {
  if (value === undefined) return null;
  const item = sourceObject(value);
  exact(item, ["plan_digest", "request_digest", "authority", "model_invoked", "runtime_activated"]);
  if (item.authority !== "workspace-prototype-studio" || item.model_invoked !== false || item.runtime_activated !== false) invalid();
  return { plan_digest: sourceDigest(item.plan_digest), request_digest: sourceDigest(item.request_digest) };
}
export function projectPrototypeSourceSummary(value: unknown): PrototypeSourceSummary {
  const item = sourceObject(value), scope = sourceObject(item.source_scope), landing = sourceObject(item.landing_unit);
  if (item.schema_version !== 1 || item.workflow_id !== "prototype-source-authoring" || item.canonical_mutation !== false || item.runtime_activation !== false || !["prepared", "source-authorization-required", "source-work", "succeeded"].includes(String(item.state))) invalid();
  const id = prototypeId(item.prototype_id), slug = id.slice("prototype:".length), subject = sourceObject(item.subject);
  if (subject.kind !== "prototype" || subject.prototype_id !== id || subject.registry_ref !== `record://prototypes/${slug}` || subject.source_ref !== `repo://workspace-prototype-studio/prototypes/${slug}` || scope.source_root !== `prototypes/${slug}` || scope.design_profile !== `docs/prototypes/${slug}/design-profile.md`) invalid();
  sourceCommit(subject.registry_revision); sourceCommit(subject.source_revision);
  return { request_id: prototypeSourceRequestId(item.request_id), prototype_id: prototypeId(item.prototype_id), session_id: nullable(item.session_id, sourceId), state: String(item.state), created_at: sourceTimestamp(item.created_at), updated_at: sourceTimestamp(item.updated_at), source_start_digest: sourceDigest(item.source_start_digest), source_scope: { source_root: path(scope.source_root), design_profile: path(scope.design_profile) }, landing_unit: { landing_unit_id: sourceId(landing.landing_unit_id), branch: path(landing.branch), fetched_base: sourceCommit(landing.fetched_base) }, next_action: nextAction(item.next_action) };
}
export function projectPrototypeSource(value: unknown): PrototypeSourceProjection {
  const item = sourceObject(value), summary = projectPrototypeSourceSummary(value), request = assertPrototypeSourceRequest(item.source_request);
  if (summary.request_id !== request.request_id || summary.prototype_id !== request.prototype_id) invalid();
  const delivery = sourceObject(item.source_delivery), sourceDelivery: PrototypeSourceProjection["source_delivery"] = {};
  for (const action of ["publish", "review", "merge", "close"] as const) {
    if (!Object.hasOwn(delivery, action)) continue;
    const control = sourceObject(delivery[action]), retained = command(control.command);
    if (!["pending", "unknown", "succeeded"].includes(String(control.state)) || control.command_id !== retained.command_id) invalid();
    sourceDelivery[action] = { command: retained, state: control.state as "pending" | "unknown" | "succeeded", pull_request: control.pull_request ? pullRequest(control.pull_request) : null, failure: control.failure ? sourceId(sourceObject(control.failure).code) : null };
  }
  const realization = item.realization === null ? null : sourceObject(item.realization), attempt = realization?.attempt === null || !realization ? null : sourceObject(realization.attempt);
  if (realization && (realization.schema_version !== 1 || realization.workflow_id !== "prototype-source-realization" || realization.session_id !== summary.session_id || !["not-started", "accepted", "draft-ready", "applying", "apply-unknown", "source-created", "failed", "cancelled"].includes(String(realization.state)))) invalid();
  const change = attempt?.change_set ? sourceObject(attempt.change_set) : null;
  const result: PrototypeSourceProjection = { ...summary, source_request: request, source_intent_ref: nullable(item.source_intent_ref, sourceIntentReference), source_delivery: sourceDelivery,
    realization: realization ? { session_id: sourceId(realization.session_id), revision: sourceTimestamp(realization.revision), state: String(realization.state), attempt: attempt ? {
      request: generation(attempt.request), request_id: sourceId(attempt.request_id), execution_id: sourceId(attempt.execution_id), retry_of: nullable(attempt.retry_of, sourceId), state: sourceText(attempt.state), objective_digest: sourceDigest(attempt.objective_digest),
      context_packet_ref: attempt.context ? sourceText(sourceObject(attempt.context).packet_ref, 1024) : null, model_profile_id: attempt.model ? sourceId(sourceObject(attempt.model).profile_id) : null, failure: attempt.failure ? sourceId(sourceObject(attempt.failure).code) : null,
      ...(attempt.model && Object.hasOwn(sourceObject(attempt.model), "effective_selection") ? {
        effective_model_selection: assertEffectiveModelSelection(sourceObject(attempt.model).effective_selection, sourceId(sourceObject(attempt.model).profile_id) + "/prototype_source_authoring"),
      } : {}),
      owner_preparation: ownerPreparationEvidence(attempt.owner_preparation),
      change_set: change ? { digest: sourceDigest(change.digest), commit_message: sourceText(change.commit_message, 120), operations: array(change.operations, 64).map(value => { const row = sourceObject(value); if (!["create", "replace", "delete"].includes(String(row.action))) invalid(); return { action: row.action as "create" | "replace" | "delete", path: path(row.path), expected_digest: nullable(row.expected_digest, sourceDigest), content_digest: nullable(row.content_digest, sourceDigest) }; }) } : null,
      source_receipt: attempt.source_receipt ? { head_commit: sourceCommit(sourceObject(attempt.source_receipt).head_commit), receipt_digest: sourceDigest(sourceObject(attempt.source_receipt).receipt_digest) } : null,
    } : null } : null };
  const projected = result.realization?.attempt;
  if (projected && (projected.state !== result.realization?.state || projected.request_id !== projected.request.request_id || projected.execution_id !== projected.request.execution_id || projected.retry_of !== projected.request.retry_of)) invalid();
  return result;
}
export function projectPrototypeSourceDraft(value: unknown): PrototypeSourceDraft {
  const item = sourceObject(value), change = sourceObject(item.change_set);
  if (item.schema_version !== 1 || item.workflow_id !== "prototype-source-draft" || typeof item.accepted !== "boolean") invalid();
  return { request_id: prototypeSourceRequestId(item.request_id), session_id: sourceId(item.session_id), revision: sourceTimestamp(item.revision), digest: sourceDigest(item.digest), accepted: item.accepted,
    change_set: { commit_message: sourceText(change.commit_message, 120), operations: array(change.operations, 64).map(value => { const row = sourceObject(value); if (!["create", "replace", "delete"].includes(String(row.action))) invalid(); return { action: row.action as "create" | "replace" | "delete", path: path(row.path), content: row.content === null ? null : sourceContent(row.content), expected_digest: nullable(row.expected_digest, sourceDigest) }; }) } };
}
function sourceContent(value: unknown): string {
  if (typeof value !== "string" || new TextEncoder().encode(value).length > 65536) invalid();
  try { encodeURIComponent(value); } catch { invalid(); }
  return value;
}
export function assertPrototypeSourceIntent(value: unknown): PrototypeSourceIntent {
  const item = sourceObject(value);
  const actions = ["session", "generate", "accept", "recover", "cancel-attempt", "publish", "review", "merge", "close"] as const;
  if (!actions.includes(item.action as typeof actions[number])) invalid();
  exact(item, ["action", "commandId", "requestedAt", "sourceIntentRef", "expectedRevision", ...(item.action === "cancel-attempt" ? ["reason"] : []), ...(item.action === "accept" ? ["acceptedChangeSetDigest"] : [])]);
  return { action: item.action as PrototypeSourceIntent["action"], commandId: sourceId(item.commandId), requestedAt: sourceTimestamp(item.requestedAt), expectedRevision: sourceTimestamp(item.expectedRevision), sourceIntentRef: nullable(item.sourceIntentRef, sourceIntentReference), ...(item.action === "cancel-attempt" ? { reason: sourceText(item.reason, 4096) } : {}), ...(item.action === "accept" ? { acceptedChangeSetDigest: sourceDigest(item.acceptedChangeSetDigest) } : {}) };
}
function invalid(): never { throw new Error("Prototype source state or intent is malformed, mismatched or outside its bounded contract."); }
