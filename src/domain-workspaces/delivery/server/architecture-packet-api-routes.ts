import { NextRequest, NextResponse } from "next/server";

import {
  assertArchitecturePacketArtifact,
  assertArchitecturePacketDraftInput,
} from "../live-runtime/architecture-packet-live-contract.ts";
import {
  architecturePacketOosConfigured,
  draftArchitecturePacket,
  persistArchitecturePacket,
  readCurrentArchitecturePacket,
} from "./architecture-packet-oos-client.ts";
import { DeliveryOosError } from "./delivery-oos-client.ts";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function readCurrentArchitecturePacketRoute(
  deliveryIdInput: string,
) {
  try {
    const deliveryId = routeDeliveryId(deliveryIdInput);
    if (!architecturePacketOosConfigured()) {
      return snapshot(null, "disconnected-preview");
    }
    return snapshot(await readCurrentArchitecturePacket(deliveryId), "live");
  } catch (error) {
    return architecturePacketErrorResponse(error);
  }
}

export async function draftArchitecturePacketRoute(request: NextRequest) {
  try {
    requireLiveMode();
    const body = record(await request.json().catch(() => null));
    return snapshot(
      await draftArchitecturePacket(
        assertArchitecturePacketDraftInput(body.input),
      ),
      "live",
    );
  } catch (error) {
    return architecturePacketErrorResponse(error);
  }
}

export async function persistArchitecturePacketRoute(request: NextRequest) {
  try {
    requireLiveMode();
    const body = record(await request.json().catch(() => null));
    return snapshot(
      await persistArchitecturePacket(
        assertArchitecturePacketArtifact(body.artifact, {
          custodyState: "local-draft",
          decisionStatus: "architecture-ready",
          schemaVersion: 6,
        }),
      ),
      "live",
    );
  } catch (error) {
    return architecturePacketErrorResponse(error);
  }
}

function snapshot(
  result: unknown,
  mode: "disconnected-preview" | "live",
) {
  return NextResponse.json(
    {
      error: null,
      mode,
      observedAt: new Date().toISOString(),
      result,
      status: "current",
    },
    { headers: noStoreHeaders },
  );
}

function routeDeliveryId(value: string) {
  if (!/^delivery-[1-9][0-9]*$/.test(value)) {
    throw new DeliveryOosError(
      "Architecture Packet Delivery identity is invalid.",
      "delivery_architecture_packet_delivery_invalid",
      400,
    );
  }
  return value;
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new DeliveryOosError(
      "Architecture Packet request is invalid.",
      "delivery_architecture_packet_request_invalid",
      400,
    );
  }
  return value as Record<string, unknown>;
}

function requireLiveMode() {
  if (!architecturePacketOosConfigured()) {
    throw new DeliveryOosError(
      "Architecture Packet authoring is unavailable in disconnected preview mode.",
      "delivery_architecture_packet_live_mode_required",
      503,
    );
  }
}

function architecturePacketErrorResponse(error: unknown) {
  const status = error instanceof DeliveryOosError ? error.status : 400;
  const code =
    error instanceof DeliveryOosError
      ? error.code
      : "delivery_architecture_packet_request_invalid";
  const message =
    error instanceof Error ? error.message : "Architecture Packet request failed.";
  return NextResponse.json(
    { code, error: message, mode: "live", status: "offline" },
    { headers: noStoreHeaders, status },
  );
}
