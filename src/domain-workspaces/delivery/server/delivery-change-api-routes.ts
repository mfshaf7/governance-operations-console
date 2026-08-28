import { NextRequest, NextResponse } from "next/server";

import {
  assertDeliveryChangeCommandId,
  assertDeliveryChangeOperation,
  assertDeliveryChangeSourceRevision,
  deliveryChangeDeliveryId,
} from "../live-runtime/delivery-change-live-contract.ts";
import {
  deliveryChangeOosConfigured,
  readDeliveryChangeProjection,
  submitDeliveryChangeCommand,
} from "./delivery-change-oos-client.ts";
import { DeliveryOosError } from "./delivery-oos-client.ts";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function readDeliveryChangeRoute(deliveryIdInput: string) {
  try {
    const deliveryId = deliveryChangeDeliveryId(deliveryIdInput);
    if (!deliveryChangeOosConfigured()) {
      return NextResponse.json(
        {
          error: null,
          mode: "disconnected-preview",
          observedAt: new Date().toISOString(),
          projection: null,
          status: "current",
        },
        { headers: noStoreHeaders },
      );
    }
    const projection = await readDeliveryChangeProjection(deliveryId);
    return NextResponse.json(
      {
        error: null,
        mode: "live",
        observedAt: new Date().toISOString(),
        projection,
        status: "current",
      },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    return deliveryChangeErrorResponse(error);
  }
}

export async function submitDeliveryChangeRoute(
  request: NextRequest,
  deliveryIdInput: string,
) {
  try {
    requireLiveMode();
    const deliveryId = deliveryChangeDeliveryId(deliveryIdInput);
    const body = record(await request.json().catch(() => null));
    const result = await submitDeliveryChangeCommand(deliveryId, {
      acceptanceNote: boundedNote(body.acceptanceNote),
      commandId: assertDeliveryChangeCommandId(body.commandId),
      expectedSourceRevision: assertDeliveryChangeSourceRevision(
        body.expectedSourceRevision,
      ),
      operation: assertDeliveryChangeOperation(body.operation),
    });
    return NextResponse.json(
      {
        error: null,
        mode: "live",
        observedAt: new Date().toISOString(),
        result,
        status: "current",
      },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    return deliveryChangeErrorResponse(error);
  }
}

function boundedNote(value: unknown) {
  if (typeof value !== "string" || value.length > 4000) {
    invalid("Delivery change acceptance note is invalid.");
  }
  return value;
}

function deliveryChangeErrorResponse(error: unknown) {
  const oosError = error instanceof DeliveryOosError ? error : null;
  return NextResponse.json(
    {
      code: oosError?.code ?? "delivery_change_adapter_request_invalid",
      ...(oosError?.details === undefined ? {} : { details: oosError.details }),
      error:
        error instanceof Error
          ? error.message
          : "Delivery change adapter failed.",
      mode: "live",
      ...(oosError?.nextAction
        ? { nextAction: oosError.nextAction }
        : {}),
      retryable: oosError?.retryable ?? false,
      status: "offline",
    },
    { headers: noStoreHeaders, status: oosError?.status ?? 400 },
  );
}

function invalid(message: string): never {
  throw new DeliveryOosError(
    message,
    "delivery_change_adapter_request_invalid",
    400,
  );
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    invalid("Delivery change request is invalid.");
  }
  return value as Record<string, unknown>;
}

function requireLiveMode() {
  if (!deliveryChangeOosConfigured()) {
    throw new DeliveryOosError(
      "Delivery change mutation is unavailable in disconnected preview mode.",
      "delivery_change_live_mode_required",
      503,
    );
  }
}
