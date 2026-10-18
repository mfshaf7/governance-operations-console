import { resolveConsoleOosOperatorConfiguration, type ConsoleOosOperatorConfiguration } from "../../../console-integration/configuration/console-runtime-configuration.ts";
import { assertPrototypeSourceIntent, assertPrototypeSourceRequest, projectPrototypeSource, projectPrototypeSourceDraft, projectPrototypeSourceSummary, prototypeSourceRequestId, sourceDigest, sourceObject } from "../live-runtime/prototype-source-contract.ts";
import type { PrototypeSourceIntent, PrototypeSourceProjection } from "../live-runtime/prototype-source-types.ts";
import { prototypeCanonicalDigest as digest, prototypeOwnerRequest } from "./prototype-landing-oos-client.ts";

type Options = { config?: ConsoleOosOperatorConfiguration; fetchImpl?: typeof fetch };
const basePath = "/v1/prototype-source-requests";
const authority = { authority: "operator-orchestration-service", sourceOwner: "operator-orchestration-service" };
const requestPath = (id: string) => `${basePath}/${encodeURIComponent(prototypeSourceRequestId(id))}`;

export async function listPrototypeSources(options: Options = {}) {
  const body = sourceObject(await request(basePath, undefined, options));
  if (body.workflow_id !== "prototype-source-authoring-list" || !Array.isArray(body.requests) || body.requests.length > 200) throw new Error("Invalid Prototype source list.");
  return body.requests.map(projectPrototypeSourceSummary);
}
export async function readPrototypeSource(id: string, options: Options = {}) {
  const raw = sourceObject(await request(requestPath(id), undefined, options));
  verifyEvidence(raw);
  const result = projectPrototypeSource(raw);
  if (result.request_id !== id) throw new Error("Prototype source request binding changed.");
  return result;
}
export async function createPrototypeSource(input: unknown, options: Options = {}) {
  const approved = assertPrototypeSourceRequest(input);
  await request(basePath, approved, options);
  const result = await readPrototypeSource(approved.request_id, options);
  if (digest(result.source_request) !== digest(approved)) throw new Error("Prototype source preparation did not retain its exact request.");
  return result;
}
export async function readPrototypeSourceDraft(id: string, options: Options = {}) {
  const current = await readPrototypeSource(id, options);
  const raw = sourceObject(await request(`${requestPath(id)}/draft`, undefined, options));
  const draft = projectPrototypeSourceDraft(raw), change = sourceObject(raw.change_set);
  if (digest(raw.change_set) !== draft.digest || current.realization?.attempt?.change_set?.digest !== draft.digest || change.session_id !== current.session_id || draft.session_id !== current.session_id || draft.request_id !== id || draft.revision !== current.realization.revision) throw new Error("Source draft does not match the exact current request, session and change-set digest.");
  for (const row of draft.change_set.operations) assertScope(row.path, current);
  return draft;
}
export async function commandPrototypeSource(id: string, value: unknown, options: Options = {}) {
  const intent = assertPrototypeSourceIntent(value), current = await readPrototypeSource(id, options);
  const body = buildPrototypeSourceCommand(current, intent);
  if (body !== null) await request(`${requestPath(id)}/${intent.action}`, body, options, intent.action === "generate" ? 300000 : 75000);
  return readPrototypeSource(id, options);
}

export function buildPrototypeSourceCommand(current: PrototypeSourceProjection, intent: PrototypeSourceIntent): unknown {
  const realization = current.realization, attempt = realization?.attempt;
  if (intent.expectedRevision !== (realization?.revision ?? current.updated_at)) throw new Error("Prototype source changed after operator review; refresh before a new command.");
  const authorized = () => { if (!intent.sourceIntentRef) throw new Error("Explicit source authorization is required."); return intent.sourceIntentRef; };
  const command = { schema_version: 1, command_id: `prototype-command:${digest({ request: current.request_id, nonce: intent.commandId }).slice(7, 47)}`, expected_revision: realization?.revision ?? current.updated_at, requested_at: intent.requestedAt };
  if (intent.action === "session") return {
    schema_version: 1, command_id: `prototype-session:${digest(current.request_id).slice(7, 47)}`,
    source_intent_ref: authorized(), requested_at: current.source_request.requested_at,
  };
  if (!realization) throw new Error("Start the actual source session before authoring.");
  if (intent.action === "generate") {
    if (attempt?.state === "accepted") return { ...attempt.request, source_intent_ref: authorized() };
    if (attempt && !["failed", "cancelled"].includes(attempt.state)) throw new Error("Reconcile the current attempt instead of generating another draft.");
    return { schema_version: 1, request_id: `prototype-generation:${digest({ request: current.request_id, nonce: intent.commandId }).slice(7, 47)}`,
      execution_id: `prototype-execution:${digest({ request: current.request_id, nonce: intent.commandId }).slice(7, 47)}`, expected_revision: realization.revision,
      requested_at: intent.requestedAt, budget_tokens: 4000, retry_of: attempt?.request_id ?? null, source_intent_ref: authorized() };
  }
  if (intent.action === "accept") {
    if (realization.state !== "draft-ready" || !attempt?.change_set || intent.acceptedChangeSetDigest !== attempt.change_set.digest) throw new Error("Only the inspected exact current source draft digest can be accepted.");
    return { command: { ...command, accepted_change_set_digest: intent.acceptedChangeSetDigest }, source_intent_ref: authorized() };
  }
  if (intent.action === "recover") return { command, source_intent_ref: authorized() };
  if (intent.action === "cancel-attempt") return { ...command, reason: intent.reason };
  const retained = current.source_delivery[intent.action];
  if (retained?.state === "succeeded") return null;
  const original = retained?.command ?? { ...command, expected_pull_request: intent.action === "publish" ? null : current.source_delivery.publish?.pull_request };
  if (intent.action !== "publish" && !original.expected_pull_request) throw new Error("The exact published PR and head must be retained before human source controls.");
  return { command: original, ...(intent.action === "publish" ? { source_intent_ref: authorized() } : {}) };
}

async function request(path: string, body: unknown, options: Options, timeoutMs = 12000) {
  const config = options.config ?? resolveConsoleOosOperatorConfiguration();
  const read = body === undefined;
  const suffix = path.slice(basePath.length);
  const decoded = suffix ? `/${decodeURIComponent(suffix.slice(1).replace(/\/draft$/, ""))}${suffix.endsWith("/draft") ? "/draft" : ""}` : "";
  return prototypeOwnerRequest(path + (read && !suffix ? "?limit=200" : ""), {
    method: read ? "GET" : "POST", headers: { "x-oos-operator-id": config.operatorId },
    ...(read ? {} : { body: JSON.stringify(body) }), redirect: "error",
  }, { ...options, config }, read ? { ...authority, recordRef: `oos://prototype-source-requests${decoded}` } : undefined, 2 * 1024 * 1024, timeoutMs);
}
function assertScope(path: string, current: PrototypeSourceProjection) {
  if (current.source_request.owner_preparation) {
    if (current.source_request.owner_preparation.kind === "delivery-packet") {
      const slug = current.prototype_id.slice("prototype:".length);
      if (path !== "prototypes.yaml" && !new RegExp(`^records/delivery-packets/${slug}-[a-f0-9]{64}\\.json$`).test(path)) throw new Error("Owner preparation escapes its exact Studio packet/registry scope.");
      return;
    }
    if (path !== `records/prototype-preview-profiles/${current.prototype_id.slice("prototype:".length)}.yaml`) throw new Error("Owner preparation escapes its exact Studio Preview profile.");
    return;
  }
  if (!path.startsWith(`${current.source_scope.source_root}/`) && path !== current.source_scope.design_profile) throw new Error("Source operation escapes this Prototype app/design scope.");
}
function verifyEvidence(raw: Record<string, unknown>) {
  const realization = raw.realization ? sourceObject(raw.realization) : null, attempt = realization?.attempt ? sourceObject(realization.attempt) : null;
  if (attempt?.source_receipt) {
    const { receipt_digest, ...receipt } = sourceObject(attempt.source_receipt);
    if (digest(receipt) !== sourceDigest(receipt_digest) || receipt.outcome !== "committed" || receipt.session_id !== raw.session_id || receipt.change_set_digest !== sourceObject(attempt.change_set).digest) throw new Error("Source receipt integrity or session/draft binding failed.");
  }
  for (const value of Object.values(sourceObject(raw.source_delivery))) {
    const control = sourceObject(value);
    if (digest(control.command) !== sourceDigest(control.command_digest)) throw new Error("Retained source control does not match its immutable command digest.");
  }
  const projection = projectPrototypeSource(raw);
  const prepared = projection.realization?.attempt?.owner_preparation;
  if (prepared && (!projection.source_request.owner_preparation || projection.realization?.attempt?.model_profile_id || projection.realization?.attempt?.context_packet_ref)) throw new Error("Trusted owner preparation cannot borrow model or context authority.");
  if (projection.source_request.owner_preparation && projection.realization?.attempt?.change_set && !prepared) throw new Error("Owner metadata draft lacks its native preparation evidence.");
  if (prepared && projection.realization?.attempt?.change_set) {
    const change = sourceObject(attempt?.change_set), operations = projection.realization.attempt.change_set.operations;
    if (change.change_set_id !== `prototype-owner-plan:${prepared.plan_digest.slice(7)}`) throw new Error("Owner draft is not bound to its retained plan identity.");
    if (projection.source_request.owner_preparation?.kind === "delivery-packet"
      ? operations.length !== 2 || !operations.some(operation => operation.path === "prototypes.yaml" && operation.action === "replace" && operation.expected_digest !== null) ||
        operations.some(operation => operation.path !== "prototypes.yaml" && (operation.action !== "create" || operation.expected_digest !== null))
      : operations.length !== 1 || !["create", "replace"].includes(operations[0].action)) throw new Error("Owner draft operations do not match their finite preparation purpose.");
  }
  for (const operation of projection.realization?.attempt?.change_set?.operations ?? []) assertScope(operation.path, projection);
  const objective = projection.realization?.attempt?.objective_digest;
  if (objective && digest(projection.source_request.objective) !== objective) throw new Error("Source attempt belongs to another objective.");
}
