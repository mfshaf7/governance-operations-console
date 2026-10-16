import { NextRequest, NextResponse } from "next/server";
import { assertDeliverySourceRealizationInput } from "../live-runtime/delivery-source-realization-live-contract.ts";
import { commandDeliverySourceRealization, readDeliverySourceRealization } from "./delivery-source-realization-oos-client.ts";
import { deliveryOosConfigured, DeliveryOosError } from "./delivery-oos-client.ts";
import type { DeliverySourceRealizationAction } from "../live-runtime/delivery-source-realization-live-types.ts";

const headers = { "Cache-Control": "no-store" };

export async function readDeliverySourceRealizationRoute(workItemId: string) {
  try {
    if (!deliveryOosConfigured()) return NextResponse.json({ mode: "disconnected-preview", projection: null, error: null }, { headers });
    const projection = await readDeliverySourceRealization(target(workItemId));
    return NextResponse.json({ mode: "live", projection, error: null }, { headers });
  } catch (error) { return errorResponse(error); }
}

export async function commandDeliverySourceRealizationRoute(request: NextRequest, workItemId: string, action: DeliverySourceRealizationAction) {
  try {
    if (!deliveryOosConfigured()) throw new DeliveryOosError("Source realization is unavailable in disconnected preview.", "delivery_source_realization_live_mode_required", 503);
    const input = assertDeliverySourceRealizationInput(await request.json());
    if (input.action !== action) throw new Error("Source realization action does not match its route.");
    const projection = await commandDeliverySourceRealization(target(workItemId), input);
    return NextResponse.json({ mode: "live", projection, error: null }, { headers });
  } catch (error) { return errorResponse(error); }
}

function target(value: string) {
  if (!/^[1-9][0-9]*$/.test(value)) throw new Error("Invalid source realization work item.");
  return Number(value);
}

function errorResponse(error: unknown) {
  return NextResponse.json({
    mode: "live", projection: null,
    code: error instanceof DeliveryOosError ? error.code : "delivery_source_realization_invalid",
    error: error instanceof DeliveryOosError && error.status < 500 ? error.message : "Source realization is unavailable or the reviewed request is invalid. Refresh authoritative state before retrying.",
  }, { headers, status: error instanceof DeliveryOosError ? error.status : 400 });
}
