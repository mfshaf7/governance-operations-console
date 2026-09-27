import { createHash } from "node:crypto";

import {
  consoleOosModeSelected,
  resolveConsoleOosOperatorConfiguration,
  type ConsoleOosOperatorConfiguration,
  ConsoleRuntimeConfigurationError,
} from "../../../console-integration/configuration/console-runtime-configuration.ts";
import { consoleMutationAttributionHeaders } from "../../../console-integration/identity/server/console-session-authorization.ts";
import {
  acceptCurrentConsoleSourceProjection,
  consoleSourceProjectionHeaders,
  ConsoleSourceAuthorityError,
  type ConsoleSourceAuthorityExpectation,
} from "../../../console-integration/source-authority/console-source-authority.ts";

const deliveryOosTimeoutMs = 12_000;

export type DeliveryOosConfig = ConsoleOosOperatorConfiguration;

export class DeliveryOosError extends Error {
  readonly code: string;
  readonly details: unknown;
  readonly nextAction: Record<string, unknown> | null;
  readonly retryable: boolean;
  readonly status: number;

  constructor(
    message: string,
    code: string,
    status: number,
    options: {
      details?: unknown;
      nextAction?: Record<string, unknown> | null;
      retryable?: boolean;
    } = {},
  ) {
    super(message);
    this.code = code;
    this.details = options.details;
    this.nextAction = options.nextAction ?? null;
    this.retryable = options.retryable ?? false;
    this.status = status;
  }
}

export function deliveryOosConfigured(env: NodeJS.ProcessEnv = process.env) {
  return consoleOosModeSelected(env);
}

export function resolveDeliveryOosConfig(
  env: NodeJS.ProcessEnv = process.env,
): DeliveryOosConfig {
  try {
    return resolveConsoleOosOperatorConfiguration(env);
  } catch (error) {
    const invalidUrl =
      error instanceof ConsoleRuntimeConfigurationError &&
      error.code === "console_oos_url_invalid";
    throw new DeliveryOosError(
      error instanceof Error
        ? error.message
        : "Delivery live integration configuration is invalid.",
      invalidUrl ? "delivery_oos_url_invalid" : "delivery_oos_not_configured",
      503,
    );
  }
}

export function deliveryOosOperator(config: DeliveryOosConfig) {
  return {
    ...(config.operatorHandle ? { handle: config.operatorHandle } : {}),
    id: config.operatorId,
  };
}

export async function deliveryOosRequest(
  config: DeliveryOosConfig,
  path: string,
  init: RequestInit,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = deliveryOosTimeoutMs,
  sourceExpectation?: ConsoleSourceAuthorityExpectation,
) {
  let response: Response;
  try {
    response = await fetchImpl(`${config.baseUrl}${path}`, {
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
  } catch (error) {
    throw new DeliveryOosError(
      error instanceof Error ? error.message : "OOS request failed.",
      "delivery_oos_unavailable",
      502,
    );
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      isRecord(body) && typeof body.message === "string"
        ? body.message
        : isRecord(body) && typeof body.error === "string"
          ? body.error
          : response.statusText || "OOS rejected the Delivery request.";
    const code =
      isRecord(body) && typeof body.code === "string"
        ? body.code
        : "delivery_oos_rejected";
    throw new DeliveryOosError(message, code, response.status, {
      details: isRecord(body) ? body.details : undefined,
      nextAction:
        isRecord(body) && isRecord(body.next_action)
          ? body.next_action
          : null,
      retryable:
        isRecord(body) && typeof body.retryable === "boolean"
          ? body.retryable
          : false,
    });
  }
  if (!sourceExpectation) return body;
  try {
    return acceptCurrentConsoleSourceProjection(body, sourceExpectation);
  } catch (error) {
    if (error instanceof ConsoleSourceAuthorityError) {
      throw new DeliveryOosError(error.message, error.code, 502);
    }
    throw error;
  }
}

export function canonicalDigest(value: unknown) {
  return `sha256:${createHash("sha256").update(canonicalStringify(value)).digest("hex")}`;
}

export function stableDigestId(prefix: string, value: unknown) {
  return `${prefix}:${canonicalDigest(value).slice("sha256:".length, 40)}`;
}

function canonicalStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const item = value as Record<string, unknown>;
    return `{${Object.keys(item)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalStringify(item[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
