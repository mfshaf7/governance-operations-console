import { createHash } from "node:crypto";
import { assertRepositoryRegistrationLookup, repositoryStatusNames } from "../workspace-repository-status.ts";

import {
  consoleOosModeSelected,
  ConsoleRuntimeConfigurationError,
  resolveConsoleOosConnection,
  type ConsoleOosConnection,
} from "../../console-integration/configuration/console-runtime-configuration.ts";
import { consoleMutationAttributionHeaders } from "../../console-integration/identity/server/console-session-authorization.ts";
import {
  acceptCurrentConsoleSourceProjection,
  consoleSourceProjectionHeaders,
  ConsoleSourceAuthorityError,
  type ConsoleSourceAuthorityExpectation,
} from "../../console-integration/source-authority/console-source-authority.ts";

import {
  assertWorkspaceInventoryLifecyclePreparation,
  assertWorkspaceInventoryLifecycleRequestId,
  assertWorkspaceInventoryLifecycleResult,
  assertWorkspaceInventoryLifecycleSubmissionIntent,
  assertWorkspaceInventoryPreparation,
  assertWorkspaceInventoryRequestId,
  assertWorkspaceInventoryResult,
  assertWorkspaceInventorySubmissionIntent,
  assertWorkspaceRegistrySnapshot,
  sameWorkspaceInventoryLifecyclePreparation,
  sameWorkspaceInventoryPreparation,
  sameWorkspaceRegistrySnapshot,
  WorkspaceRegistryContractError,
} from "../workspace-registry-contract.ts";
import type {
  WorkspaceInventoryLifecyclePreparation,
  WorkspaceInventoryLifecycleSubmissionIntent,
  WorkspaceInventoryPreparation,
  WorkspaceInventorySubmissionIntent,
  WorkspaceRegistrySnapshot,
  WorkspaceRegistryLegacySnapshot,
  InstanceRegistrySelection,
  InstanceInventoryRequest,
  WorkspaceRegistryTarget,
} from "../model/workspace-registry-types.ts";
import { assertWorkspaceRegistryRecord, assertWorkspaceRegistryCandidate } from "../workspace-registry-contract.ts";
import { assertInstanceRegistryPage } from "../workspace-registry-instance-contract.ts";
import { inventoryPreparationPosture } from "../model/workspace-registry-lifecycle-state.ts";
import { buildInstanceInventoryCommand, sameInstanceInventoryInput, verifyInstanceInventoryResult, verifyInstanceInventoryPreparation } from "./workspace-registry-instance-proof.ts";

import { assertInventoryRequestJournal, inventoryJournalEndpoint,
  type InventoryRequestFamily } from "../workspace-registry-request-journal.ts";

const maxResponseBytes = 2_097_152;
const readTimeoutMs = 12_000;
const commandTimeoutMs = 120_000;

type WorkspaceRegistryOosConfig = ConsoleOosConnection;

type RequestOptions = Readonly<{
  config?: WorkspaceRegistryOosConfig;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  selection?: Partial<InstanceRegistrySelection> & Readonly<{ after?: string | null }>;
}>;

export class WorkspaceRegistryOosError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly status: number;

  constructor(message: string, code: string, status: number, retryable = false) {
    super(message);
    this.code = code;
    this.retryable = retryable;
    this.status = status;
  }
}

export function workspaceRegistryOosConfigured(env = process.env) {
  return consoleOosModeSelected(env);
}

export async function readWorkspaceInventoryRequestJournal(
  family: InventoryRequestFamily, target: WorkspaceRegistryTarget, cursor?: string,
  options: RequestOptions = {},
) {
  const suffix = inventoryJournalEndpoint(family, target, cursor);
  const body = await request(`/v1/workspace-inventory/${suffix}`, { method: "GET" }, options, {
    authority: "operator-orchestration-service", sourceOwner: "operator-orchestration-service",
    recordRef: `oos://workspace-inventory/${suffix}`,
  });
  return assertInventoryRequestJournal(body, family, target);
}

async function requireNoOriginalPending(family: InventoryRequestFamily, target: WorkspaceRegistryTarget, options: RequestOptions) {
  const journal = await readWorkspaceInventoryRequestJournal(family, target, undefined, options);
  if (journal.pending_request_count > 0) throw new WorkspaceRegistryOosError(
    "An original request is still pending for this target. Reopen it before starting another review.",
    "workspace_inventory_original_pending", 409,
  );
}

export async function readRepositoryRegistrationStatus(names: string[], options: RequestOptions = {}) {
  repositoryStatusNames(names);
  const query = new URLSearchParams(names.map(name => ["name", name]));
  const body = await request(`/v1/workspace-inventory/repository-status?${query}`, { method: "GET" }, options, {
    authority: "operator-orchestration-service", sourceOwner: "operator-orchestration-service", recordRef: `oos://workspace-inventory/repository-status?${query}`,
  });
  try {
    const checked = assertRepositoryRegistrationLookup(body, names);
    if (checked.mode === "current") {
      const { projection_digest, ...content } = body as Record<string, unknown>;
      if (canonicalDigest(content) !== projection_digest) throw contractError("Repository registration status content changed.");
    }
  } catch (error) { throw projectionError(error); }
  return body;
}

export async function readWorkspaceRegistry(
  options: RequestOptions = {},
): Promise<WorkspaceRegistrySnapshot> {
  const query = new URLSearchParams({ scope: options.selection?.scope ?? "inventory", query: options.selection?.query ?? "" });
  if (options.selection?.after) query.set("after", options.selection.after);
  const [legacy, body] = await Promise.all([
    readLegacyWorkspaceRegistry(options),
    request(`/v1/workspace-inventory/instance-records?${query}`, { method: "GET" }, options, {
      authority: "operator-orchestration-service", sourceOwner: "operator-orchestration-service",
      recordRef: `oos://workspace-inventory/instance-records?${query}`,
    }),
  ]);
  if (isRecord(body) && body.schema_version === 1 && body.mode === "not-configured" &&
      Object.keys(body).sort().join(",") === "mode,projected_at,schema_version" && typeof body.projected_at === "string" && !Number.isNaN(Date.parse(body.projected_at))) return legacy;
  try {
    const page = assertInstanceRegistryPage(body, { record: assertWorkspaceRegistryRecord, candidate: assertWorkspaceRegistryCandidate }, contractError);
    const { projection_digest, ...content } = page;
    if (canonicalDigest(content) !== projection_digest || page.selection.scope !== query.get("scope") || page.selection.query !== query.get("query")?.trim().toLowerCase() || page.after !== (options.selection?.after ?? null)) throw contractError("Internal Registry page changed its exact selection or content binding.");
    for (const candidate of page.eligible_promotions) {
      const { candidate_digest, ...value } = candidate;
      if (canonicalDigest(value) !== candidate_digest) throw contractError("Internal Registry candidate digest does not match its content.");
    }
    const view = { schema_version: 1, workflow_id: "workspace-registry-view", canonical_mutation: false,
      authority_revision: legacy.authority_revision, source_authorities: { legacy: legacy.canonical_authority, instance: page.authority },
      legacy_snapshot: legacy, instance_page: page, records: [...legacy.records, ...page.records],
      eligible_promotions: [...legacy.eligible_promotions, ...page.eligible_promotions], projected_at: (options.now?.() ?? new Date()).toISOString(),
      projection_id: `workspace-registry-view:${canonicalDigest([legacy.projection_digest, page.projection_digest])}` };
    return projectSnapshot(bindDigest(view, "projection_digest"));
  } catch (error) { throw projectionError(error); }
}

// Product and component decisions still belong to the retained Git contracts.
// Their callers must not depend on a private source-project listing page.
export async function readLegacyWorkspaceRegistry(options: RequestOptions = {}): Promise<WorkspaceRegistryLegacySnapshot> {
  const snapshot = projectSnapshot(
    await request(
      "/v1/workspace-inventory/registry",
      { method: "GET" },
      options,
      {
        authority: "operator-orchestration-service",
        recordRef: "repo://workspace-governance/contracts/inventory",
        sourceOwner: "workspace-governance",
      },
    ),
  );
  if (snapshot.workflow_id !== "workspace-inventory-registry") throw projectionError(new Error("The retained Git Registry changed authority."));
  return snapshot;
}

export async function prepareWorkspaceInventoryPromotion(
  target: WorkspaceRegistryTarget,
  options: RequestOptions = {},
): Promise<WorkspaceInventoryPreparation> {
  return projectPreparation(
    await request(
      "/v1/workspace-inventory/preparations",
      { body: JSON.stringify({ target: { kind: target.kind, name: target.name } }), method: "POST" },
      options,
    ),
  );
}

export async function prepareWorkspaceInventoryLifecycle(
  target: WorkspaceRegistryTarget,
  options: RequestOptions = {},
): Promise<WorkspaceInventoryLifecyclePreparation> {
  const body = await request(
      "/v1/workspace-inventory/lifecycle/preparations",
      {
        body: JSON.stringify({ target: { kind: target.kind, name: target.name } }),
        method: "POST",
      },
      options,
    );
  try {
    const preparation = assertWorkspaceInventoryLifecyclePreparation(body);
    verifyInstanceInventoryPreparation(body, canonicalDigest);
    return preparation;
  } catch (error) { throw projectionError(error); }
}

export async function submitWorkspaceInventoryLifecycle(
  value: unknown,
  options: RequestOptions = {},
) {
  const intent = assertWorkspaceInventoryLifecycleSubmissionIntent(value);
  if (intent.reviewed_preparation.authority_kind === "internal-instance-record") {
    const preparation = intent.reviewed_preparation;
    const config = options.config ?? resolveConfig();
    const command = buildInstanceInventoryCommand({ preparation, requestId: intent.request_id, action: intent.action,
      requestedValue: intent.requested_value, approvalRefs: intent.approval_refs, impactAcknowledgements: intent.impact_acknowledgements,
      reason: intent.reason, callerId: config.callerId, now: options.now?.() ?? new Date() }, canonicalDigest);
    return submitNativeInventory("lifecycle", command, async () => {
      const fresh = await prepareWorkspaceInventoryLifecycle(preparation.target, options);
      if (!sameWorkspaceInventoryLifecyclePreparation(preparation, fresh)) throw new WorkspaceRegistryOosError("Inventory changed after review. Refresh before applying the action.", "workspace_inventory_lifecycle_preparation_stale", 409);
    }, { ...options, config });
  }
  await requireNoOriginalPending("lifecycle", intent.reviewed_preparation.target, options);
  const currentSnapshot = await readLegacyWorkspaceRegistry(options);
  const currentRecord = currentSnapshot.records.find(
    (record) => record.id === intent.reviewed_preparation.target.record_id,
  );
  if (
    !currentRecord ||
    !sameWorkspaceRegistrySnapshot(
      currentSnapshot,
      reviewedLifecycleSnapshot(intent, currentSnapshot),
    ) ||
    currentRecord.version !== intent.reviewed_preparation.expected_state.record_version ||
    currentRecord.record_digest !== intent.reviewed_preparation.expected_state.record_digest ||
    currentRecord.posture !== inventoryPreparationPosture(intent.reviewed_preparation)
  ) {
    throw new WorkspaceRegistryOosError(
      "Workspace Registry authority changed after lifecycle review. Refresh before applying the action.",
      "workspace_inventory_lifecycle_review_stale",
      409,
    );
  }
  const currentPreparation = await prepareWorkspaceInventoryLifecycle(
    intent.reviewed_preparation.target,
    options,
  );
  if (currentPreparation.authority_kind !== undefined) throw new WorkspaceRegistryOosError("Inventory storage authority changed after review.", "workspace_inventory_lifecycle_preparation_stale", 409);
  if (
    !sameWorkspaceInventoryLifecyclePreparation(
      intent.reviewed_preparation,
      currentPreparation,
    )
  ) {
    throw new WorkspaceRegistryOosError(
      "Workspace Inventory lifecycle preparation changed after review. Refresh before applying the action.",
      "workspace_inventory_lifecycle_preparation_stale",
      409,
    );
  }
  const config = options.config ?? resolveConfig();
  const command = buildLifecycleCommand(
    intent,
    currentPreparation,
    config.callerId,
    options.now?.() ?? new Date(),
  );
  const response = await request(
    "/v1/workspace-inventory/lifecycle/requests",
    { body: JSON.stringify(command), method: "POST" },
    { ...options, config },
  );
  assertReturnedBinding(response, command);
  return projectLifecycleResult(response, intent.request_id);
}

export async function readWorkspaceInventoryLifecycle(
  requestId: string,
  options: RequestOptions = {},
) {
  const id = assertWorkspaceInventoryLifecycleRequestId(requestId);
  return projectLifecycleResult(
    await request(
      `/v1/workspace-inventory/lifecycle/requests/${encodeURIComponent(id)}`,
      { method: "GET" },
      options,
      {
        authority: "operator-orchestration-service",
        recordRef: `oos://workspace-inventory/lifecycle/requests/${id}`,
        sourceOwner: "workspace-governance",
      },
    ),
    id,
  );
}

export async function continueWorkspaceInventoryLifecycle(
  requestId: string,
  options: RequestOptions = {},
) {
  return commandWorkspaceInventoryLifecycle(requestId, "continue", options);
}

export async function cancelWorkspaceInventoryLifecycle(
  requestId: string,
  options: RequestOptions = {},
) {
  return commandWorkspaceInventoryLifecycle(requestId, "cancel", options);
}

export async function submitWorkspaceInventoryPromotion(
  value: unknown,
  options: RequestOptions = {},
) {
  const intent = assertWorkspaceInventorySubmissionIntent(value);
  if (intent.reviewed_preparation.authority_kind === "internal-instance-record") {
    const preparation = intent.reviewed_preparation, config = options.config ?? resolveConfig();
    if (canonicalDigest(preparation.candidate) !== canonicalDigest(intent.candidate)) throw contractError("Promotion input differs from the reviewed original candidate.");
    const command = buildInstanceInventoryCommand({ preparation, requestId: intent.request_id, action: "promote",
      requestedValue: intent.candidate.active_record.value, approvalRefs: intent.candidate.approval_refs,
      impactAcknowledgements: [], reason: null, callerId: config.callerId, now: options.now?.() ?? new Date() }, canonicalDigest);
    return submitNativeInventory("promotion", command, async () => {
      const fresh = await prepareWorkspaceInventoryPromotion(preparation.target, options);
      if (!sameWorkspaceInventoryPreparation(preparation, fresh)) throw new WorkspaceRegistryOosError("Inventory changed after review. Refresh before promotion.", "workspace_inventory_preparation_stale", 409);
    }, { ...options, config });
  }
  await requireNoOriginalPending("promotion", intent.candidate.target, options);
  const currentSnapshot = await readLegacyWorkspaceRegistry(options);
  const currentCandidate = currentSnapshot.eligible_promotions.find(
    (candidate) => candidate.target.record_id === intent.candidate.target.record_id,
  );
  if (
    !currentCandidate ||
    !sameWorkspaceRegistrySnapshot(
      currentSnapshot,
      reviewedSnapshot(intent, currentSnapshot),
    ) ||
    currentCandidate.candidate_digest !== intent.candidate.candidate_digest
  ) {
    throw new WorkspaceRegistryOosError(
      "Workspace Registry authority changed after review. Refresh before promotion.",
      "workspace_registry_review_stale",
      409,
    );
  }
  const currentPreparation = await prepareWorkspaceInventoryPromotion(
    currentCandidate.target,
    options,
  );
  if (!sameWorkspaceInventoryPreparation(intent.reviewed_preparation, currentPreparation)) {
    throw new WorkspaceRegistryOosError(
      "Workspace Inventory preparation changed after review. Refresh before promotion.",
      "workspace_inventory_preparation_stale",
      409,
    );
  }
  const config = options.config ?? resolveConfig();
  const command = buildCommand(
    intent,
    currentCandidate,
    currentPreparation,
    config.callerId,
    options.now?.() ?? new Date(),
  );
  const response = await request(
    "/v1/workspace-inventory/promotions",
    { body: JSON.stringify(command), method: "POST" },
    { ...options, config },
  );
  assertReturnedBinding(response, command);
  return projectResult(response, intent.request_id);
}

export async function readWorkspaceInventoryPromotion(
  requestId: string,
  options: RequestOptions = {},
) {
  const id = assertWorkspaceInventoryRequestId(requestId);
  return projectResult(
    await request(
      `/v1/workspace-inventory/promotions/${encodeURIComponent(id)}`,
      { method: "GET" },
      options,
      {
        authority: "operator-orchestration-service",
        recordRef: `oos://workspace-inventory/promotions/${id}`,
        sourceOwner: "workspace-governance",
      },
    ),
    id,
  );
}

export async function continueWorkspaceInventoryPromotion(
  requestId: string,
  options: RequestOptions = {},
) {
  return commandWorkspaceInventoryPromotion(requestId, "continue", options);
}

export async function cancelWorkspaceInventoryPromotion(
  requestId: string,
  options: RequestOptions = {},
) {
  return commandWorkspaceInventoryPromotion(requestId, "cancel", options);
}

async function commandWorkspaceInventoryPromotion(
  requestId: string,
  action: "cancel" | "continue",
  options: RequestOptions,
) {
  const id = assertWorkspaceInventoryRequestId(requestId);
  return projectResult(
    await request(
      `/v1/workspace-inventory/promotions/${encodeURIComponent(id)}/${action}`,
      { body: "{}", method: "POST" },
      options,
    ),
    id,
  );
}

async function commandWorkspaceInventoryLifecycle(
  requestId: string,
  action: "cancel" | "continue",
  options: RequestOptions,
) {
  const id = assertWorkspaceInventoryLifecycleRequestId(requestId);
  return projectLifecycleResult(
    await request(
      `/v1/workspace-inventory/lifecycle/requests/${encodeURIComponent(id)}/${action}`,
      { body: "{}", method: "POST" },
      options,
    ),
    id,
  );
}

function buildCommand(
  intent: WorkspaceInventorySubmissionIntent,
  candidate: WorkspaceRegistrySnapshot["eligible_promotions"][number],
  preparation: WorkspaceInventoryPreparation,
  callerId: string,
  now: Date,
) {
  const request = bindDigest(
    {
      active_record: candidate.active_record,
      approval_refs: candidate.approval_refs,
      artifact_type: "workspace-inventory-promotion-request",
      correlation_ref: `console:workspace-registry:${candidate.target.record_id}`,
      expected_state: preparation.expected_state,
      idempotency_key: `${intent.request_id}:v1`,
      intake_entry_ref: preparation.intake_entry_ref,
      operator_ref: callerId,
      request_id: intent.request_id,
      requested_at: now.toISOString(),
      schema_version: 1,
      target: candidate.target,
    },
    "request_digest",
  );
  return {
    authority_revision: preparation.authority_revision,
    execution_ref: `console://workspace-registry/executions/${encodeURIComponent(intent.request_id)}`,
    request,
    session_ref: `console://workspace-registry/sessions/${encodeURIComponent(intent.request_id)}`,
  };
}

function buildLifecycleCommand(
  intent: WorkspaceInventoryLifecycleSubmissionIntent,
  preparation: WorkspaceInventoryLifecyclePreparation,
  callerId: string,
  now: Date,
) {
  const request = bindDigest(
    {
      action: intent.action,
      approval_refs: intent.approval_refs,
      artifact_type: "workspace-inventory-lifecycle-request",
      correlation_ref: `console:workspace-registry:${preparation.target.record_id}`,
      expected_state: preparation.expected_state,
      idempotency_key: `${intent.request_id}:v1`,
      impact_acknowledgements: intent.impact_acknowledgements,
      operator_ref: callerId,
      prior_event_ref:
        intent.action === "restore" && preparation.authority_kind !== "internal-instance-record" ? preparation.latest_event_ref : null,
      reason: intent.reason,
      request_id: intent.request_id,
      requested_at: now.toISOString(),
      requested_value: intent.action === "update" ? intent.requested_value : null,
      schema_version: 1,
      target: preparation.target,
    },
    "request_digest",
  );
  return {
    authority_revision: preparation.authority_revision,
    execution_ref: `console://workspace-registry/lifecycle/executions/${encodeURIComponent(intent.request_id)}`,
    request,
    session_ref: `console://workspace-registry/lifecycle/sessions/${encodeURIComponent(intent.request_id)}`,
  };
}

function assertReturnedBinding(
  value: unknown,
  command: Readonly<{
    request: Readonly<{ request_digest: string; request_id: string }>;
  }>,
) {
  if (
    !isRecord(value) ||
    !isRecord(value.request) ||
    value.request.request_id !== command.request.request_id ||
    value.request.request_digest !== command.request.request_digest
  ) {
    throw projectionError(
      new Error("OOS returned a different Workspace Inventory command binding."),
    );
  }
}

function reviewedSnapshot(
  intent: WorkspaceInventorySubmissionIntent,
  current: WorkspaceRegistrySnapshot,
): WorkspaceRegistrySnapshot {
  return {
    ...current,
    authority_revision: intent.reviewed_projection.authority_revision,
    projection_digest: intent.reviewed_projection.projection_digest,
  };
}

function reviewedLifecycleSnapshot(
  intent: WorkspaceInventoryLifecycleSubmissionIntent,
  current: WorkspaceRegistrySnapshot,
): WorkspaceRegistrySnapshot {
  return {
    ...current,
    authority_revision: intent.reviewed_projection.authority_revision,
    projection_digest: intent.reviewed_projection.projection_digest,
  };
}

function resolveConfig(env = process.env): WorkspaceRegistryOosConfig {
  try {
    return resolveConsoleOosConnection(env);
  } catch (error) {
    const invalidUrl =
      error instanceof ConsoleRuntimeConfigurationError &&
      error.code === "console_oos_url_invalid";
    throw new WorkspaceRegistryOosError(
      invalidUrl
        ? "Workspace Registry OOS endpoint is invalid."
        : "Workspace Registry is unavailable until the approved OOS integration is configured.",
      invalidUrl
        ? "workspace_registry_oos_url_invalid"
        : "workspace_registry_oos_not_configured",
      503,
    );
  }
}

async function request(
  path: string,
  init: RequestInit,
  options: RequestOptions,
  sourceExpectation?: ConsoleSourceAuthorityExpectation,
) {
  const config = options.config ?? resolveConfig();
  let response: Response;
  try {
    response = await (options.fetchImpl ?? fetch)(`${config.baseUrl}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        ...(sourceExpectation
          ? consoleSourceProjectionHeaders(init.headers)
          : Object.fromEntries(new Headers(init.headers).entries())),
        ...consoleMutationAttributionHeaders(),
        ...(!sourceExpectation ? { Accept: "application/json" } : {}),
        "Content-Type": "application/json",
        "x-oos-caller-id": config.callerId,
        "x-oos-caller-secret": config.callerSecret,
      },
      signal: AbortSignal.timeout(init.method === "GET" ? readTimeoutMs : commandTimeoutMs),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new WorkspaceRegistryOosError(
        "Workspace Registry is taking longer than expected. Reopen the original request to check its result before trying again.",
        "workspace_registry_oos_timeout", 504, true,
      );
    }
    throw new WorkspaceRegistryOosError(
      "Workspace Registry could not reach OOS.",
      "workspace_registry_oos_unavailable",
      502,
      true,
    );
  }
  const raw = await response.text();
  if (Buffer.byteLength(raw) > maxResponseBytes) {
    throw new WorkspaceRegistryOosError(
      "Workspace Registry response exceeded the Console limit.",
      "workspace_registry_response_large",
      502,
    );
  }
  let body: unknown = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    throw new WorkspaceRegistryOosError(
      "Workspace Registry returned an invalid response.",
      "workspace_registry_response_invalid",
      502,
    );
  }
  if (!response.ok) {
    const source = isRecord(body) ? body : {};
    throw new WorkspaceRegistryOosError(
      typeof source.message === "string"
        ? source.message
        : typeof source.error === "string"
          ? source.error
          : "OOS rejected the Workspace Registry operation.",
      typeof source.code === "string"
        ? source.code
        : typeof source.error === "string"
          ? source.error
          : "workspace_registry_oos_rejected",
      response.status,
      source.retryable === true,
    );
  }
  if (!sourceExpectation) return body;
  try {
    return acceptCurrentConsoleSourceProjection(body, sourceExpectation);
  } catch (error) {
    if (error instanceof ConsoleSourceAuthorityError) {
      throw new WorkspaceRegistryOosError(error.message, error.code, 502);
    }
    throw error;
  }
}

function bindDigest<T extends Record<string, unknown>, K extends string>(
  value: T,
  field: K,
) {
  return { ...value, [field]: canonicalDigest(value) } as T & Record<K, string>;
}

function canonicalDigest(value: unknown) {
  return `sha256:${createHash("sha256").update(canonicalStringify(value)).digest("hex")}`;
}

function canonicalStringify(value: unknown): string {
  if (value === null || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return JSON.stringify(value);
  }
  if (typeof value === "string") {
    if (!wellFormed(value)) throw contractError("Workspace Registry command contains invalid Unicode.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort(compareUnicodeCodePoints)
      .map((key) => `${JSON.stringify(key)}:${canonicalStringify(value[key])}`)
      .join(",")}}`;
  }
  throw contractError("Workspace Registry command contains unsupported data.");
}

function compareUnicodeCodePoints(left: string, right: string) {
  const a = Array.from(left, (character) => character.codePointAt(0) ?? 0);
  const b = Array.from(right, (character) => character.codePointAt(0) ?? 0);
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return a.length - b.length;
}

function wellFormed(value: string) {
  try {
    encodeURIComponent(value);
    return true;
  } catch {
    return false;
  }
}

function projectSnapshot(value: unknown) {
  try {
    return assertWorkspaceRegistrySnapshot(value);
  } catch (error) {
    throw projectionError(error);
  }
}

function projectPreparation(value: unknown) {
  try {
    const preparation = assertWorkspaceInventoryPreparation(value);
    verifyInstanceInventoryPreparation(value, canonicalDigest);
    return preparation;
  } catch (error) {
    throw projectionError(error);
  }
}

function projectResult(value: unknown, requestId: string) {
  try {
    const result = assertWorkspaceInventoryResult(value, requestId);
    verifyInstanceInventoryResult(value, canonicalDigest);
    return result;
  } catch (error) {
    throw projectionError(error);
  }
}

function projectLifecycleResult(value: unknown, requestId: string) {
  try {
    const result = assertWorkspaceInventoryLifecycleResult(value, requestId);
    verifyInstanceInventoryResult(value, canonicalDigest);
    return result;
  } catch (error) { throw projectionError(error); }
}

async function submitNativeInventory<F extends "promotion" | "lifecycle">(
  family: F, command: Readonly<{ request: InstanceInventoryRequest; session_ref: string; execution_ref: string }>,
  requireFreshPreparation: () => Promise<void>, options: RequestOptions,
) {
  const path = family === "promotion" ? "/v1/workspace-inventory/promotions" : "/v1/workspace-inventory/lifecycle/requests";
  const project = (body: unknown) => family === "promotion" ? projectResult(body, command.request.request_id) : projectLifecycleResult(body, command.request.request_id);
  const original = async () => {
    try {
      const body = await request(`${path}/${encodeURIComponent(command.request.request_id)}`, { method: "GET" }, options, {
        authority: "operator-orchestration-service", sourceOwner: "workspace-governance", recordRef: `oos://${path.slice(4)}/${command.request.request_id}`,
      });
      const result = project(body);
      if (result.authority_kind !== "internal-instance-record" || !sameInstanceInventoryInput(body, command, canonicalDigest)) throw new WorkspaceRegistryOosError("This request belongs to different accepted input. Open its original history.", "workspace_inventory_idempotency_conflict", 409);
      return result;
    } catch (error) {
      if (error instanceof WorkspaceRegistryOosError && error.status === 404 && error.code === (family === "promotion" ? "workspace_inventory_not_found" : "workspace_inventory_lifecycle_not_found")) return null;
      throw error;
    }
  };
  const retained = await original();
  if (retained) return retained;
  await requireNoOriginalPending(family, command.request.target, options);
  await requireFreshPreparation();
  try {
    const response = await request(path, { method: "POST", body: JSON.stringify(command) }, options);
    assertReturnedBinding(response, command);
    return project(response);
  } catch (error) {
    if (!(error instanceof WorkspaceRegistryOosError) || (!error.retryable && error.status < 500 && error.status !== 409)) throw error;
    try { const saved = await original(); if (saved) return saved; }
    catch (readError) {
      if (readError instanceof WorkspaceRegistryOosError && readError.status === 409) throw readError;
      throw new WorkspaceRegistryOosError("Submission is unconfirmed. Reopen the original request when its connection returns.", "workspace_inventory_submission_unconfirmed", 503, true);
    }
    throw error;
  }
}

function projectionError(error: unknown) {
  return new WorkspaceRegistryOosError(
    error instanceof Error
      ? error.message
      : "Workspace Registry returned malformed authority evidence.",
    "workspace_registry_projection_invalid",
    502,
  );
}

function contractError(message: string) {
  return new WorkspaceRegistryContractError(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
