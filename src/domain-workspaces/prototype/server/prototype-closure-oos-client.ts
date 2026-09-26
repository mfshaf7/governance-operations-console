import { consoleMutationAttributionHeaders } from "../../../console-integration/identity/server/console-session-authorization.ts";

import {
  assertPrototypeClosureId,
  assertPrototypeClosureIntent,
  assertPrototypeClosurePreparation,
  assertPrototypeClosureRequestId,
  assertPrototypeClosureResult,
  PrototypeClosureContractError,
} from "../live-runtime/prototype-closure-live-contract.ts";
import type { PrototypeClosureIntent } from "../live-runtime/prototype-closure-live-types.ts";

const timeoutMs = 12_000;
const maxResponseBytes = 2_097_152;

type Config = Readonly<{ baseUrl: string; callerId: string; callerSecret: string }>;
type Options = Readonly<{ config?: Config; fetchImpl?: typeof fetch }>;

export class PrototypeClosureOosError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryable: boolean;

  constructor(
    message: string,
    code: string,
    status: number,
    retryable = false,
  ) {
    super(message);
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

export function prototypeClosureOosConfigured(env = process.env) {
  return Boolean(env.OOS_BASE_URL?.trim() && env.OOS_CALLER_SECRET?.trim());
}

export async function preparePrototypeClosure(prototypeId: string, options: Options = {}) {
  return projectPreparation(await request("/v1/prototype-closures/preparations", {
    method: "POST",
    body: JSON.stringify({ prototype_id: assertPrototypeClosureId(prototypeId) }),
  }, options));
}

export async function submitPrototypeClosure(value: unknown, options: Options = {}) {
  const intent = assertPrototypeClosureIntent(value);
  const current = await preparePrototypeClosure(intent.preparation.prototype_id, options);
  if (
    current.authority_revision !== intent.preparation.authority_revision ||
    current.expected_state.record_digest !== intent.preparation.expected_state.record_digest ||
    current.expected_state.lifecycle !== intent.preparation.expected_state.lifecycle
  ) {
    throw new PrototypeClosureOosError(
      "Prototype Studio changed after review. Refresh Closure before submitting.",
      "prototype_closure_review_stale", 409,
    );
  }
  const config = options.config ?? resolveConfig();
  const command = buildPrototypeClosureCommand(intent, config.callerId);
  const result = projectResult(await request("/v1/prototype-closures/requests", {
    method: "POST", body: JSON.stringify(command),
  }, { ...options, config }), intent.request_id);
  if (result.request.operator_id !== config.callerId ||
      result.request.expected_source_revision !== current.authority_revision ||
      result.request.action !== intent.action ||
      result.prototype_id !== current.prototype_id) {
    throw new PrototypeClosureOosError("OOS returned a different Closure command binding.",
      "prototype_closure_projection_invalid", 502);
  }
  return result;
}

export function buildPrototypeClosureCommand(intent: PrototypeClosureIntent, callerId: string) {
  return {
    expected_record_digest: intent.preparation.expected_state.record_digest,
    request: {
      schema_version: 2,
      artifact_type: "prototype-closure-request",
      request_id: intent.request_id,
      prototype_id: intent.preparation.prototype_id,
      action: intent.action,
      expected_lifecycle: intent.preparation.expected_state.lifecycle,
      expected_source_revision: intent.preparation.authority_revision,
      operator_id: callerId,
      correlation_id: intent.request_id,
      idempotency_key: intent.request_id,
      ...intent.fields,
    },
  };
}

export async function readPrototypeClosure(requestId: string, options: Options = {}) {
  const id = assertPrototypeClosureRequestId(requestId);
  return projectResult(await request(`/v1/prototype-closures/requests/${encodeURIComponent(id)}`,
    { method: "GET" }, options), id);
}

export async function decidePrototypeClosure(requestId: string, value: unknown, options: Options = {}) {
  const id = assertPrototypeClosureRequestId(requestId);
  const input = decision(value);
  return projectResult(await request(`/v1/prototype-closures/requests/${encodeURIComponent(id)}/decisions`,
    { method: "POST", body: JSON.stringify(input) }, options), id);
}

export async function continuePrototypeClosure(requestId: string, options: Options = {}) {
  return command(requestId, "continue", options);
}

export async function cancelPrototypeClosure(requestId: string, options: Options = {}) {
  return command(requestId, "cancel", options);
}

async function command(requestId: string, action: "continue" | "cancel", options: Options) {
  const id = assertPrototypeClosureRequestId(requestId);
  return projectResult(await request(`/v1/prototype-closures/requests/${encodeURIComponent(id)}/${action}`,
    { method: "POST", body: "{}" }, options), id);
}

function decision(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).join(",") !== "decision" ||
      !["approve", "deny"].includes(String((value as { decision?: unknown }).decision))) {
    throw new PrototypeClosureContractError("Closure decision must be approve or deny.");
  }
  return { decision: (value as { decision: "approve" | "deny" }).decision };
}

function resolveConfig(env = process.env): Config {
  const baseUrl = env.OOS_BASE_URL?.trim();
  const callerSecret = env.OOS_CALLER_SECRET?.trim();
  if (!baseUrl || !callerSecret) {
    throw new PrototypeClosureOosError("Prototype Closure is a disconnected local preview.",
      "prototype_closure_live_mode_required", 503);
  }
  let url: URL;
  try { url = new URL(baseUrl); } catch {
    throw new PrototypeClosureOosError("Prototype Closure OOS endpoint is invalid.",
      "prototype_closure_oos_url_invalid", 503);
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new PrototypeClosureOosError("Prototype Closure OOS endpoint is invalid.",
      "prototype_closure_oos_url_invalid", 503);
  }
  return { baseUrl: url.toString().replace(/\/$/, ""),
    callerId: env.OOS_CALLER_ID?.trim() || "governance-operations-console", callerSecret };
}

async function request(path: string, init: RequestInit, options: Options) {
  const config = options.config ?? resolveConfig();
  let response: Response;
  try {
    response = await (options.fetchImpl ?? fetch)(`${config.baseUrl}${path}`, {
      ...init, cache: "no-store",
      headers: { ...consoleMutationAttributionHeaders(), Accept: "application/json", "Content-Type": "application/json",
        "x-oos-caller-id": config.callerId, "x-oos-caller-secret": config.callerSecret },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new PrototypeClosureOosError("Prototype Closure could not reach OOS.",
      "prototype_closure_oos_unavailable", 502, true);
  }
  const raw = await response.text();
  if (Buffer.byteLength(raw) > maxResponseBytes) {
    throw new PrototypeClosureOosError("Prototype Closure response exceeded the Console limit.",
      "prototype_closure_response_large", 502);
  }
  let body: unknown;
  try { body = raw ? JSON.parse(raw) : null; } catch {
    throw new PrototypeClosureOosError("Prototype Closure returned invalid JSON.",
      "prototype_closure_response_invalid", 502);
  }
  if (!response.ok) {
    const source = body && typeof body === "object" && !Array.isArray(body)
      ? body as Record<string, unknown> : {};
    throw new PrototypeClosureOosError(
      typeof source.message === "string" ? source.message :
        typeof source.error === "string" ? source.error : "OOS rejected Prototype Closure.",
      typeof source.code === "string" ? source.code : "prototype_closure_oos_rejected",
      response.status, source.retryable === true || response.status >= 500,
    );
  }
  return body;
}

function projectPreparation(value: unknown) {
  try { return assertPrototypeClosurePreparation(value); } catch (error) {
    throw projectionError(error);
  }
}

function projectResult(value: unknown, requestId: string) {
  try { return assertPrototypeClosureResult(value, requestId); } catch (error) {
    throw projectionError(error);
  }
}

function projectionError(error: unknown) {
  return new PrototypeClosureOosError(
    error instanceof Error ? error.message : "Prototype Closure returned malformed authority evidence.",
    "prototype_closure_projection_invalid", 502,
  );
}
