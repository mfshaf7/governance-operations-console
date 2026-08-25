import {
  assertPrototypeDeliveryApplicationResult,
  assertPrototypeDeliveryPacket,
  assertPrototypeDeliveryResultMatchesPacket,
} from "../live-runtime/prototype-delivery-live-contract.ts";
import type {
  PrototypeDeliveryApplicationRequest,
  PrototypeDeliveryApplicationResult,
} from "../live-runtime/prototype-delivery-live-types.ts";

const prototypeDeliveryOosTimeoutMs = 8_000;

type PrototypeDeliveryOosConfig = {
  baseUrl: string;
  callerId: string;
  callerSecret: string;
};

export class PrototypeDeliveryOosError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function prototypeDeliveryOosConfigured(
  env: NodeJS.ProcessEnv = process.env,
) {
  return Boolean(env.OOS_BASE_URL?.trim());
}

export async function applyPrototypeDeliveryApplication(
  request: PrototypeDeliveryApplicationRequest,
  {
    env = process.env,
    fetchImpl = fetch,
  }: { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch } = {},
): Promise<PrototypeDeliveryApplicationResult> {
  const config = resolvePrototypeDeliveryOosConfig(env);
  const packet = assertPrototypeDeliveryPacket(request.packet);
  const result = assertPrototypeDeliveryApplicationResult(
    await prototypeDeliveryOosRequest(
      config,
      "/v1/delivery-ingress/prototype/applications",
      {
        body: JSON.stringify({
          operator_decision: {
            decision: "apply",
            decision_ref: request.decisionRef,
            operator_id: config.callerId,
          },
          packet,
          schema_version: 1,
        }),
        method: "POST",
      },
      fetchImpl,
    ),
  );
  return assertPrototypeDeliveryResultMatchesPacket({ packet, result });
}

export async function readPrototypeDeliveryApplication(
  applicationId: string,
  {
    env = process.env,
    fetchImpl = fetch,
  }: { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch } = {},
): Promise<PrototypeDeliveryApplicationResult> {
  assertPrototypeDeliveryApplicationId(applicationId);
  const config = resolvePrototypeDeliveryOosConfig(env);
  return assertPrototypeDeliveryApplicationResult(
    await prototypeDeliveryOosRequest(
      config,
      `/v1/delivery-ingress/prototype/applications/${encodeURIComponent(applicationId)}`,
      { method: "GET" },
      fetchImpl,
    ),
  );
}

export function assertPrototypeDeliveryApplicationId(value: unknown) {
  if (
    typeof value !== "string" ||
    !/^prototype-delivery-application:[a-f0-9]{64}$/.test(value)
  ) {
    throw new PrototypeDeliveryOosError(
      "Prototype Delivery application identity is invalid.",
      "prototype_delivery_application_identity_invalid",
      400,
    );
  }
  return value;
}

function resolvePrototypeDeliveryOosConfig(
  env: NodeJS.ProcessEnv,
): PrototypeDeliveryOosConfig {
  const baseUrl = env.OOS_BASE_URL?.trim();
  const callerSecret = env.OOS_CALLER_SECRET?.trim();
  const callerId =
    env.OOS_CALLER_ID?.trim() || "governance-operations-console";
  if (!baseUrl || !callerSecret) {
    throw new PrototypeDeliveryOosError(
      "Prototype Delivery live integration is missing its OOS endpoint or caller secret.",
      "prototype_delivery_oos_not_configured",
      503,
    );
  }
  const parsed = new URL(baseUrl);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new PrototypeDeliveryOosError(
      "Prototype Delivery OOS endpoint must use HTTP or HTTPS.",
      "prototype_delivery_oos_url_invalid",
      503,
    );
  }
  return {
    baseUrl: parsed.toString().replace(/\/$/, ""),
    callerId,
    callerSecret,
  };
}

async function prototypeDeliveryOosRequest(
  config: PrototypeDeliveryOosConfig,
  path: string,
  init: RequestInit,
  fetchImpl: typeof fetch,
) {
  let response: Response;
  try {
    response = await fetchImpl(`${config.baseUrl}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-oos-caller-id": config.callerId,
        "x-oos-caller-secret": config.callerSecret,
      },
      signal: AbortSignal.timeout(prototypeDeliveryOosTimeoutMs),
    });
  } catch (error) {
    throw new PrototypeDeliveryOosError(
      error instanceof Error ? error.message : "OOS request failed.",
      "prototype_delivery_oos_unavailable",
      502,
    );
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      isRecord(body) && typeof body.error === "string"
        ? body.error
        : response.statusText || "OOS rejected the Prototype Delivery request.";
    const code =
      isRecord(body) && typeof body.code === "string"
        ? body.code
        : "prototype_delivery_oos_rejected";
    throw new PrototypeDeliveryOosError(message, code, response.status);
  }
  return body;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
