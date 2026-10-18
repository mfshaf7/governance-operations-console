import { resolveConsoleOosOperatorConfiguration, type ConsoleOosOperatorConfiguration } from "../../console-integration/configuration/console-runtime-configuration.ts";
import { assertSourceAuthorizationPreparation, sourceIntentFromReceipt, type SourceAuthorizationPreparation } from "../live-runtime/source-authorization-contract.ts";
import { controlPlatformOperation, platformCanonicalDigest as digest, platformOwnerRequest, readPlatformOperation, readPlatformOperations, submitPlatformOperation } from "./platform-operation-oos-client.ts";

type Options = { config?: ConsoleOosOperatorConfiguration; fetchImpl?: typeof fetch };
const base = "/v1/platform-operations/source-preparations";
export async function listSourceAuthorizations(options: Options = {}) {
  const value = await platformOwnerRequest(`${base}?limit=200`, { method: "GET" }, options);
  if (!object(value) || value.workflow_id !== "source-credential-preparation-list" || !Array.isArray(value.preparations) || value.preparations.length > 200) throw new Error("Source authorization list is malformed.");
  return value.preparations.map(verifyPreparation);
}
export async function readSourceAuthorization(intentId: string, options: Options = {}) {
  identifier(intentId);
  const result = verifyPreparation(await platformOwnerRequest(`${base}/${encodeURIComponent(intentId)}`, { method: "GET" }, options));
  if (result.intent_id !== intentId) throw new Error("Source authority returned another intent.");
  return result;
}
export async function prepareSourceAuthorization(input: unknown, options: Options = {}) {
  if (!object(input) || Object.keys(input).sort().join(",") !== "decision,expiresAt,preparationId,subject,supersedesIntentDigest" || !object(input.subject)) throw new Error("Source authorization preparation has invalid fields.");
  identifier(input.preparationId, 190);
  const subject = input.subject;
  if (subject.kind === "prototype") {
    if (Object.keys(subject).sort().join(",") !== "kind,prototype_id,source_request_id" || typeof subject.prototype_id !== "string" || !/^prototype:[a-z0-9]+(?:-[a-z0-9]+)*$/.test(subject.prototype_id) || typeof subject.source_request_id !== "string" || !/^prototype-source-request:[A-Za-z0-9][A-Za-z0-9._:-]{0,230}$/.test(subject.source_request_id) || input.decision !== null) throw new Error("Select the actual Prototype source request, not repository coordinates or a Delivery decision.");
  } else if (subject.kind === "delivery") {
    if (Object.keys(subject).sort().join(",") !== "kind,work_item_ref" || typeof subject.work_item_ref !== "string" || !/^work-item-[1-9][0-9]*$/.test(subject.work_item_ref) || (input.decision !== null && !object(input.decision))) throw new Error("Select the actual Delivery work item and its canonical start decision.");
  } else throw new Error("Only Delivery and Prototype source authorization are admitted.");
  const preparation = { preparation_id: input.preparationId, subject, decision: input.decision, expires_at: input.expiresAt, supersedes_intent_digest: input.supersedesIntentDigest };
  return verifyPreparation(await platformOwnerRequest(base, { method: "POST", body: JSON.stringify({ preparation }) }, options));
}
export async function commandSourceAuthorization(intentId: string, value: unknown, options: Options = {}) {
  if (!object(value) || Object.keys(value).sort().join(",") !== "action,commandId,expectedIntentDigest,requestedAt" || !["issue", "revoke"].includes(String(value.action)) || typeof value.requestedAt !== "string" || !Number.isFinite(Date.parse(value.requestedAt))) throw new Error("An exact explicit source authorization decision is required.");
  identifier(value.commandId);
  const preparation = await readSourceAuthorization(intentId, options), config = options.config ?? resolveConsoleOosOperatorConfiguration();
  if (value.expectedIntentDigest !== preparation.source_intent_digest || preparation.source_intent.operator_id !== config.operatorId) throw new Error("Reviewed source authorization digest or operator changed.");
  if (value.action === "issue" && !["prepared", "approved"].includes(preparation.authorization.state)) throw new Error("Stopped or expired scope requires a fresh explicit successor, not reapproval of the old intent.");
  const original = preparation.operation_refs[value.action as "issue" | "revoke"];
  if (original && !(value.action === "revoke" && preparation.authorization.state === "revoked")) {
    const operation = await readPlatformOperation(original, { ...options, config });
    if (operation.command.action !== `agent-source.${value.action}` || digest(operation.command.input.source_intent) !== preparation.source_intent_digest) throw new Error("The retained source operation belongs to another action or immutable scope.");
    const retryAfter = operation.provider_operation.failure?.retry_after;
    if (operation.state === "failed" && operation.provider_operation.retryable && (!retryAfter || Date.parse(retryAfter) <= Date.now())) {
      const nonce = `source-reconcile:${digest({ operation_id: original, attempt: operation.provider_operation.attempt }).slice(7, 39)}`;
      const previous = operation.controls.find(control => control.control_id === `console-control:${nonce}`);
      const at = previous?.requested_at ?? operation.provider_operation.updated_at;
      await controlPlatformOperation(original, { action: "retry", requestId: nonce, reason: "Reconcile the original explicitly approved source authorization without changing its scope." }, { ...options, config, now: () => new Date(at) });
    }
    return readSourceAuthorization(intentId, { ...options, config });
  }
  if (value.action === "issue" && preparation.authorization.state === "approved" || value.action === "revoke" && preparation.authorization.state === "revoked") return preparation;
  if (value.action === "issue" && preparation.authorization.state !== "prepared") throw new Error("Stopped or expired scope requires a fresh explicit successor, not reapproval of the old intent.");
  const catalog = await readPlatformOperations({ ...options, config });
  const action = `agent-source.${value.action}`;
  const matches = catalog.catalog?.subjects.filter(subject => subject.kind === "dev-integration-profile" && subject.ref === "profile:accepted-idea-delivery" && subject.capabilities.some(capability => capability.action === action && capability.capability_id === action)) ?? [];
  if (matches.length !== 1) throw new Error("The existing admitted source issuer is unavailable in the canonical Platform catalog.");
  await submitPlatformOperation({ capabilityId: action, input: { source_intent: preparation.source_intent, session_id: preparation.session_id }, requestId: value.commandId, requestedAt: value.requestedAt, subjectRef: matches[0].ref }, { ...options, config });
  return readSourceAuthorization(intentId, { ...options, config });
}
function verifyPreparation(value: unknown): SourceAuthorizationPreparation {
  const result = assertSourceAuthorizationPreparation(value);
  if (digest(result.source_intent) !== result.source_intent_digest) throw new Error("Source preparation intent digest does not verify.");
  const receipt = result.authorization.credential_receipt;
  if (receipt) {
    const { receipt_digest: claimed, ...body } = receipt;
    if (digest(body) !== claimed || digest(sourceIntentFromReceipt(receipt)) !== result.source_intent_digest) throw new Error("Source credential receipt does not verify against its immutable scope.");
  }
  return result;
}
function object(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function identifier(value: unknown, max = 256) { if (typeof value !== "string" || value.length > max || !/^[A-Za-z0-9][A-Za-z0-9._:/@+\-]*$/.test(value)) throw new Error("Source authorization identity is invalid."); }
