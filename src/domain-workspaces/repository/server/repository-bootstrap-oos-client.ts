import { createHash } from "node:crypto";
import { resolveConsoleOosOperatorConfiguration, type ConsoleOosOperatorConfiguration } from "../../../console-integration/configuration/console-runtime-configuration.ts";
import { consoleMutationAttributionHeaders } from "../../../console-integration/identity/server/console-session-authorization.ts";
import { acceptCurrentConsoleSourceProjection, consoleSourceProjectionHeaders } from "../../../console-integration/source-authority/console-source-authority.ts";
import { bootstrapClosed as closed, bootstrapDigest, bootstrapId, bootstrapObject as object, bootstrapOwner, bootstrapTime, ownerBootstrapFiles, projectOwnerBootstrap } from "../live-runtime/repository-bootstrap-contract.ts";

type Options = { config?: ConsoleOosOperatorConfiguration; fetchImpl?: typeof fetch; now?: () => Date };
const base = "/v1/repository-owner-bootstrap", requestPath = (id: string) => `${base}/requests/${encodeURIComponent(bootstrapId(id))}`;
export class RepositoryBootstrapOosError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, status = 502) { super(code === "record_authority_unavailable"
    ? "Platform canonical records are unavailable or stale. Restore the approved record refresh, then retry this exact setup; no source access is granted."
    : "The owner has not confirmed this repository setup. Refresh its original retained request; no fallback source or credential is substituted."); this.code = code; this.status = status; }
}
export const bootstrapCanonicalDigest = (value: unknown): string => `sha256:${createHash("sha256").update(canonical(value)).digest("hex")}`;
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function preparationInput(value: unknown, config: ConsoleOosOperatorConfiguration) {
  const intent = closed(value, ["ownerRepo", "custodyRequestId", "evidenceProfile", "applicationMarkers", "withCi", "nonce"]);
  const owner = bootstrapOwner(intent.ownerRepo); bootstrapId(intent.custodyRequestId); bootstrapId(intent.nonce);
  if (typeof intent.withCi !== "boolean" || !Array.isArray(intent.applicationMarkers) || !intent.applicationMarkers.length || intent.applicationMarkers.length > 48 || JSON.stringify(intent).length > 60_000) throw new Error("Select bounded actual project validation and source markers.");
  const profile = object(intent.evidenceProfile);
  if (profile.owner_repo !== owner) throw new Error("The selected evidence profile belongs to another owner.");
  return { owner_repo: owner, custody_request_id: intent.custodyRequestId, evidence_profile: profile, application_markers: intent.applicationMarkers,
    with_ci: intent.withCi, decision_ref: `console-bootstrap:${bootstrapCanonicalDigest({ operator: config.operatorId, intent }).slice(7, 55)}` };
}
function knownFields(value: unknown, fields: string[]) {
  const item = object(value);
  if (Object.keys(item).some(key => !fields.includes(key))) throw new Error("Owner evidence contains unauthorized fields.");
  return item;
}
export async function prepareRepositoryBootstrap(value: unknown, options: Options = {}) {
  const config = options.config ?? resolveConsoleOosOperatorConfiguration(), input = preparationInput(value, config);
  const result = object(await request(`${base}/preparations`, input, { ...options, config }));
  knownFields(result, ["schema_version", "workflow_id", "caller_id", "operator_id", "decision_ref", "custody_request_id", "custody_receipt_digest", "owner_authority", "plan", "existing_owner_controls", "next_action", "authorization", "credential_issued", "checkout_created", "canonical_mutation", "runtime_activation", "preparation_digest"]);
  const { preparation_digest: claimed, ...body } = result;
  if (result.schema_version !== 1 || result.workflow_id !== "repository-owner-bootstrap-preparation" || result.caller_id !== config.callerId || result.operator_id !== config.operatorId ||
      result.custody_request_id !== input.custody_request_id || result.decision_ref !== input.decision_ref || result.authorization !== "preparation-only" ||
      ["credential_issued", "checkout_created", "canonical_mutation", "runtime_activation"].some(key => result[key] !== false) || bootstrapCanonicalDigest(body) !== bootstrapDigest(claimed)) throw new Error("Owner preparation does not bind its exact server-derived intent.");
  const authority = object(result.owner_authority);
  knownFields(authority, ["owner_repo", "intake_entry_ref", "provider_repository", "classification", "inventory_posture", "custody_receipt_digest", "source_bootstrap_eligible", "ordinary_source_eligible", "model_writes_allowed", "canonical_mutation", "runtime_activation"]);
  if (authority.intake_entry_ref) knownFields(authority.intake_entry_ref, ["id", "version", "digest"]);
  if (authority.provider_repository) knownFields(authority.provider_repository, ["provider", "provider_repository_id", "full_name"]);
  if (authority.owner_repo !== input.owner_repo || !["proposed", "admitted"].includes(String(authority.classification)) || authority.inventory_posture !== null || authority.source_bootstrap_eligible !== true ||
      ["ordinary_source_eligible", "model_writes_allowed", "canonical_mutation", "runtime_activation"].some(key => authority[key] !== false)) throw new Error("Owner setup requires current source-only proposed or admitted authority before Inventory.");
  if (result.plan !== null) {
    const plan = object(result.plan), { plan_digest: claimedPlan, ...planBody } = plan;
    knownFields(plan, ["schema_version", "workflow_id", "owner_repo", "provider_repository", "intake_entry_ref", "fetched_base", "template", "evidence_profile_digest", "application_markers", "ci_selected", "requires_workflow_permission", "source_change_required", "files", "model_invoked", "app_import", "canonical_mutation", "runtime_activation", "plan_digest"]);
    if (plan.provider_repository) knownFields(plan.provider_repository, ["provider", "provider_repository_id", "full_name"]);
    if (plan.intake_entry_ref) knownFields(plan.intake_entry_ref, ["id", "version", "digest"]);
    if (plan.template) knownFields(plan.template, ["id", "owner_repo", "digest"]);
    if (plan.owner_repo !== input.owner_repo || plan.ci_selected !== input.with_ci || bootstrapCanonicalDigest(planBody) !== bootstrapDigest(claimedPlan) ||
        ["model_invoked", "app_import", "canonical_mutation", "runtime_activation"].some(key => plan[key] !== false) || !Array.isArray(plan.files) || plan.files.length < ownerBootstrapFiles.length - 1 || plan.files.length > ownerBootstrapFiles.length) throw new Error("Trusted owner plan scope is invalid.");
    const paths = new Set<string>();
    for (const value of plan.files) {
      const file = closed(value, ["path", "action", "mode", "content", "expected_digest", "content_digest"]);
      if (typeof file.path !== "string" || !ownerBootstrapFiles.includes(file.path) || paths.has(file.path) || file.mode !== "100644" || !["create", "replace", "unchanged"].includes(String(file.action)) ||
          (file.action === "replace" && (file.path !== "AGENTS.md" || !bootstrapDigest(file.expected_digest))) ||
          typeof file.content !== "string" || Buffer.byteLength(file.content) > 65_536 || `sha256:${createHash("sha256").update(file.content).digest("hex")}` !== bootstrapDigest(file.content_digest)) throw new Error("Owner plan escapes trusted finite regular files.");
      paths.add(file.path);
    }
    const expected = ownerBootstrapFiles.filter(path => input.with_ci || path !== ".github/workflows/validate.yaml").sort();
    if ([...paths].sort().join("\0") !== expected.join("\0")) throw new Error("Inspect the complete finite owner-control plan.");
  } else {
    const existing = knownFields(result.existing_owner_controls, ["status", "owner_repo", "fetched_base", "evidence_profile", "evidence_profile_digest", "source_change_required", "ci_present", "app_acceptance", "inventory_admission", "runtime_activation"]);
    if (existing.owner_repo !== input.owner_repo) throw new Error("Existing owner controls do not match this repository.");
    const profile = closed(existing.evidence_profile, ["schema_version", "profile_id", "owner_repo", "commands"]);
    if (!Array.isArray(profile.commands) || profile.commands.length > 32) throw new Error("Existing owner profile is malformed.");
    for (const check of profile.commands) knownFields(check, ["id", "kind", "name", "executable", "args", "fidelity", "conformance_binding", "timeout_seconds", "conformance_case_ids"]);
  }
  return result;
}
export async function listRepositoryBootstraps(owner: string, options: Options = {}) {
  bootstrapOwner(owner);
  const value = closed(await request(`${base}/requests?owner_repo=${encodeURIComponent(owner)}`, undefined, options, `oos://repository-owner-bootstrap/${owner}`), ["schema_version", "workflow_id", "owner_repo", "pending_request", "records"]);
  if (value.schema_version !== 1 || value.workflow_id !== "repository-owner-bootstrap-list" || value.owner_repo !== owner || !Array.isArray(value.records) || value.records.length > 100) throw new Error("Retained owner setup list is invalid.");
  const project = (item: unknown) => { const record = projectOwnerBootstrap(item); if (record.ownerRepo !== owner) throw new Error("Owner setup list includes another repository."); return record; };
  return { records: value.records.map(project), pendingRequest: value.pending_request === null ? null : project(value.pending_request) };
}
export async function readRepositoryBootstrap(id: string, options: Options = {}) {
  const raw = object(await request(requestPath(id), undefined, options, `oos://repository-owner-bootstrap/requests/${id}`));
  const result = projectOwnerBootstrap(raw);
  if (result.requestId !== id) throw new Error("Owner setup returned another request.");
  for (const value of [...Object.values(object(raw.source_delivery)), ...(raw.existing_checkout ? [raw.existing_checkout] : []), ...(raw.cancellation ? [raw.cancellation] : [])]) {
    const control = object(value);
    if (bootstrapCanonicalDigest(control.command) !== bootstrapDigest(control.command_digest)) throw new Error("Retained source command digest changed.");
  }
  return result;
}
export async function createRepositoryBootstrap(value: unknown, options: Options = {}) {
  const intent = closed(value, ["preparationIntent", "expectedPreparationDigest", "requestId", "workflowApproved", "requestedAt"]);
  bootstrapId(intent.requestId); bootstrapTime(intent.requestedAt);
  const config = options.config ?? resolveConsoleOosOperatorConfiguration(), preparation = await prepareRepositoryBootstrap(intent.preparationIntent, { ...options, config });
  if (preparation.preparation_digest !== bootstrapDigest(intent.expectedPreparationDigest) || typeof intent.workflowApproved !== "boolean") throw new Error("Owner preparation changed after review.");
  const plan = preparation.plan === null ? null : object(preparation.plan), workflowNeeded = plan?.requires_workflow_permission === true;
  if (workflowNeeded !== intent.workflowApproved) throw new Error("Confirm workflow writing separately only when the exact plan creates CI.");
  const body = { schema_version: 1, request_id: intent.requestId, preparation_input: preparationInput(intent.preparationIntent, config), expected_preparation_digest: preparation.preparation_digest,
    workflow_approval_ref: workflowNeeded ? `console-workflow:${bootstrapCanonicalDigest({ operator: config.operatorId, request: intent }).slice(7, 55)}` : null, requested_at: intent.requestedAt };
  const returned = object(await request(`${base}/requests`, body, { ...options, config }));
  if (bootstrapCanonicalDigest(returned.request) !== bootstrapCanonicalDigest(body)) throw new Error("Owner setup did not retain the exact reviewed request.");
  return readRepositoryBootstrap(String(intent.requestId), { ...options, config });
}
export async function readRepositoryBootstrapDraft(id: string, options: Options = {}) {
  const current = await readRepositoryBootstrap(id, options), raw = closed(await request(`${requestPath(id)}/draft`, undefined, options, `oos://repository-owner-bootstrap/requests/${id}/draft`), ["schema_version", "workflow_id", "request_id", "revision", "digest", "change_set"]);
  const change = object(raw.change_set);
  if (raw.schema_version !== 1 || raw.workflow_id !== "repository-owner-bootstrap-draft" || raw.request_id !== id || raw.revision !== current.sourceRevision || raw.digest !== current.draft?.digest || bootstrapCanonicalDigest(change) !== raw.digest || change.session_id !== current.sessionId || !Array.isArray(change.operations) || change.operations.length > ownerBootstrapFiles.length) throw new Error("Owner draft does not bind the actual current request and digest.");
  for (const value of change.operations) { const file = closed(value, ["action", "path", "content", "expected_digest"]);
    if (!["create", "replace"].includes(String(file.action)) || (file.action === "create" ? file.expected_digest !== null : file.path !== "AGENTS.md" || !bootstrapDigest(file.expected_digest)) || typeof file.path !== "string" || !ownerBootstrapFiles.includes(file.path) || typeof file.content !== "string" || Buffer.byteLength(file.content) > 65_536) throw new Error("Owner draft escapes trusted control scope."); }
  return raw;
}
export async function commandRepositoryBootstrap(id: string, value: unknown, options: Options = {}) {
  const intent = closed(value, ["action", "expectedRevision", "commandId", "requestedAt", "sourceIntentRef", "acceptedDigest", "reason"]);
  const actions = ["session", "existing-checkout", "cancel-unapplied", "accept", "recover", "publish", "review", "merge", "close"];
  if (!actions.includes(String(intent.action))) throw new Error("Select one bounded owner setup action.");
  bootstrapId(intent.commandId); bootstrapTime(intent.requestedAt); bootstrapTime(intent.expectedRevision);
  const current = await readRepositoryBootstrap(id, options), action = String(intent.action);
  if (["succeeded", "cancelled"].includes(current.state)) return current;
  const original = action === "existing-checkout" ? current.existingCheckout : action === "cancel-unapplied" ? current.cancellation : current.sourceDelivery[action];
  if (original?.state === "succeeded") return current;
  const revision = ["existing-checkout", "cancel-unapplied", "session"].includes(action) ? current.revision : current.sourceRevision;
  if (!original && intent.expectedRevision !== revision) throw new Error("Owner setup changed after review; refresh the original request.");
  const command = { schema_version: 1, command_id: `console-owner:${bootstrapCanonicalDigest({ request: id, nonce: intent.commandId }).slice(7, 55)}`, expected_revision: revision, requested_at: intent.requestedAt };
  const source = () => { const ref = bootstrapId(intent.sourceIntentRef); if (!ref.startsWith("source-intent:")) throw new Error("Explicit exact source approval required."); return ref; };
  let body: unknown;
  if (action === "session") body = { schema_version: 1, command_id: command.command_id, requested_at: command.requested_at, source_intent_ref: source() };
  else if (action === "existing-checkout") body = original?.command ?? command;
  else if (action === "cancel-unapplied") {
    if (!original && (typeof intent.reason !== "string" || intent.reason.trim().length < 20 || intent.reason.length > 4096)) throw new Error("Provide an explicit bounded cancellation reason.");
    body = original?.command ?? { ...command, reason: intent.reason };
  } else if (action === "accept") {
    const draft = await readRepositoryBootstrapDraft(id, options);
    if (draft.digest !== bootstrapDigest(intent.acceptedDigest) || draft.revision !== intent.expectedRevision) throw new Error("Inspect the exact current trusted draft before acceptance.");
    body = { command: { ...command, accepted_change_set_digest: draft.digest }, source_intent_ref: source() };
  } else if (action === "recover") body = { command, source_intent_ref: source() };
  else {
    const pr = current.sourceDelivery.publish?.pullRequest;
    if (action !== "publish" && !pr) throw new Error("The exact retained owner PR is required before review or merge.");
    body = { command: original?.command ?? { ...command, expected_pull_request: action === "publish" ? null : pr }, ...(action === "publish" ? { source_intent_ref: source() } : {}) };
  }
  await request(`${requestPath(id)}/${action}`, body, options);
  return readRepositoryBootstrap(id, options);
}
async function knownOwnerFailure(response: Response): Promise<string | null> {
  const reader = response.body?.getReader(); if (!reader) return null;
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) { const { done, value } = await reader.read(); if (done) break; length += value.length;
      if (length > 4096) { await reader.cancel(); return null; } chunks.push(value); }
    const payload: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    return payload && typeof payload === "object" && !Array.isArray(payload) &&
      (payload as { error?: unknown }).error === "record_authority_unavailable" ? "record_authority_unavailable" : null;
  } catch { return null; }
  finally { reader.releaseLock(); }
}
async function request(path: string, body: unknown, options: Options, recordRef?: string) {
  const config = options.config ?? resolveConsoleOosOperatorConfiguration();
  let response: Response;
  try { response = await (options.fetchImpl ?? fetch)(`${config.baseUrl}${path}`, {
    method: body === undefined ? "GET" : "POST", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(body === undefined ? 12000 : 120000),
    headers: { ...(recordRef ? consoleSourceProjectionHeaders() : { Accept: "application/json" }), ...consoleMutationAttributionHeaders(), "Content-Type": "application/json",
      "x-oos-caller-id": config.callerId, "x-oos-caller-secret": config.callerSecret, "x-oos-operator-id": config.operatorId },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }); } catch { throw new RepositoryBootstrapOosError("repository_bootstrap_owner_unavailable"); }
  if (!response.ok) throw new RepositoryBootstrapOosError(await knownOwnerFailure(response) ?? "repository_bootstrap_owner_rejected", response.status);
  const reader = response.body?.getReader(); if (!reader) throw new RepositoryBootstrapOosError("repository_bootstrap_response_empty");
  const chunks: Uint8Array[] = []; let length = 0;
  try { while (true) { const { done, value } = await reader.read(); if (done) break; length += value.length;
    if (length > 1_048_576) { await reader.cancel(); throw new RepositoryBootstrapOosError("repository_bootstrap_response_large"); } chunks.push(value); } }
  finally { reader.releaseLock(); }
  const payload: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  return recordRef ? acceptCurrentConsoleSourceProjection(payload, { authority: "operator-orchestration-service", sourceOwner: "operator-orchestration-service", recordRef }) : payload;
}
