import { NextRequest, NextResponse } from "next/server";
import { consoleOosModeSelected } from "../../console-integration/configuration/console-runtime-configuration.ts";
import { PlatformOperationOosError } from "./platform-operation-oos-client.ts";
import { listProfileRequests, readOwnerProfiles, readProfileRequest, submitProfileRequest } from "./dev-integration-oos-client.ts";
const headers = { "Cache-Control": "no-store" };
function errorResponse(error: unknown) {
  const known = error instanceof PlatformOperationOosError;
  return NextResponse.json({ mode: "live", status: "offline", error: known ? error.message : "The profile workflow is unavailable.",
    code: known ? error.code : "dev_integration_unavailable" }, { headers, status: known ? error.status : 502 });
}
export async function profilesRoute(request: NextRequest) {
  if (!consoleOosModeSelected()) return NextResponse.json({ mode: "disconnected-preview", projection: null }, { headers });
  try { return NextResponse.json({ mode: "live", projection: await readOwnerProfiles(request.nextUrl.searchParams) }, { headers }); }
  catch (error) { return errorResponse(error); }
}
export async function requestsRoute(request: NextRequest) {
  try {
    if (request.method === "POST") return NextResponse.json(await submitProfileRequest(await request.json().catch(() => null)), { headers, status: 201 });
    return NextResponse.json(await listProfileRequests(request.nextUrl.searchParams), { headers });
  } catch (error) { return errorResponse(error); }
}
export async function originalRequestRoute(requestId: string) {
  try { return NextResponse.json(await readProfileRequest(requestId), { headers }); }
  catch (error) { return errorResponse(error); }
}
