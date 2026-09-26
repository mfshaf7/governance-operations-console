import { createHash } from "node:crypto";

import { consoleMutationAttributionHeaders } from "../../console-integration/identity/server/console-session-authorization.ts";

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
  WorkspaceRegistryTarget,
} from "../model/workspace-registry-types.ts";

const maxResponseBytes = 2_097_152;
const timeoutMs = 12_000;

type WorkspaceRegistryOosConfig = Readonly<{
  baseUrl: string;
  callerId: string;
  callerSecret: string;
}>;

type RequestOptions = Readonly<{
  config?: WorkspaceRegistryOosConfig;
  fetchImpl?: typeof fetch;
  now?: () => Date;
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
  return Boolean(env.OOS_BASE_URL?.trim() && env.OOS_CALLER_SECRET?.trim());
}

export async function readWorkspaceRegistry(
  options: RequestOptions = {},
): Promise<WorkspaceRegistrySnapshot> {
  return projectSnapshot(
    await request("/v1/workspace-inventory/registry", { method: "GET" }, options),
  );
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
  return assertWorkspaceInventoryLifecyclePreparation(
    await request(
      "/v1/workspace-inventory/lifecycle/preparations",
      {
        body: JSON.stringify({ target: { kind: target.kind, name: target.name } }),
        method: "POST",
      },
      options,
    ),
  );
}

export async function submitWorkspaceInventoryLifecycle(
  value: unknown,
  options: RequestOptions = {},
) {
  const intent = assertWorkspaceInventoryLifecycleSubmissionIntent(value);
  const currentSnapshot = await readWorkspaceRegistry(options);
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
    currentRecord.posture !== intent.reviewed_preparation.expected_state.posture
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
  return assertWorkspaceInventoryLifecycleResult(response, intent.request_id);
}

export async function readWorkspaceInventoryLifecycle(
  requestId: string,
  options: RequestOptions = {},
) {
  const id = assertWorkspaceInventoryLifecycleRequestId(requestId);
  return assertWorkspaceInventoryLifecycleResult(
    await request(
      `/v1/workspace-inventory/lifecycle/requests/${encodeURIComponent(id)}`,
      { method: "GET" },
      options,
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
  const currentSnapshot = await readWorkspaceRegistry(options);
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
  return assertWorkspaceInventoryLifecycleResult(
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
        intent.action === "restore" ? preparation.latest_event_ref : null,
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
  const baseUrl = env.OOS_BASE_URL?.trim();
  const callerSecret = env.OOS_CALLER_SECRET?.trim();
  if (!baseUrl || !callerSecret) {
    throw new WorkspaceRegistryOosError(
      "Workspace Registry is unavailable until the approved OOS integration is configured.",
      "workspace_registry_oos_not_configured",
      503,
    );
  }
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new WorkspaceRegistryOosError(
      "Workspace Registry OOS endpoint is invalid.",
      "workspace_registry_oos_url_invalid",
      503,
    );
  }
  if (!new Set(["http:", "https:"]).has(url.protocol)) {
    throw new WorkspaceRegistryOosError(
      "Workspace Registry OOS endpoint is invalid.",
      "workspace_registry_oos_url_invalid",
      503,
    );
  }
  return {
    baseUrl: url.toString().replace(/\/$/, ""),
    callerId: env.OOS_CALLER_ID?.trim() || "governance-operations-console",
    callerSecret,
  };
}

async function request(path: string, init: RequestInit, options: RequestOptions) {
  const config = options.config ?? resolveConfig();
  let response: Response;
  try {
    response = await (options.fetchImpl ?? fetch)(`${config.baseUrl}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        ...consoleMutationAttributionHeaders(),
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-oos-caller-id": config.callerId,
        "x-oos-caller-secret": config.callerSecret,
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
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
        : "workspace_registry_oos_rejected",
      response.status,
      source.retryable === true,
    );
  }
  return body;
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
    return assertWorkspaceInventoryPreparation(value);
  } catch (error) {
    throw projectionError(error);
  }
}

function projectResult(value: unknown, requestId: string) {
  try {
    return assertWorkspaceInventoryResult(value, requestId);
  } catch (error) {
    throw projectionError(error);
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
