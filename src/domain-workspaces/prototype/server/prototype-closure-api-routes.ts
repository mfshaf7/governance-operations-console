import { NextRequest, NextResponse } from "next/server";

import {
  assertPrototypeClosureId,
  assertPrototypeClosureRequestId,
  PrototypeClosureContractError,
} from "../live-runtime/prototype-closure-live-contract.ts";
import {
  cancelPrototypeClosure,
  continuePrototypeClosure,
  decidePrototypeClosure,
  preparePrototypeClosure,
  prototypeClosureOosConfigured,
  PrototypeClosureOosError,
  readPrototypeClosure,
  submitPrototypeClosure,
} from "./prototype-closure-oos-client.ts";

const noStoreHeaders = { "Cache-Control": "no-store" };

export function preparePrototypeClosureRoute(request: NextRequest) {
  return execute(async () => {
    const input = parseRecord(await request.json().catch(() => null));
    return preparePrototypeClosure(assertPrototypeClosureId(input.prototype_id));
  });
}

export function submitPrototypeClosureRoute(request: NextRequest) {
  return execute(() => submitPrototypeClosure(request.json().catch(() => null)), 202);
}

export function readPrototypeClosureRoute(requestId: string) {
  return execute(() => readPrototypeClosure(assertPrototypeClosureRequestId(requestId)));
}

export function decidePrototypeClosureRoute(request: NextRequest, requestId: string) {
  return execute(() => decidePrototypeClosure(assertPrototypeClosureRequestId(requestId),
    request.json().catch(() => null)));
}

export function continuePrototypeClosureRoute(requestId: string) {
  return execute(() => continuePrototypeClosure(assertPrototypeClosureRequestId(requestId)));
}

export function cancelPrototypeClosureRoute(requestId: string) {
  return execute(() => cancelPrototypeClosure(assertPrototypeClosureRequestId(requestId)));
}

async function execute(operation: () => Promise<unknown>, status = 200) {
  try {
    if (!prototypeClosureOosConfigured()) {
      throw new PrototypeClosureOosError("Prototype Closure is a disconnected local preview.",
        "prototype_closure_live_mode_required", 503);
    }
    return NextResponse.json(await operation(), { headers: noStoreHeaders, status });
  } catch (error) {
    const known = error instanceof PrototypeClosureOosError || error instanceof PrototypeClosureContractError;
    return NextResponse.json({
      code: known ? error.code : "prototype_closure_adapter_failed",
      error: error instanceof Error ? error.message : "Prototype Closure adapter failed.",
      retryable: error instanceof PrototypeClosureOosError && error.retryable,
    }, { headers: noStoreHeaders, status: error instanceof PrototypeClosureOosError ? error.status :
      error instanceof PrototypeClosureContractError ? 400 : 502 });
  }
}

function parseRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new PrototypeClosureContractError("Prototype Closure input is invalid.");
  }
  return value as Record<string, unknown>;
}
