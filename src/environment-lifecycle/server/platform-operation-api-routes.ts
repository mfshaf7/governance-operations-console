import { NextRequest, NextResponse } from "next/server";

import { consoleOosModeSelected } from "../../console-integration/configuration/console-runtime-configuration.ts";
import {
  controlPlatformOperation,
  PlatformOperationOosError,
  readPlatformOperation,
  readPlatformOperations,
  submitPlatformOperation,
} from "./platform-operation-oos-client.ts";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function listPlatformOperationsRoute() {
  if (!consoleOosModeSelected()) return NextResponse.json({ catalog: null, error: null, mode: "disconnected-preview", observedAt: new Date().toISOString(), operations: [], status: "current" }, { headers: noStoreHeaders });
  try {
    const result = await readPlatformOperations();
    return NextResponse.json({ ...result, mode: "live", observedAt: new Date().toISOString() }, { headers: noStoreHeaders });
  } catch (error) { return errorResponse(error); }
}

export async function submitPlatformOperationRoute(request: NextRequest) {
  try { return NextResponse.json(await submitPlatformOperation(await request.json().catch(() => null)), { headers: noStoreHeaders, status: 202 }); }
  catch (error) { return errorResponse(error); }
}

export async function readPlatformOperationRoute(operationId: string) {
  try { return NextResponse.json(await readPlatformOperation(operationId), { headers: noStoreHeaders }); }
  catch (error) { return errorResponse(error); }
}

export async function controlPlatformOperationRoute(request: NextRequest, operationId: string) {
  try { return NextResponse.json(await controlPlatformOperation(operationId, await request.json().catch(() => null)), { headers: noStoreHeaders }); }
  catch (error) { return errorResponse(error); }
}

function errorResponse(error: unknown) {
  const known = error instanceof PlatformOperationOosError;
  return NextResponse.json({ code: known ? error.code : "platform_operation_adapter_failed", error: known ? error.message : "Platform operations are unavailable.", mode: "live", status: "offline" }, { headers: noStoreHeaders, status: known ? error.status : 502 });
}
