import { createHash } from "node:crypto";

import {
  consoleOosModeSelected,
  ConsoleRuntimeConfigurationError,
  resolveConsoleOosConnection,
  type ConsoleOosConnection,
} from "../../configuration/console-runtime-configuration.ts";
import { consoleMutationAttributionHeaders } from "../../identity/server/console-session-authorization.ts";
import {
  acceptCurrentConsoleSourceProjection,
  consoleSourceProjectionHeaders,
  ConsoleSourceAuthorityError,
  type ConsoleSourceAuthorityExpectation,
} from "../../source-authority/console-source-authority.ts";

import {
  assertWorkspaceIntakePreparation,
  assertWorkspaceIntakeResult,
  assertWorkspaceIntakeSubmissionIntent,
  sameWorkspaceIntakePreparation,
  WorkspaceIntakeContractError,
  workspaceIntakeRecordForDecision as recordForDecision,
  assertWorkspaceIntakeRequestPage,
} from "../workspace-intake-live-contract.ts";
import type {
  WorkspaceIntakePreparation,
  WorkspaceIntakeResult,
  WorkspaceIntakeSubmissionIntent,
  WorkspaceIntakeTargetKind,
  WorkspaceIntakeCustodyPreparation,
} from "../workspace-intake-live-types.ts";

const timeoutMs = 12_000;
const maxResponseBytes = 1_048_576;

type WorkspaceIntakeOosConfig = ConsoleOosConnection;

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
  return consoleOosModeSelected(env);
}

export async function listWorkspaceIntakeRequests(targetName: string, custodyRequestId: string,
  cursor: string | null = null, options: RequestOptions = {}) {
  const query = new URLSearchParams({ target_kind: "repo", target_name: targetName, custody_request_id: custodyRequestId });
  return listRequestPage(query, targetName, custodyRequestId, "repo", cursor, options);
}

export async function listDirectWorkspaceIntakeRequests(kind: "product" | "component", targetName: string,
  cursor: string | null = null, options: RequestOptions = {}) {
  const query = new URLSearchParams({ target_kind: kind, target_name: targetName, source_class: "direct" });
  return listRequestPage(query, targetName, null, kind, cursor, options);
}

async function listRequestPage(query: URLSearchParams, targetName: string, custodyRequestId: string | null,
  kind: WorkspaceIntakeTargetKind, cursor: string | null, options: RequestOptions) {
  if (cursor !== null) query.set("cursor", cursor);
  const endpoint = `/v1/workspace-intake/requests?${query}`;
  const value = await request(endpoint, { method: "GET" }, options, {
    authority: "operator-orchestration-service", sourceOwner: "operator-orchestration-service",
    recordRef: `oos://workspace-intake/requests?${query}`,
  });
  try {
    const page = assertWorkspaceIntakeRequestPage(value, targetName, custodyRequestId, kind);
    for (const entry of page.records) {
      const { candidate_digest: expected, ...content } = entry.candidate;
      if (canonicalDigest(content) !== expected) throw contractError("Retained custody candidate digest does not match its content.");
    }
    return page;
  } catch (error) { throw projectionError(error); }
}

export async function prepareWorkspaceIntake(
  target: { kind: WorkspaceIntakeTargetKind; name: string },
  options: RequestOptions = {},
  repositoryCustody?: WorkspaceIntakeCustodyPreparation,
) {
  const body = await request(
    "/v1/workspace-intake/preparations",
    { body: JSON.stringify({ target, ...(repositoryCustody ? { repository_custody: repositoryCustody } : {}) }), method: "POST" },
    options,
  );
  return projectPreparation(body);
}

export async function submitWorkspaceIntake(
  value: unknown,
  options: RequestOptions = {},
) {
  const intent = assertWorkspaceIntakeSubmissionIntent(value);
  const reviewedSource = intent.reviewed_preparation.source_candidate;
  let custody: WorkspaceIntakeCustodyPreparation | undefined;
  if (reviewedSource) {
    const ref = /^oos:\/\/repository-custody\/requests\/([^/]+)\/intake\/[0-9a-f]{64}$/.exec(reviewedSource.source.ref);
    const selected = { source: intent.candidate.source, target: { ...intent.candidate.target,
      record_id: `${intent.candidate.target.kind}:${intent.candidate.target.name}` },
      requested_record: recordForDecision(intent.candidate.requested_record, intent.decision),
      evidence_refs: intent.candidate.evidence_refs };
    const expected = { source: reviewedSource.source, target: reviewedSource.target,
      requested_record: reviewedSource.requested_record, evidence_refs: reviewedSource.evidence_refs };
    if (!ref || reviewedSource.requested_record.kind !== "repo" || canonicalDigest(selected) !== canonicalDigest(expected)) {
      throw new WorkspaceIntakeContractError("Review a fresh custody preparation for this exact classification and record before submitting.");
    }
    let requestId: string;
    try {
      requestId = intent.reviewed_preparation.authority_kind === "internal-instance-record"
        ? intent.reviewed_preparation.custody_request_id : decodeURIComponent(ref[1]);
      if (intent.reviewed_preparation.authority_kind !== "internal-instance-record" && encodeURIComponent(requestId) !== ref[1]) throw new Error();
    } catch {
      throw new WorkspaceIntakeContractError("Custody source request identity is invalid.");
    }
    custody = { request_id: requestId, requested_record: reviewedSource.requested_record };
  }
  const current = await prepareWorkspaceIntake(intent.candidate.target, options, custody);
  if (!sameWorkspaceIntakePreparation(intent.reviewed_preparation, current)) {
    throw new WorkspaceIntakeOosError(
      "Workspace authority changed after review. Refresh and review the current binding before submission.",
      "workspace_intake_review_stale",
      409,
    );
  }
  const config = options.config ?? resolveConfig();
  const command = buildCommand(intent, current, config.callerId, options.now?.() ?? new Date());
  try {
    const body = await request(
      "/v1/workspace-intake/requests", { body: JSON.stringify(command), method: "POST" }, { ...options, config },
    );
    assertReturnedBinding(body, command);
    return projectResult(body, intent.request_id);
  } catch (error) {
    if (!(error instanceof WorkspaceIntakeOosError) || (!error.retryable && error.status < 500 && error.status !== 409)) throw error;
    return recoverSubmittedIntake(command, { ...options, config }, error);
  }
}

export async function readWorkspaceIntake(
  requestId: string,
  options: RequestOptions = {},
) {
  return projectResult(
    await request(
      `/v1/workspace-intake/requests/${encodeURIComponent(requestId)}`,
      { method: "GET" },
      options,
      {
        authority: "operator-orchestration-service",
        recordRef: `oos://workspace-intake/requests/${requestId}`,
        sourceOwner: "operator-orchestration-service",
      },
    ),
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
      artifact_type: preparation.authority_kind === "internal-instance-record" ? "instance-repository-intake-request" : "workspace-intake-request",
      ...(preparation.authority_kind === "internal-instance-record" ? {
        instance_id: preparation.canonical_authority.instance_id, custody_request_id: preparation.custody_request_id, policy_ref: preparation.policy_ref,
      } : {}),
      expected_state: preparation.expected_state,
      idempotency_key: `${intent.request_id}:v1`,
      owner_route: "workspace-governance",
      request_id: intent.request_id,
      requested_at: at,
      requested_classification: intent.decision,
      requested_record: requestedRecord,
      requester_ref: callerId,
      schema_version: preparation.authority_kind === "internal-instance-record" ? 1 : 2,
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

async function recoverSubmittedIntake(command: ReturnType<typeof buildCommand>, options: RequestOptions, originalError: WorkspaceIntakeOosError) {
  const id = command.request.request_id;
  let saved: unknown;
  try {
    saved = await request(`/v1/workspace-intake/requests/${encodeURIComponent(id)}`, { method: "GET" }, options, {
      authority: "operator-orchestration-service", sourceOwner: "operator-orchestration-service", recordRef: `oos://workspace-intake/requests/${id}`,
    });
  } catch (error) {
    if (error instanceof WorkspaceIntakeOosError && error.status === 404 && error.code === "workspace_intake_not_found") throw originalError;
    throw new WorkspaceIntakeOosError("The submission outcome is unconfirmed. Check the original request when its connection returns.", "workspace_intake_submission_unconfirmed", 503, true);
  }
  // The owner retains the first command's server timestamps. A retry may have
  // rebuilt those timestamps, but it may not change any reviewed semantics,
  // operator acceptance, request identity or workflow context.
  const semantic = (value: unknown) => {
    if (!isRecord(value) || !isRecord(value.request) || !isRecord(value.decision) ||
        !isRecord(value.decision.operator_acceptance) || !isRecord(value.decision.request_ref)) throw contractError("Original registration input is unavailable.");
    const { requested_at: _at, request_digest: _digest, ...originalRequest } = value.request;
    const { decided_at: _decided, decision_digest: _decisionDigest, operator_acceptance: acceptance, request_ref: reference, ...originalDecision } = value.decision;
    const { recorded_at: _acceptedAt, ...originalAcceptance } = acceptance as Record<string, unknown>;
    const { digest: _requestDigest, ...originalReference } = reference as Record<string, unknown>;
    return { request: originalRequest, decision: { ...originalDecision, operator_acceptance: originalAcceptance, request_ref: originalReference },
      session_ref: value.session_ref, execution_ref: value.execution_ref };
  };
  try {
    const result = projectResult(saved, id);
    if (canonicalDigest(semantic(saved)) !== canonicalDigest(semantic(command))) {
      throw new WorkspaceIntakeOosError("This request identity belongs to different reviewed input. Open its original request before starting another.", "workspace_intake_idempotency_conflict", 409);
    }
    return result;
  } catch (error) {
    if (error instanceof WorkspaceIntakeOosError) throw error;
    throw projectionError(error);
  }
}

function resolveConfig(env = process.env): WorkspaceIntakeOosConfig {
  try {
    return resolveConsoleOosConnection(env);
  } catch (error) {
    const invalidUrl =
      error instanceof ConsoleRuntimeConfigurationError &&
      error.code === "console_oos_url_invalid";
    throw new WorkspaceIntakeOosError(
      invalidUrl
        ? "Workspace Intake OOS endpoint is invalid."
        : "Workspace Intake is unavailable until the approved OOS integration is configured.",
      invalidUrl
        ? "workspace_intake_oos_url_invalid"
        : "workspace_intake_oos_not_configured",
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
  if (!sourceExpectation) return body;
  try {
    return acceptCurrentConsoleSourceProjection(body, sourceExpectation);
  } catch (error) {
    if (error instanceof ConsoleSourceAuthorityError) {
      throw new WorkspaceIntakeOosError(error.message, error.code, 502);
    }
    throw error;
  }
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

function projectPreparation(value: unknown) {
  try {
    const result = assertWorkspaceIntakePreparation(value);
    if (result.source_candidate) {
      const { candidate_digest: expected, ...content } = result.source_candidate;
      if (canonicalDigest(content) !== expected) throw contractError("Custody source candidate digest does not match its content.");
    }
    return result;
  } catch (error) {
    throw projectionError(error);
  }
}

function projectResult(value: unknown, requestId: string) {
  try {
    const result = assertWorkspaceIntakeResult(value, requestId);
    if (result.authority_kind === "internal-instance-record") verifyInstanceResult(value, result);
    return result;
  } catch (error) {
    throw projectionError(error);
  }
}

function verifyInstanceResult(value: unknown, result: WorkspaceIntakeResult) {
  if (!isRecord(value) || !isRecord(value.request) || !isRecord(value.decision) || !result.canonical_authority) {
    throw contractError("Internal registration omitted its original reviewed command.");
  }
  const { request_digest: expectedRequest, ...request } = value.request;
  const { decision_digest: expectedDecision, ...decision } = value.decision;
  const authority = result.canonical_authority;
  if (canonicalDigest(request) !== expectedRequest || canonicalDigest(decision) !== expectedDecision ||
      request.artifact_type !== "instance-repository-intake-request" || request.schema_version !== 1 ||
      request.request_id !== result.request_id || request.instance_id !== authority.instance_id ||
      !isRecord(request.target) || request.target.record_id !== authority.record_id ||
      !isRecord(decision.request_ref) || decision.request_ref.id !== result.request_id || decision.request_ref.digest !== expectedRequest) {
    throw contractError("Internal registration command differs from its durable binding.");
  }
  if (!result.receipt || result.receipt.artifact_type !== "instance-operational-record-receipt") return;
  const { receipt_digest: expectedReceipt, ...receipt } = result.receipt;
  const readback = result.readback;
  if (!isRecord(readback) || !isRecord(readback.record) || !isRecord(readback.record.record) ||
      !isRecord(request.expected_state) || !isRecord(request.policy_ref) || !isRecord(decision.operator_acceptance)) {
    throw contractError("Internal registration readback is incomplete.");
  }
  const entry = readback.record.record, mutation = entry.last_mutation;
  const policyRef = `git://workspace-governance/${request.policy_ref.revision}/contracts/instance-operational-records.yaml@${request.policy_ref.contract_digest}`;
  if (canonicalDigest(receipt) !== expectedReceipt || canonicalDigest(readback.receipt) !== canonicalDigest(result.receipt) ||
      canonicalDigest(readback.record) !== receipt.record_digest || receipt.idempotency_key !== request.idempotency_key ||
      receipt.decision_digest !== expectedDecision || receipt.operator_ref !== decision.operator_acceptance.operator_ref ||
      receipt.policy_ref !== policyRef || receipt.action !== `intake.${request.action}` ||
      receipt.version !== Number(request.expected_state.record_version ?? 0) + 1 ||
      receipt.previous.version !== request.expected_state.record_version || receipt.previous.digest !== request.expected_state.record_digest ||
      readback.record.phase !== "intake" || readback.record.status !== request.requested_classification ||
      readback.record.owner_route !== request.owner_route || entry.id !== authority.record_id || entry.version !== receipt.version ||
      canonicalDigest(entry.source) !== canonicalDigest(request.source) || !isRecord(mutation) ||
      mutation.request_digest !== expectedRequest || mutation.decision_digest !== expectedDecision || mutation.idempotency_key !== request.idempotency_key) {
    throw contractError("Internal registration receipt does not prove this exact reviewed record.");
  }
  if (!isRecord(request.requested_record)) throw contractError("Internal registration omitted its reviewed metadata.");
  for (const [key, expected] of Object.entries(request.requested_record)) {
    if (key !== "kind" && canonicalDigest(readback.record[key]) !== canonicalDigest(expected)) {
      throw contractError("Stored registration metadata differs from the reviewed record.");
    }
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
