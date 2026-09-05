import { createHash } from "node:crypto";

import {
  assertWorkspaceIntakePreparation,
  assertWorkspaceIntakeResult,
  assertWorkspaceIntakeSubmissionIntent,
  sameWorkspaceIntakePreparation,
  WorkspaceIntakeContractError,
} from "../workspace-intake-live-contract.ts";
import type {
  WorkspaceIntakePreparation,
  WorkspaceIntakeResult,
  WorkspaceIntakeSubmissionIntent,
  WorkspaceIntakeTargetKind,
} from "../workspace-intake-live-types.ts";

const timeoutMs = 12_000;
const maxResponseBytes = 1_048_576;

type WorkspaceIntakeOosConfig = Readonly<{
  baseUrl: string;
  callerId: string;
  callerSecret: string;
}>;

export class WorkspaceIntakeOosError extends Error {
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

export function workspaceIntakeOosConfigured(env = process.env) {
  return Boolean(env.OOS_BASE_URL?.trim() && env.OOS_CALLER_SECRET?.trim());
}

export async function prepareWorkspaceIntake(
  target: { kind: WorkspaceIntakeTargetKind; name: string },
  options: RequestOptions = {},
) {
  const body = await request(
    "/v1/workspace-intake/preparations",
    { body: JSON.stringify({ target }), method: "POST" },
    options,
  );
  return projectPreparation(body);
}

export async function submitWorkspaceIntake(
  value: unknown,
  options: RequestOptions = {},
) {
  const intent = assertWorkspaceIntakeSubmissionIntent(value);
  const current = await prepareWorkspaceIntake(intent.candidate.target, options);
  if (!sameWorkspaceIntakePreparation(intent.reviewed_preparation, current)) {
    throw new WorkspaceIntakeOosError(
      "Workspace authority changed after review. Refresh and review the current binding before submission.",
      "workspace_intake_review_stale",
      409,
    );
  }
  const config = options.config ?? resolveConfig();
  const command = buildCommand(intent, current, config.callerId, options.now?.() ?? new Date());
  const body = await request(
    "/v1/workspace-intake/requests",
    { body: JSON.stringify(command), method: "POST" },
    { ...options, config },
  );
  assertReturnedBinding(body, command);
  return projectResult(body, intent.request_id);
}

export async function readWorkspaceIntake(
  requestId: string,
  options: RequestOptions = {},
) {
  return projectResult(
    await request(`/v1/workspace-intake/requests/${encodeURIComponent(requestId)}`, { method: "GET" }, options),
    requestId,
  );
}

export async function continueWorkspaceIntake(
  requestId: string,
  options: RequestOptions = {},
) {
  return commandWorkspaceIntake(requestId, "continue", options);
}

export async function cancelWorkspaceIntake(
  requestId: string,
  options: RequestOptions = {},
) {
  return commandWorkspaceIntake(requestId, "cancel", options);
}

type RequestOptions = Readonly<{
  config?: WorkspaceIntakeOosConfig;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}>;

async function commandWorkspaceIntake(
  requestId: string,
  action: "cancel" | "continue",
  options: RequestOptions,
) {
  const body = await request(
    `/v1/workspace-intake/requests/${encodeURIComponent(requestId)}/${action}`,
    { body: "{}", method: "POST" },
    options,
  );
  return projectResult(body, requestId);
}

function buildCommand(
  intent: WorkspaceIntakeSubmissionIntent,
  preparation: WorkspaceIntakePreparation,
  callerId: string,
  now: Date,
) {
  const at = now.toISOString();
  const requestedRecord = recordForDecision(
    intent.candidate.requested_record,
    intent.decision,
  );
  const request = bindDigest(
    {
      action: preparation.expected_state.record_version === null ? "add" : "update",
      artifact_type: "workspace-intake-request",
      expected_state: preparation.expected_state,
      idempotency_key: `${intent.request_id}:v1`,
      owner_route: "workspace-governance",
      request_id: intent.request_id,
      requested_at: at,
      requested_classification: intent.decision,
      requested_record: requestedRecord,
      requester_ref: callerId,
      schema_version: 2,
      source: intent.candidate.source,
      target: preparation.target,
    },
    "request_digest",
  );
  const decision = bindDigest(
    {
      artifact_type: "workspace-intake-decision",
      decided_at: at,
      decision_id: `workspace-intake-decision:${intent.request_id.split(":").slice(1).join(":")}`,
      decision_source: "operator",
      operator_acceptance: {
        operator_ref: callerId,
        recorded_at: at,
        state: "accepted",
      },
      outcome: {
        approved_record: requestedRecord,
        classification: intent.decision,
        findings: [],
        owner_route: "workspace-governance",
        status: "allowed",
      },
      request_ref: { id: request.request_id, digest: request.request_digest },
      schema_version: 2,
      target: preparation.target,
    },
    "decision_digest",
  );
  return {
    authority_revision: preparation.authority_revision,
    decision,
    execution_ref: `console://workspace-intake/executions/${encodeURIComponent(intent.request_id)}`,
    request,
    session_ref: `console://workspace-intake/sessions/${encodeURIComponent(intent.request_id)}`,
  };
}

function assertReturnedBinding(value: unknown, command: ReturnType<typeof buildCommand>) {
  if (!isRecord(value) || !isRecord(value.request) || !isRecord(value.decision)) {
    throw projectionError(
      new Error("OOS did not return the submitted Workspace Intake binding."),
    );
  }
  if (
    value.request.request_id !== command.request.request_id ||
    value.request.request_digest !== command.request.request_digest ||
    value.decision.decision_digest !== command.decision.decision_digest
  ) {
    throw projectionError(
      new Error("OOS returned a different Workspace Intake command binding."),
    );
  }
}

function resolveConfig(env = process.env): WorkspaceIntakeOosConfig {
  const baseUrl = env.OOS_BASE_URL?.trim();
  const callerSecret = env.OOS_CALLER_SECRET?.trim();
  if (!baseUrl || !callerSecret) {
    throw new WorkspaceIntakeOosError(
      "Workspace Intake is unavailable until the approved OOS integration is configured.",
      "workspace_intake_oos_not_configured",
      503,
    );
  }
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new WorkspaceIntakeOosError(
      "Workspace Intake OOS endpoint is invalid.",
      "workspace_intake_oos_url_invalid",
      503,
    );
  }
  if (!new Set(["http:", "https:"]).has(url.protocol)) {
    throw new WorkspaceIntakeOosError(
      "Workspace Intake OOS endpoint is invalid.",
      "workspace_intake_oos_url_invalid",
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
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-oos-caller-id": config.callerId,
        "x-oos-caller-secret": config.callerSecret,
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new WorkspaceIntakeOosError(
      "Workspace Intake could not reach OOS.",
      "workspace_intake_oos_unavailable",
      502,
      true,
    );
  }
  const raw = await response.text();
  if (Buffer.byteLength(raw) > maxResponseBytes) {
    throw new WorkspaceIntakeOosError(
      "Workspace Intake response exceeded the Console limit.",
      "workspace_intake_response_large",
      502,
    );
  }
  let body: unknown = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    throw new WorkspaceIntakeOosError(
      "Workspace Intake returned an invalid response.",
      "workspace_intake_response_invalid",
      502,
    );
  }
  if (!response.ok) {
    const source = isRecord(body) ? body : {};
    throw new WorkspaceIntakeOosError(
      typeof source.message === "string"
        ? source.message
        : typeof source.error === "string"
          ? source.error
          : "OOS rejected the Workspace Intake operation.",
      typeof source.code === "string" ? source.code : "workspace_intake_oos_rejected",
      response.status,
      source.retryable === true,
    );
  }
  return body;
}

function bindDigest<T extends Record<string, unknown>, K extends string>(value: T, field: K) {
  return { ...value, [field]: canonicalDigest(value) } as T & Record<K, string>;
}

function canonicalDigest(value: unknown) {
  return `sha256:${createHash("sha256").update(canonicalStringify(value)).digest("hex")}`;
}

function canonicalStringify(value: unknown): string {
  if (value === null || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return JSON.stringify(value);
  }
  if (typeof value === "string") {
    if (!wellFormed(value)) {
      throw contractError("Workspace Intake command contains invalid Unicode.");
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort(compareUnicodeCodePoints)
      .map((key) => `${JSON.stringify(key)}:${canonicalStringify(value[key])}`)
      .join(",")}}`;
  }
  throw contractError("Workspace Intake command contains unsupported data.");
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

function contractError(message: string) {
  return new WorkspaceIntakeContractError(message);
}

function recordForDecision(
  record: WorkspaceIntakeSubmissionIntent["candidate"]["requested_record"],
  decision: WorkspaceIntakeSubmissionIntent["decision"],
) {
  if (decision !== "out-of-scope") return record;
  if (record.kind === "repo") {
    return {
      kind: "repo" as const,
      notes: record.notes,
      repo_class: null,
      requires_security_bindings: null,
      security_owner: null,
    };
  }
  if (record.kind === "product") {
    return {
      intended_endpoint: null,
      kind: "product" as const,
      notes: record.notes,
      platform_owner: null,
      runtime_owner: null,
      security_owner: null,
      source_owners: [],
    };
  }
  return {
    component_class: null,
    kind: "component" as const,
    notes: record.notes,
    owner_repo: null,
    product: null,
    security_owner: null,
  };
}

function projectPreparation(value: unknown) {
  try {
    return assertWorkspaceIntakePreparation(value);
  } catch (error) {
    throw projectionError(error);
  }
}

function projectResult(value: unknown, requestId: string) {
  try {
    return assertWorkspaceIntakeResult(value, requestId);
  } catch (error) {
    throw projectionError(error);
  }
}

function projectionError(error: unknown) {
  return new WorkspaceIntakeOosError(
    error instanceof Error
      ? error.message
      : "Workspace Intake returned malformed authority evidence.",
    "workspace_intake_projection_invalid",
    502,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
