import { createHash, randomUUID } from "node:crypto";

import {
  ConsoleRuntimeConfigurationError,
  resolveConsoleOosOperatorConfiguration,
  type ConsoleOosOperatorConfiguration,
} from "../../console-integration/configuration/console-runtime-configuration.ts";
import { consoleMutationAttributionHeaders } from "../../console-integration/identity/server/console-session-authorization.ts";
import {
  assertPlatformOperationCatalog,
  assertPlatformOperationList,
  assertPlatformOperationRecord,
} from "../live-runtime/platform-operation-contract.ts";
import type {
  PlatformOperationAction,
  PlatformOperationCapability,
  PlatformOperationRecord,
  PlatformOperationSubject,
} from "../live-runtime/platform-operation-types.ts";
import { assertSourceCredentialReceipt, sourceIntentFromReceipt } from "../live-runtime/source-authorization-contract.ts";

const timeoutMs = 12_000;
const maxResponseBytes = 1_048_576;

export class PlatformOperationOosError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryable: boolean;

  constructor(message: string, code: string, status: number, retryable = false) {
    super(message);
    this.name = "PlatformOperationOosError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

type Options = Readonly<{
  config?: ConsoleOosOperatorConfiguration;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  randomId?: () => string;
}>;

export async function readPlatformOperations(options: Options = {}) {
  const [catalogResult, operationsResult] = await Promise.allSettled([
    request("/v1/platform-operations/catalog", { method: "GET" }, options).then(assertPlatformOperationCatalog),
    request("/v1/platform-operations?limit=200", { method: "GET" }, options).then(assertPlatformOperationList),
  ]);
  if (catalogResult.status === "rejected" && operationsResult.status === "rejected") throw catalogResult.reason;
  const failure = catalogResult.status === "rejected" ? catalogResult.reason : operationsResult.status === "rejected" ? operationsResult.reason : null;
  return {
    catalog: catalogResult.status === "fulfilled" ? catalogResult.value : null,
    error: failure instanceof PlatformOperationOosError ? { code: failure.code, message: failure.message } : failure ? { code: "platform_operation_projection_partial", message: "Part of the Platform operation projection is unavailable." } : null,
    operations: operationsResult.status === "fulfilled" ? operationsResult.value : [],
    status: failure ? "partial" as const : "current" as const,
  };
}

export async function readPlatformOperation(operationId: string, options: Options = {}) {
  const operation = assertPlatformOperationRecord(await request(`/v1/platform-operations/${encodeURIComponent(operationId)}`, { method: "GET" }, options));
  if (operation.operation_id !== operationId) throw new PlatformOperationOosError("The Platform owner returned another retained operation.", "platform_operation_target_mismatch", 502);
  return operation;
}

export async function submitPlatformOperation(value: unknown, options: Options = {}) {
  const intent = assertBrowserIntent(value);
  const config = options.config ?? resolveConfig();
  const catalog = assertPlatformOperationCatalog(await request("/v1/platform-operations/catalog", { method: "GET" }, { ...options, config }));
  const { capability, subject } = selectCapability(catalog.subjects, intent.subjectRef, intent.capabilityId);
  if (catalog.freshness !== "current" || !capability.available || !capability.approval_required) {
    throw new PlatformOperationOosError(capability.unavailable_reason ?? "The current Platform capability is not executable.", "platform_operation_capability_unavailable", 409);
  }
  const now = intent.requestedAt ?? (options.now?.() ?? new Date()).toISOString();
  const nonce = intent.requestId || (options.randomId ?? randomUUID)();
  const commandId = boundedId(`console-command:${nonce}`);
  const commandIntent = {
    schema_version: 1,
    command_id: commandId,
    idempotency_key: boundedId(`console-idempotency:${nonce}`),
    correlation_id: boundedId(`console-correlation:${nonce}`),
    causation_id: null,
    actor_ref: config.operatorId,
    subject: { kind: subject.kind, ref: subject.ref, expected_source_version: subject.source_version },
    capability_id: capability.capability_id,
    action: capability.action,
    input: intent.input,
    requested_at: now,
  };
  const intentDigest = canonicalDigest(commandIntent);
  const operation = assertPlatformOperationRecord(await request("/v1/platform-operations/commands", {
    body: JSON.stringify({
      command: {
        ...commandIntent,
        intent_digest: intentDigest,
        approval: {
          decision: "approved",
          operator_id: config.operatorId,
          decision_ref: boundedId(`console-approval:${nonce}`),
          decided_at: now,
          intent_digest: intentDigest,
        },
      },
    }),
    method: "POST",
  }, { ...options, config }));
  if (operation.command.command_id !== commandIntent.command_id || operation.command.idempotency_key !== commandIntent.idempotency_key || operation.command.intent_digest !== intentDigest || operation.command.actor_ref !== config.operatorId || operation.command.capability_id !== capability.capability_id || operation.command.action !== capability.action || operation.command.subject.kind !== subject.kind || operation.command.subject.ref !== subject.ref || operation.command.subject.expected_source_version !== subject.source_version) {
    throw new PlatformOperationOosError("OOS returned another Platform operation command binding.", "platform_operation_command_binding_invalid", 502);
  }
  return operation;
}

export async function controlPlatformOperation(operationId: string, value: unknown, options: Options = {}) {
  const intent = assertControlIntent(value);
  const config = options.config ?? resolveConfig();
  const now = (options.now?.() ?? new Date()).toISOString();
  const nonce = intent.requestId || (options.randomId ?? randomUUID)();
  const control = {
      schema_version: 1,
      control_id: boundedId(`console-control:${nonce}`),
      idempotency_key: boundedId(`console-control-idempotency:${nonce}`),
      action: intent.action,
      operator_id: config.operatorId,
      reason: intent.reason,
      requested_at: now,
  };
  const operation = assertPlatformOperationRecord(await request(`/v1/platform-operations/${encodeURIComponent(operationId)}/controls`, {
    body: JSON.stringify({ control }),
    method: "POST",
  }, { ...options, config }));
  const retained = operation.controls.find((candidate) => candidate.control_id === control.control_id);
  if (!retained || retained.action !== control.action || retained.idempotency_key !== control.idempotency_key) throw new PlatformOperationOosError("OOS did not retain the exact Platform operation control binding.", "platform_operation_control_binding_invalid", 502);
  return operation;
}

function resolveConfig() {
  try { return resolveConsoleOosOperatorConfiguration(); }
  catch (error) {
    throw new PlatformOperationOosError("Platform operations are unavailable until the Console OOS integration is configured.", error instanceof ConsoleRuntimeConfigurationError ? error.code : "platform_operation_configuration_invalid", 503);
  }
}

async function request(path: string, init: RequestInit, options: Options) {
  const config = options.config ?? resolveConfig();
  let response: Response;
  try {
    response = await (options.fetchImpl ?? fetch)(`${config.baseUrl}${path}`, {
      ...init,
      cache: "no-store",
      redirect: "error",
      headers: {
        ...Object.fromEntries(new Headers(init.headers).entries()),
        ...consoleMutationAttributionHeaders(),
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-oos-caller-id": config.callerId,
        "x-oos-caller-secret": config.callerSecret,
        "x-oos-operator-id": config.operatorId,
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new PlatformOperationOosError("Platform operations could not reach OOS.", "platform_operation_oos_unavailable", 502, true);
  }
  const raw = await response.text();
  if (Buffer.byteLength(raw) > maxResponseBytes) throw new PlatformOperationOosError("Platform operation response exceeded the Console limit.", "platform_operation_response_large", 502);
  let body: unknown;
  try { body = raw ? JSON.parse(raw) : null; }
  catch { throw new PlatformOperationOosError("Platform operations received an invalid OOS response.", "platform_operation_projection_invalid", 502); }
  if (!response.ok) {
    const source = isRecord(body) ? body : {};
    const code = isIdentifier(source.code)
      ? source.code
      : isIdentifier(source.error)
        ? source.error
        : response.status === 409
          ? "platform_operation_conflict"
          : "platform_operation_oos_rejected";
    const message = isText(source.message)
      ? source.message
      : "OOS rejected the Platform operation request.";
    throw new PlatformOperationOosError(message, code, response.status, source.retryable === true || response.status >= 500);
  }
  verifySourceOperationEvidence(body);
  return body;
}

function verifySourceOperationEvidence(body: unknown) {
  const candidates = isRecord(body) && body.workflow_id === "platform-operation-list" && Array.isArray(body.operations) ? body.operations : [body];
  for (const value of candidates) {
    if (!isRecord(value) || value.workflow_id !== "platform-operation" || !isRecord(value.command) || !String(value.command.action).startsWith("agent-source.")) continue;
    const command = value.command, { approval: _approval, intent_digest: claimed, ...intent } = command;
    if (canonicalDigest(intent) !== claimed) throw new PlatformOperationOosError("Source command intent digest does not verify.", "source_authorization_binding_invalid", 502);
    const provider = isRecord(value.provider_operation) ? value.provider_operation : {};
    const receipt = isRecord(provider.receipt) ? provider.receipt : {};
    if (receipt.source_credential) {
      const source = assertSourceCredentialReceipt(receipt.source_credential), { receipt_digest: digest, ...subject } = source;
      const input = isRecord(command.input) ? command.input : {};
      if (canonicalDigest(subject) !== digest || canonicalDigest(sourceIntentFromReceipt(source)) !== source.source_intent_digest || canonicalDigest(input.source_intent) !== source.source_intent_digest) throw new PlatformOperationOosError("Source credential receipt does not bind its exact approved intent.", "source_authorization_receipt_invalid", 502);
    }
  }
}

function selectCapability(subjects: readonly PlatformOperationSubject[], subjectRef: string, capabilityId: string): { subject: PlatformOperationSubject; capability: PlatformOperationCapability } {
  const matches = subjects.flatMap((subject) => subject.ref === subjectRef ? subject.capabilities.filter((capability) => capability.capability_id === capabilityId).map((capability) => ({ subject, capability })) : []);
  if (matches.length !== 1) throw new PlatformOperationOosError("The reviewed Platform capability is no longer present in current owner truth.", "platform_operation_capability_stale", 409);
  return matches[0];
}

function assertBrowserIntent(value: unknown): { capabilityId: string; input: Record<string, unknown>; requestId: string; subjectRef: string; requestedAt?: string } {
  if (!isRecord(value) || !isText(value.capabilityId) || !isText(value.subjectRef) || !isText(value.requestId) || !isRecord(value.input) || JSON.stringify(value.input).length > 32_768) throw new PlatformOperationOosError("Platform operation intent is invalid.", "platform_operation_intent_invalid", 400);
  if (value.requestedAt !== undefined && (typeof value.requestedAt !== "string" || !Number.isFinite(Date.parse(value.requestedAt)))) throw new PlatformOperationOosError("Platform operation request time is invalid.", "platform_operation_intent_invalid", 400);
  return value as { capabilityId: string; input: Record<string, unknown>; requestId: string; subjectRef: string; requestedAt?: string };
}
function assertControlIntent(value: unknown): { action: "cancel" | "retry"; reason: string; requestId: string } {
  if (!isRecord(value) || !new Set(["cancel", "retry"]).has(String(value.action)) || !isText(value.reason) || !isText(value.requestId)) throw new PlatformOperationOosError("Platform operation control is invalid.", "platform_operation_control_invalid", 400);
  return value as { action: "cancel" | "retry"; reason: string; requestId: string };
}
function boundedId(value: string) { return value.replace(/[^A-Za-z0-9._:/@+-]/g, "-").slice(0, 256); }
function canonicalDigest(value: unknown) { return `sha256:${createHash("sha256").update(canonicalStringify(value)).digest("hex")}`; }
function canonicalStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${canonicalStringify((value as Record<string, unknown>)[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function isText(value: unknown): value is string { return typeof value === "string" && Boolean(value.trim()) && value.length <= 1024; }
function isIdentifier(value: unknown): value is string { return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/.test(value); }

export { request as platformOwnerRequest, canonicalDigest as platformCanonicalDigest };
