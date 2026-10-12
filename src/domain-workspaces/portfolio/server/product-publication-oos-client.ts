import { createHash } from "node:crypto";

import {
  consoleProductPublicationModeSelected,
  ConsoleRuntimeConfigurationError,
  resolveConsoleProductPublicationConfiguration,
  type ConsoleProductPublicationConfiguration,
} from "../../../console-integration/configuration/console-runtime-configuration.ts";
import { consoleMutationAttributionHeaders } from "../../../console-integration/identity/server/console-session-authorization.ts";
import {
  assertGovernedProductPublicationIntent,
  assertGovernedProductPublicationResult,
  ProductPublicationLiveContractError,
} from "../live-runtime/product-publication-live-contract.ts";
import type {
  GovernedProductPublicationIntent,
  GovernedProductPublicationResult,
} from "../live-runtime/product-publication-live-types.ts";

const maxResponseBytes = 2_097_152;
const timeoutMs = 15_000;

type RequestOptions = Readonly<{
  attributionHeaders?: Readonly<Record<string, string>>;
  config?: ConsoleProductPublicationConfiguration;
  fetchImpl?: typeof fetch;
}>;

export class ProductPublicationOosError extends Error {
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

export function productPublicationOosConfigured(
  env: NodeJS.ProcessEnv = process.env,
) {
  return consoleProductPublicationModeSelected(env);
}

export async function submitGovernedProductPublication(
  value: unknown,
  options: RequestOptions = {},
): Promise<GovernedProductPublicationResult> {
  const intent = assertGovernedProductPublicationIntent(value);
  const config = options.config ?? resolveConfiguration();
  const attribution = options.attributionHeaders ?? consoleMutationAttributionHeaders();
  const sessionRef = attribution["x-console-session-ref"];
  const correlationId = attribution["x-console-correlation-id"];
  if (!sessionRef?.startsWith("platform-session://") || !correlationId) {
    throw new ProductPublicationOosError(
      "Product Publication requires an exact verified Console session and correlation binding.",
      "product_publication_session_binding_required",
      401,
    );
  }
  const command = buildProductPublicationCommand({
    config,
    correlationId,
    intent,
    sessionRef,
  });
  const result = await request(
    config,
    "/v1/product-publications",
    {
      body: JSON.stringify(command),
      method: "POST",
    },
    attribution,
    options.fetchImpl ?? fetch,
  );
  return assertServerResult(result, command, intent.request_id);
}

export async function readGovernedProductPublication(
  requestId: string,
  options: RequestOptions = {},
): Promise<GovernedProductPublicationResult> {
  if (!/^product-publication-request:[a-z0-9][a-z0-9._:-]*$/.test(requestId)) {
    throw new ProductPublicationOosError(
      "Product Publication request identity is invalid.",
      "product_publication_request_identity_invalid",
      400,
    );
  }
  const config = options.config ?? resolveConfiguration();
  const attribution = options.attributionHeaders ?? consoleMutationAttributionHeaders();
  return assertServerResult(
    await request(
      config,
      `/v1/product-publications/${encodeURIComponent(requestId)}`,
      { method: "GET" },
      attribution,
      options.fetchImpl ?? fetch,
    ),
    null,
    requestId,
  );
}

export function buildProductPublicationCommand({
  config,
  correlationId,
  intent,
  sessionRef,
}: {
  config: ConsoleProductPublicationConfiguration;
  correlationId: string;
  intent: GovernedProductPublicationIntent;
  sessionRef: string;
}) {
  return {
    schema_version: intent.schema_version,
    artifact_type: "product-publication-command",
    request_id: intent.request_id,
    idempotency_key: intent.idempotency_key,
    session_ref: sessionRef,
    execution_ref: `console-correlation://${correlationId}`,
    authority_revision: config.authorityRevision,
    manifest_source: structuredClone(intent.manifest_source),
    action: intent.action,
    expected_publication_version: intent.expected_publication_version,
    current_publication_posture: intent.current_publication_posture,
    target_publication: structuredClone(intent.target_publication),
    previous_receipt: structuredClone(intent.previous_receipt),
    operator_id: config.operatorId,
    operator_decision: {
      decision: "approve",
      reason: intent.operator_reason,
      decided_at: intent.decided_at,
    },
    security_decision: structuredClone(config.securityDecision),
    requested_at: intent.requested_at,
  };
}

function resolveConfiguration() {
  try {
    return resolveConsoleProductPublicationConfiguration();
  } catch (error) {
    throw new ProductPublicationOosError(
      error instanceof Error
        ? error.message
        : "Product Publication configuration is invalid.",
      error instanceof ConsoleRuntimeConfigurationError
        ? error.code
        : "product_publication_configuration_invalid",
      503,
    );
  }
}

async function request(
  config: ConsoleProductPublicationConfiguration,
  path: string,
  init: RequestInit,
  attribution: Readonly<Record<string, string>>,
  fetchImpl: typeof fetch,
) {
  let response: Response;
  try {
    response = await fetchImpl(`${config.baseUrl}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        ...attribution,
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-oos-caller-id": config.callerId,
        "x-oos-caller-secret": config.callerSecret,
        "x-oos-operator-id": config.operatorId,
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new ProductPublicationOosError(
      error instanceof Error ? error.message : "OOS Product Publication is unavailable.",
      "product_publication_oos_unavailable",
      502,
      true,
    );
  }
  const raw = await response.text();
  if (new TextEncoder().encode(raw).byteLength > maxResponseBytes) {
    throw new ProductPublicationOosError(
      "OOS Product Publication returned an oversized response.",
      "product_publication_response_oversized",
      502,
    );
  }
  let body: unknown = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    throw new ProductPublicationOosError(
      "OOS Product Publication returned malformed JSON.",
      "product_publication_response_invalid",
      502,
    );
  }
  if (!response.ok) {
    const error = isRecord(body) ? body : {};
    throw new ProductPublicationOosError(
      typeof error.error === "string"
        ? error.error
        : "OOS rejected the Product Publication request.",
      typeof error.code === "string"
        ? error.code
        : "product_publication_oos_rejected",
      response.status,
      response.status >= 500,
    );
  }
  return body;
}

function assertServerResult(
  value: unknown,
  command: Readonly<Record<string, unknown>> | null,
  expectedRequestId: string,
) {
  let result: GovernedProductPublicationResult;
  try {
    result = assertGovernedProductPublicationResult(value);
  } catch (error) {
    throw new ProductPublicationOosError(
      error instanceof ProductPublicationLiveContractError
        ? error.message
        : "OOS Product Publication evidence is invalid.",
      "product_publication_projection_invalid",
      502,
    );
  }
  if (result.request_id !== expectedRequestId) {
    throw new ProductPublicationOosError(
      "OOS Product Publication returned a different request identity.",
      "product_publication_request_binding_mismatch",
      502,
    );
  }
  if (command && canonicalJson(result.command) !== canonicalJson(command)) {
    throw new ProductPublicationOosError(
      "OOS Product Publication returned a command that differs from the reviewed intent.",
      "product_publication_command_binding_mismatch",
      502,
    );
  }
  if (sha256(result.command) !== result.command_digest) {
    throw new ProductPublicationOosError(
      "OOS Product Publication command digest does not match the returned command.",
      "product_publication_command_digest_mismatch",
      502,
    );
  }
  if (sha256(result.receipt) !== result.receipt_digest) {
    throw new ProductPublicationOosError(
      "OOS Product Publication receipt digest does not match the terminal receipt.",
      "product_publication_receipt_digest_mismatch",
      502,
    );
  }
  return result;
}

function sha256(value: unknown) {
  return `sha256:${createHash("sha256").update(canonicalJson(value)).digest("hex")}`;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" && Number.isSafeInteger(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort(compareKeys).map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  throw new ProductPublicationOosError(
    "Product Publication evidence cannot be canonicalized losslessly.",
    "product_publication_projection_invalid",
    502,
  );
}

function compareKeys(left: string, right: string) {
  const a = Array.from(left, (character) => character.codePointAt(0) ?? 0);
  const b = Array.from(right, (character) => character.codePointAt(0) ?? 0);
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return a.length - b.length;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
