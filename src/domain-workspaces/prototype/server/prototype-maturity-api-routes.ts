import { NextRequest, NextResponse } from "next/server";

import {
  assertPrototypeMaturityId,
  assertPrototypeMaturityRequestId,
  assertPrototypeMaturityTransition,
  PrototypeMaturityContractError,
} from "../live-runtime/prototype-maturity-live-contract.ts";
import {
  cancelPrototypeMaturity,
  continuePrototypeMaturity,
  decidePrototypeMaturity,
  preparePrototypeMaturity,
  prototypeMaturityOosConfigured,
  PrototypeMaturityOosError,
  readPrototypeMaturity,
  submitPrototypeMaturity,
} from "./prototype-maturity-oos-client.ts";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function preparePrototypeMaturityRoute(request: NextRequest) {
  return execute(async () => {
    requireConfigured();
    const input = parseRecord(await request.json().catch(() => null));
    return preparePrototypeMaturity(
      assertPrototypeMaturityId(input.prototype_id),
      assertPrototypeMaturityTransition(input.transition),
    );
  });
}

export async function submitPrototypeMaturityRoute(request: NextRequest) {
  return execute(async () => {
    requireConfigured();
    return submitPrototypeMaturity(await request.json().catch(() => null));
  }, 202);
}

export async function readPrototypeMaturityRoute(requestId: string) {
  return execute(async () => {
    requireConfigured();
    return readPrototypeMaturity(assertPrototypeMaturityRequestId(requestId));
  });
}

export async function decidePrototypeMaturityRoute(
  request: NextRequest,
  requestId: string,
) {
  return execute(async () => {
    requireConfigured();
    return decidePrototypeMaturity(
      assertPrototypeMaturityRequestId(requestId),
      await request.json().catch(() => null),
    );
  });
}

export async function continuePrototypeMaturityRoute(requestId: string) {
  return execute(async () => {
    requireConfigured();
    return continuePrototypeMaturity(
      assertPrototypeMaturityRequestId(requestId),
    );
  });
}

export async function cancelPrototypeMaturityRoute(requestId: string) {
  return execute(async () => {
    requireConfigured();
    return cancelPrototypeMaturity(assertPrototypeMaturityRequestId(requestId));
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
      error instanceof PrototypeMaturityOosError ||
      error instanceof PrototypeMaturityContractError;
    return NextResponse.json(
      {
        code: known ? error.code : "prototype_maturity_adapter_failed",
        error:
          error instanceof Error
            ? error.message
            : "Prototype Maturity adapter failed.",
        retryable: error instanceof PrototypeMaturityOosError && error.retryable,
      },
      {
        headers: noStoreHeaders,
        status:
          error instanceof PrototypeMaturityOosError
            ? error.status
            : error instanceof PrototypeMaturityContractError
              ? 400
              : 502,
      },
    );
  }
}

function requireConfigured() {
  if (!prototypeMaturityOosConfigured()) {
    throw new PrototypeMaturityOosError(
      "Prototype Maturity is running as a disconnected local preview.",
      "prototype_maturity_live_mode_required",
      503,
    );
  }
}

function parseRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new PrototypeMaturityContractError(
      "Prototype Maturity input is invalid.",
    );
  }
  return value as Record<string, unknown>;
}
