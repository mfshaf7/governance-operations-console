import { NextResponse } from "next/server";

import { PrototypePreviewContractError } from "../live-runtime/prototype-preview-live-contract.ts";
import {
  commandPrototypePreviewOwner,
  provePrototypePreviewOwner,
  PrototypePreviewOwnerError,
  readPrototypePreviewOwner,
} from "./prototype-preview-owner-client.ts";

export async function readPrototypePreviewRoute(prototypeId: string) {
  return route(() => readPrototypePreviewOwner(prototypeId));
}

export async function provePrototypePreviewRoute(prototypeId: string) {
  return route(() => provePrototypePreviewOwner(prototypeId));
}

export async function commandPrototypePreviewRoute(
  request: Request,
  prototypeId: string,
) {
  return route(async () => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new PrototypePreviewOwnerError(
        "Preview Runtime command body is invalid.",
        "prototype_preview_command_invalid",
        400,
      );
    }
    return commandPrototypePreviewOwner(prototypeId, body);
  });
}

async function route(operation: () => Promise<unknown>) {
  try {
    return NextResponse.json(await operation(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const failure = normalize(error);
    return NextResponse.json(
      { code: failure.code, error: failure.message, retryable: failure.retryable },
      { status: failure.status, headers: { "Cache-Control": "no-store" } },
    );
  }
}

function normalize(error: unknown) {
  if (error instanceof PrototypePreviewOwnerError) return error;
  if (error instanceof PrototypePreviewContractError) {
    return new PrototypePreviewOwnerError(error.message, error.code, 422);
  }
  return new PrototypePreviewOwnerError(
    "Preview Runtime adapter failed.",
    "prototype_preview_adapter_failed",
    500,
    true,
  );
}
