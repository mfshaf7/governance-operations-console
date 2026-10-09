import { createHash } from "node:crypto";

import {
  ConsoleRuntimeConfigurationError,
  resolveConsoleOosOperatorConfiguration,
  type ConsoleOosOperatorConfiguration,
} from "../../console-integration/configuration/console-runtime-configuration.ts";
import { consoleMutationAttributionHeaders } from "../../console-integration/identity/server/console-session-authorization.ts";
import { projectAgentContextCandidate } from "../model/agent-context-policy.ts";
import type { GovernedAgentRequest } from "./agent-request-policy.ts";

const maxResponseBytes = 1_048_576;
const timeoutMs = 180_000;
export const governedAgentProfileId = "agent-console-assistant-v1";
export const governedAgentProvider = "governed-ai-gateway";
export const governedAgentSafetyMode = "oos-session/cgg-model-safe/governed-ai/manual-operator-request";

export class AgentConsoleOosError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly status: number;

  constructor(message: string, code: string, status: number, retryable = false) {
    super(message);
    this.name = "AgentConsoleOosError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

type Options = Readonly<{
  config?: ConsoleOosOperatorConfiguration;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  signal?: AbortSignal;
}>;

export type GovernedAgentInvocationResult = Readonly<{
  auditRef: string;
  contextArtifactDigest: string;
  invocationId: string;
  modelProfileId: string;
  projectionReceiptRef: string;
  receiptDigest: string;
  receiptRef: string;
  sessionId: string;
  text: string;
}>;

export async function probeGovernedAgentPath(options: Options = {}) {
  const config = options.config ?? resolveConfig();
  let response: Response;
  try {
    response = await (options.fetchImpl ?? fetch)(`${config.baseUrl}/readyz`, {
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    throw new AgentConsoleOosError("Agent Console could not reach OOS.", "agent_console_oos_unavailable", 502, true);
  }
  if (!response.ok) {
    throw new AgentConsoleOosError("Agent Console OOS runtime is not ready.", "agent_console_oos_not_ready", 503, true);
  }
  return { profileId: governedAgentProfileId };
}

export async function invokeGovernedAgent(
  input: GovernedAgentRequest,
  options: Options = {},
): Promise<GovernedAgentInvocationResult> {
  const config = options.config ?? resolveConfig();
  const ids = requestIds(input);
  const created = assertSessionProjection(
    await request("/v1/agent-console/sessions", {
      body: JSON.stringify({
        schema_version: 1,
        session_id: ids.sessionId,
        operator_id: config.operatorId,
        agent: { logical_agent_id: "agent-console", instance_id: ids.agentInstanceId },
        interaction_mode: input.mode,
        opened_at: input.session.openedAt,
        idempotency_key: ids.sessionIdempotencyKey,
      }),
      method: "POST",
    }, { ...options, config }),
    { config, ids, input },
  );
  if (created.state !== "active") throw projectionError("OOS returned a closed Agent Console session.");

  const content = JSON.stringify(projectAgentContextCandidate(input.candidate));
  const invoked = assertSessionProjection(
    await request(`/v1/agent-console/sessions/${encodeURIComponent(ids.sessionId)}/invocations`, {
      body: JSON.stringify({
        schema_version: 1,
        invocation_id: ids.invocationId,
        correlation_id: ids.correlationId,
        idempotency_key: ids.invocationIdempotencyKey,
        requested_at: (options.now?.() ?? new Date()).toISOString(),
        prompt: input.message,
        candidate: {
          candidate_id: ids.candidateId,
          scope: input.candidate.scope,
          source_authority: "governance-operations-console",
          source_mode: input.candidate.sourceMode,
          source_ref: input.candidate.refs[0] ?? `console://agent-context/${encodeURIComponent(input.candidate.id)}`,
          source_revision: digest(content),
          captured_at: input.candidate.observedAt ?? input.candidate.projectedAt,
          content,
          content_digest: digest(content),
        },
        budget_tokens: 1024,
      }),
      method: "POST",
    }, { ...options, config }),
    { config, ids, input },
  );
  const latest = record(invoked.latest_invocation);
  if (latest.invocation_id !== ids.invocationId || latest.correlation_id !== ids.correlationId) {
    throw projectionError("OOS returned another Agent Console invocation binding.");
  }
  if (latest.state !== "completed") {
    const failure = isRecord(latest.failure) ? latest.failure : {};
    throw new AgentConsoleOosError(
      typeof failure.message === "string" ? failure.message : "Governed Agent Console invocation did not complete.",
      typeof failure.code === "string" ? failure.code : "agent_console_invocation_failed",
      502,
      failure.retryable === true,
    );
  }
  const result = record(latest.result);
  const context = record(latest.context);
  const model = record(latest.model);
  const receipt = record(latest.receipt_ref);
  if (
    typeof result.text !== "string" || !result.text.trim() ||
    model.profile_id !== governedAgentProfileId ||
    typeof model.binding_selection_ref !== "string" ||
    typeof model.audit_ref !== "string" ||
    typeof context.projection_receipt_ref !== "string" ||
    !isDigest(context.artifact_digest) ||
    typeof receipt.uri !== "string" ||
    !isDigest(receipt.digest)
  ) {
    throw projectionError("OOS returned incomplete governed Agent Console evidence.");
  }
  return {
    auditRef: model.audit_ref,
    contextArtifactDigest: context.artifact_digest,
    invocationId: ids.invocationId,
    modelProfileId: model.profile_id,
    projectionReceiptRef: context.projection_receipt_ref,
    receiptDigest: receipt.digest,
    receiptRef: receipt.uri,
    sessionId: ids.sessionId,
    text: result.text,
  };
}

export async function closeGovernedAgentSession(
  input: Pick<GovernedAgentRequest, "mode" | "session">,
  options: Options = {},
) {
  const config = options.config ?? resolveConfig();
  const ids = requestIds({ ...input, invocationNonce: "00000000-0000-4000-8000-000000000000" });
  let current: Record<string, unknown>;
  try {
    current = assertSessionProjection(
      await request(`/v1/agent-console/sessions/${encodeURIComponent(ids.sessionId)}`, { method: "GET" }, { ...options, config }),
      { config, ids, input },
    );
  } catch (error) {
    if (error instanceof AgentConsoleOosError && error.status === 404) return { closed: false };
    throw error;
  }
  if (current.state === "closed") return { closed: true };
  const closed = assertSessionProjection(
    await request(`/v1/agent-console/sessions/${encodeURIComponent(ids.sessionId)}/close`, {
      body: JSON.stringify({
        closed_at: (options.now?.() ?? new Date()).toISOString(),
        expected_revision: current.revision,
      }),
      method: "POST",
    }, { ...options, config }),
    { config, ids, input },
  );
  if (closed.state !== "closed") throw projectionError("OOS did not close the Agent Console session.");
  return { closed: true };
}

function resolveConfig() {
  try {
    return resolveConsoleOosOperatorConfiguration();
  } catch (error) {
    throw new AgentConsoleOosError(
      "Agent Console is unavailable until its approved OOS caller and operator binding are configured.",
      error instanceof ConsoleRuntimeConfigurationError ? error.code : "agent_console_configuration_invalid",
      503,
    );
  }
}

async function request(path: string, init: RequestInit, options: Options) {
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
        "x-oos-operator-id": config.operatorId,
      },
      signal: init.signal ?? (options.signal
        ? AbortSignal.any([options.signal, AbortSignal.timeout(timeoutMs)])
        : AbortSignal.timeout(timeoutMs)),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new AgentConsoleOosError("Agent Console could not reach OOS.", "agent_console_oos_unavailable", 502, true);
  }
  const raw = await response.text();
  if (Buffer.byteLength(raw) > maxResponseBytes) throw projectionError("Agent Console response exceeded the Console limit.");
  let body: unknown;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    throw projectionError("Agent Console received an invalid OOS response.");
  }
  if (!response.ok) {
    const source = isRecord(body) ? body : {};
    throw new AgentConsoleOosError(
      typeof source.message === "string" ? source.message : typeof source.error === "string" ? source.error : "OOS rejected the Agent Console request.",
      typeof source.code === "string" ? source.code : "agent_console_oos_rejected",
      response.status,
      source.retryable === true,
    );
  }
  return body;
}

function requestIds(input: Pick<GovernedAgentRequest, "invocationNonce" | "mode" | "session">) {
  const token = input.session.nonce.replaceAll("-", "");
  const invocation = input.invocationNonce.replaceAll("-", "");
  return {
    agentInstanceId: `console-agent:${token}`,
    candidateId: `console-candidate:${invocation}`,
    correlationId: `console-correlation:${invocation}`,
    invocationId: `console-invocation:${invocation}`,
    invocationIdempotencyKey: `console-invocation-key:${invocation}`,
    sessionId: `console-session:${token}:${input.mode}`,
    sessionIdempotencyKey: `console-session-key:${token}:${input.mode}`,
  };
}

function assertSessionProjection(
  value: unknown,
  expected: Readonly<{
    config: ConsoleOosOperatorConfiguration;
    ids: ReturnType<typeof requestIds>;
    input: Pick<GovernedAgentRequest, "mode" | "session">;
  }>,
) {
  const projection = record(value);
  const agent = record(projection.agent);
  const sessionRef = record(projection.session_ref);
  if (
    projection.schema_version !== 1 || projection.workflow_id !== "agent-console" ||
    projection.session_id !== expected.ids.sessionId || projection.operator_id !== expected.config.operatorId ||
    projection.caller_id !== expected.config.callerId || projection.interaction_mode !== expected.input.mode ||
    agent.logical_agent_id !== "agent-console" || agent.instance_id !== expected.ids.agentInstanceId ||
    !Number.isInteger(projection.revision) || Number(projection.revision) < 1 ||
    !new Set(["active", "closed"]).has(projection.state as string) ||
    typeof sessionRef.uri !== "string" || !isDigest(sessionRef.digest)
  ) {
    throw projectionError("OOS returned an invalid or mismatched Agent Console session projection.");
  }
  return projection;
}

function digest(value: string) {
  return `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;
}

function isDigest(value: unknown): value is string {
  return typeof value === "string" && /^sha256:[0-9a-f]{64}$/.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function record(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw projectionError("OOS returned a malformed Agent Console projection.");
  return value;
}

function projectionError(message: string) {
  return new AgentConsoleOosError(message, "agent_console_projection_invalid", 502);
}
