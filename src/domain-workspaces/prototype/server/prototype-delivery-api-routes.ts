import { NextRequest, NextResponse } from "next/server";

import { assertPrototypeDeliveryPacket } from "../live-runtime/prototype-delivery-live-contract.ts";
import type { PrototypeDeliveryApplicationRequest } from "../live-runtime/prototype-delivery-live-types.ts";
import {
  applyPrototypeDeliveryApplication,
  assertPrototypeDeliveryApplicationId,
  PrototypeDeliveryOosError,
  readPrototypeDeliveryApplication,
} from "./prototype-delivery-oos-client.ts";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function applyPrototypeDeliveryApplicationRoute(
  request: NextRequest,
) {
  try {
    const body = assertApplicationRequest(
      await request.json().catch(() => null),
    );
    const result = await applyPrototypeDeliveryApplication(body);
    return NextResponse.json(result, {
      headers: noStoreHeaders,
      status: result.resolution === "reused" ? 200 : 201,
    });
  } catch (error) {
    return prototypeDeliveryErrorResponse(error);
  }
}

export async function readPrototypeDeliveryApplicationRoute(
  applicationId: string,
) {
  try {
    const result = await readPrototypeDeliveryApplication(
      assertPrototypeDeliveryApplicationId(applicationId),
    );
    return NextResponse.json(result, { headers: noStoreHeaders });
  } catch (error) {
    return prototypeDeliveryErrorResponse(error);
  }
}

function assertApplicationRequest(
  value: unknown,
): PrototypeDeliveryApplicationRequest {
  if (
    !isRecord(value) ||
    typeof value.decisionRef !== "string" ||
    !value.decisionRef.trim()
  ) {
    throw new PrototypeDeliveryOosError(
      "Prototype Delivery application requires an exact packet and decision reference.",
      "prototype_delivery_application_request_invalid",
      400,
    );
  }
  try {
    return {
      decisionRef: value.decisionRef,
      packet: assertPrototypeDeliveryPacket(value.packet),
    };
  } catch (error) {
    throw new PrototypeDeliveryOosError(
      error instanceof Error ? error.message : "Prototype Delivery packet is invalid.",
      "prototype_delivery_application_request_invalid",
      400,
    );
  }
}

function prototypeDeliveryErrorResponse(error: unknown) {
  const status = error instanceof PrototypeDeliveryOosError ? error.status : 502;
  const code =
    error instanceof PrototypeDeliveryOosError
      ? error.code
      : "prototype_delivery_adapter_failed";
  const message =
    error instanceof Error ? error.message : "Prototype Delivery adapter failed.";
  return NextResponse.json(
    { code, error: message, mode: "live", status: "offline" },
    { headers: noStoreHeaders, status },
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
