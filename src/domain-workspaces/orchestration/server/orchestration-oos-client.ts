import { createHash, randomUUID } from "node:crypto";

import { ConsoleRuntimeConfigurationError, resolveConsoleOosOperatorConfiguration, type ConsoleOosOperatorConfiguration } from "../../../console-integration/configuration/console-runtime-configuration.ts";
import { consoleMutationAttributionHeaders } from "../../../console-integration/identity/server/console-session-authorization.ts";
import { assertOosOrchestrationDefinitions, assertOosOrchestrationRun, assertOosOrchestrationRuns } from "../live-runtime/orchestration-live-contract.ts";

const timeoutMs = 12_000;
const maxResponseBytes = 1_048_576;

export class OrchestrationOosError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(message: string, code: string, status: number) { super(message); this.name = "OrchestrationOosError"; this.code = code; this.status = status; }
}
type Options = Readonly<{ config?: ConsoleOosOperatorConfiguration; fetchImpl?: typeof fetch; now?: () => Date; randomId?: () => string }>;

export async function readOrchestrationWorkspace(options: Options = {}) {
  const [definitions, runs] = await Promise.all([
    request("/v1/orchestration/definitions", { method: "GET" }, options).then(assertOosOrchestrationDefinitions),
    request("/v1/orchestration/runs?limit=100", { method: "GET" }, options).then(assertOosOrchestrationRuns),
  ]);
  return { definitions, runs };
}

export async function controlOrchestrationRun(runId: string, value: unknown, options: Options = {}) {
  const intent = controlIntent(value);
  const config = options.config ?? resolveConfig();
  const nonce = intent.requestId || (options.randomId ?? randomUUID)();
  const action = intent.action === "provide-signal" ? "signal" : intent.action;
  const control = { schema_version: 1, control_id: bounded(`console-control:${nonce}`), action, operator_id: config.operatorId, reason_ref: reasonRef(intent.intent), idempotency_key: bounded(`console-control-idempotency:${nonce}`) };
  const run = assertOosOrchestrationRun(await request(`/v1/orchestration/runs/${encodeURIComponent(runId)}/controls`, {
    body: JSON.stringify(control),
    method: "POST",
  }, { ...options, config }));
  const retained = Array.isArray(run.controls) ? run.controls.find((candidate) => isRecord(candidate) && candidate.control_id === control.control_id) : null;
  if (!retained || retained.action !== control.action || retained.operator_id !== control.operator_id || retained.reason_ref !== control.reason_ref || retained.idempotency_key !== control.idempotency_key) throw new OrchestrationOosError("OOS did not retain the exact orchestration control binding.", "orchestration_control_binding_invalid", 502);
  return run;
}

function resolveConfig() {
  try { return resolveConsoleOosOperatorConfiguration(); }
  catch (error) { throw new OrchestrationOosError("Orchestration is unavailable until the Console OOS integration is configured.", error instanceof ConsoleRuntimeConfigurationError ? error.code : "orchestration_configuration_invalid", 503); }
}
async function request(path: string, init: RequestInit, options: Options) {
  const config = options.config ?? resolveConfig();
  let response: Response;
  try {
    response = await (options.fetchImpl ?? fetch)(`${config.baseUrl}${path}`, { ...init, cache: "no-store", redirect: "error", headers: { ...Object.fromEntries(new Headers(init.headers).entries()), ...consoleMutationAttributionHeaders(), Accept: "application/json", "Content-Type": "application/json", "x-oos-caller-id": config.callerId, "x-oos-caller-secret": config.callerSecret, "x-oos-operator-id": config.operatorId }, signal: AbortSignal.timeout(timeoutMs) });
  } catch { throw new OrchestrationOosError("Orchestration could not reach OOS.", "orchestration_oos_unavailable", 502); }
  const raw = await response.text();
  if (Buffer.byteLength(raw) > maxResponseBytes) throw new OrchestrationOosError("Orchestration response exceeded the Console limit.", "orchestration_response_large", 502);
  let body: unknown;
  try { body = raw ? JSON.parse(raw) : null; } catch { throw new OrchestrationOosError("Orchestration received an invalid OOS response.", "orchestration_projection_invalid", 502); }
  if (!response.ok) {
    const source = isRecord(body) ? body : {};
    const code = isIdentifier(source.code)
      ? source.code
      : isIdentifier(source.error)
        ? source.error
        : response.status === 409
          ? "orchestration_control_conflict"
          : "orchestration_oos_rejected";
    throw new OrchestrationOosError(isText(source.message) ? source.message : "OOS rejected the orchestration request.", code, response.status);
  }
  return body;
}
function controlIntent(value: unknown): { action: "cancel" | "defer" | "provide-signal" | "resume" | "retry"; intent: Record<string, unknown>; requestId: string } {
  if (!isRecord(value)) throw new OrchestrationOosError("Run control is invalid.", "orchestration_control_invalid", 400);
  const source = value as Record<string, unknown>;
  if (Object.keys(source).some((key) => !["action", "intent", "requestId"].includes(key)) || !new Set(["cancel", "defer", "provide-signal", "resume", "retry"]).has(String(source.action)) || !isIdentifier(source.requestId) || !isRecord(source.intent) || source.intent.controlId !== source.action || JSON.stringify(source.intent).length > 8_192) throw new OrchestrationOosError("Run control is invalid.", "orchestration_control_invalid", 400);
  return source as { action: "cancel" | "defer" | "provide-signal" | "resume" | "retry"; intent: Record<string, unknown>; requestId: string };
}
function bounded(value: string) { return value.replace(/[^A-Za-z0-9._:/@+-]/g, "-").slice(0, 256); }
function reasonRef(value: unknown) { return `console-reason:sha256:${createHash("sha256").update(canonicalStringify(value)).digest("hex")}`; }
function canonicalStringify(value: unknown): string { if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(",")}]`; if (value && typeof value === "object") return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${canonicalStringify((value as Record<string, unknown>)[key])}`).join(",")}}`; return JSON.stringify(value); }
function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function isText(value: unknown): value is string { return typeof value === "string" && value.length > 0 && value.length <= 2048; }
function isIdentifier(value: unknown): value is string { return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:/@+\-]{0,255}$/.test(value); }
