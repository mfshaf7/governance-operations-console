import { createHash } from "node:crypto";

const deliveryOosTimeoutMs = 12_000;

export type DeliveryOosConfig = {
  baseUrl: string;
  callerId: string;
  callerSecret: string;
  operatorHandle?: string;
  operatorId: string;
};

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
  return Boolean(env.OOS_BASE_URL?.trim());
}

export function resolveDeliveryOosConfig(
  env: NodeJS.ProcessEnv = process.env,
): DeliveryOosConfig {
  const baseUrl = env.OOS_BASE_URL?.trim();
  const callerSecret = env.OOS_CALLER_SECRET?.trim();
  const operatorId = env.GOVERNANCE_CONSOLE_OPERATOR_ID?.trim();
  if (!baseUrl || !callerSecret || !operatorId) {
    throw new DeliveryOosError(
      "Delivery live integration is missing its OOS endpoint, caller secret, or operator identity.",
      "delivery_oos_not_configured",
      503,
    );
  }
  const parsed = new URL(baseUrl);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new DeliveryOosError(
      "Delivery OOS endpoint must use HTTP or HTTPS.",
      "delivery_oos_url_invalid",
      503,
    );
  }
  return {
    baseUrl: parsed.toString().replace(/\/$/, ""),
    callerId: env.OOS_CALLER_ID?.trim() || "governance-operations-console",
    callerSecret,
    operatorHandle: env.GOVERNANCE_CONSOLE_OPERATOR_HANDLE?.trim() || undefined,
    operatorId,
  };
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
) {
  let response: Response;
  try {
    response = await fetchImpl(`${config.baseUrl}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        ...Object.fromEntries(new Headers(init.headers).entries()),
        Accept: "application/json",
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
  return body;
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
