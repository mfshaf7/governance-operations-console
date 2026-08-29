import { NextRequest, NextResponse } from "next/server";

import {
  assertDeliveryCloseoutCommandId,
  assertDeliveryCloseoutOperation,
  assertDeliveryCloseoutSourceRevision,
  deliveryCloseoutDeliveryId,
} from "../live-runtime/delivery-closeout-live-contract.ts";
import {
  deliveryCloseoutOosConfigured,
  readDeliveryCloseoutProjection,
  submitDeliveryCloseoutCommand,
} from "./delivery-closeout-oos-client.ts";
import { DeliveryOosError } from "./delivery-oos-client.ts";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function readDeliveryCloseoutRoute(deliveryIdInput: string) {
  try {
    const deliveryId = deliveryCloseoutDeliveryId(deliveryIdInput);
    if (!deliveryCloseoutOosConfigured()) {
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
    const projection = await readDeliveryCloseoutProjection(deliveryId);
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
    return deliveryCloseoutErrorResponse(error);
  }
}

export async function submitDeliveryCloseoutRoute(
  request: NextRequest,
  deliveryIdInput: string,
) {
  try {
    requireLiveMode();
    const deliveryId = deliveryCloseoutDeliveryId(deliveryIdInput);
    const body = record(await request.json().catch(() => null));
    const result = await submitDeliveryCloseoutCommand(deliveryId, {
      acceptanceNote: boundedNote(body.acceptanceNote),
      commandId: assertDeliveryCloseoutCommandId(body.commandId),
      expectedSourceRevision: assertDeliveryCloseoutSourceRevision(
        body.expectedSourceRevision,
      ),
      operation: assertDeliveryCloseoutOperation(body.operation),
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
    return deliveryCloseoutErrorResponse(error);
  }
}

function boundedNote(value: unknown) {
  if (typeof value !== "string" || !value.trim() || value.length > 4000) {
    invalid("Delivery closeout acceptance note is invalid.");
  }
  return value;
}

function deliveryCloseoutErrorResponse(error: unknown) {
  const oosError = error instanceof DeliveryOosError ? error : null;
  return NextResponse.json(
    {
      code: oosError?.code ?? "delivery_closeout_adapter_request_invalid",
      ...(oosError?.details === undefined ? {} : { details: oosError.details }),
      error:
        error instanceof Error
          ? error.message
          : "Delivery closeout adapter failed.",
      mode: "live",
      ...(oosError?.nextAction ? { nextAction: oosError.nextAction } : {}),
      retryable: oosError?.retryable ?? false,
      status: "offline",
    },
    { headers: noStoreHeaders, status: oosError?.status ?? 400 },
  );
}

function invalid(message: string): never {
  throw new DeliveryOosError(
    message,
    "delivery_closeout_adapter_request_invalid",
    400,
  );
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    invalid("Delivery closeout request is invalid.");
  }
  return value as Record<string, unknown>;
}

function requireLiveMode() {
  if (!deliveryCloseoutOosConfigured()) {
    throw new DeliveryOosError(
      "Delivery closeout mutation is unavailable in disconnected preview mode.",
      "delivery_closeout_live_mode_required",
      503,
    );
  }
}
