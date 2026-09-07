import { NextRequest, NextResponse } from "next/server";

import {
  assertPrototypeLandingId,
  assertPrototypeLandingRequestId,
  PrototypeLandingContractError,
} from "../live-runtime/prototype-landing-live-contract.ts";
import {
  cancelPrototypeLanding,
  continuePrototypeLanding,
  preparePrototypeLanding,
  prototypeLandingOosConfigured,
  PrototypeLandingOosError,
  readPrototypeLanding,
  submitPrototypeLanding,
} from "./prototype-landing-oos-client.ts";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function preparePrototypeLandingRoute(request: NextRequest) {
  return execute(async () => {
    requireConfigured();
    const input = parseRecord(await request.json().catch(() => null));
    return preparePrototypeLanding(assertPrototypeLandingId(input.prototype_id));
  });
}

export async function submitPrototypeLandingRoute(request: NextRequest) {
  return execute(async () => {
    requireConfigured();
    return submitPrototypeLanding(await request.json().catch(() => null));
  }, 202);
}

export async function readPrototypeLandingRoute(requestId: string) {
  return execute(async () => {
    requireConfigured();
    return readPrototypeLanding(assertPrototypeLandingRequestId(requestId));
  });
}

export async function continuePrototypeLandingRoute(requestId: string) {
  return execute(async () => {
    requireConfigured();
    return continuePrototypeLanding(assertPrototypeLandingRequestId(requestId));
  });
}

export async function cancelPrototypeLandingRoute(requestId: string) {
  return execute(async () => {
    requireConfigured();
    return cancelPrototypeLanding(assertPrototypeLandingRequestId(requestId));
  });
}

async function execute(operation: () => Promise<unknown>, successStatus = 200) {
  try {
    return NextResponse.json(await operation(), {
      headers: noStoreHeaders,
      status: successStatus,
    });
  } catch (error) {
    const known =
      error instanceof PrototypeLandingOosError ||
      error instanceof PrototypeLandingContractError;
    return NextResponse.json(
      {
        code: known ? error.code : "prototype_landing_adapter_failed",
        error:
          error instanceof Error
            ? error.message
            : "Prototype Landing adapter failed.",
        retryable: error instanceof PrototypeLandingOosError && error.retryable,
      },
      {
        headers: noStoreHeaders,
        status:
          error instanceof PrototypeLandingOosError
            ? error.status
            : error instanceof PrototypeLandingContractError
              ? 400
              : 502,
      },
    );
  }
}

function requireConfigured() {
  if (!prototypeLandingOosConfigured()) {
    throw new PrototypeLandingOosError(
      "Prototype Landing is running as a disconnected local preview.",
      "prototype_landing_live_mode_required",
      503,
    );
  }
}

function parseRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new PrototypeLandingContractError(
      "Prototype Landing input is invalid.",
    );
  }
  return value as Record<string, unknown>;
}
