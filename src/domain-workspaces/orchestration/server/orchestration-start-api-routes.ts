import { NextRequest, NextResponse } from "next/server";
import { ConsoleSourceAuthorityError } from "../../../console-integration/source-authority/console-source-authority.ts";
import { OrchestrationOosError } from "./orchestration-oos-client.ts";
import { readOriginalOrchestrationRun, readOrchestrationStartContext, startOrchestrationRun } from "./orchestration-start-oos-client.ts";

const headers = { "Cache-Control": "no-store" };
export async function readOrchestrationStartContextRoute(request: NextRequest) {
  try { return NextResponse.json(await readOrchestrationStartContext(request.nextUrl.searchParams.get("initiativeId")), { headers }); }
  catch (error) { return failure(error); }
}
export async function startOrchestrationRunRoute(request: NextRequest) {
  try { return NextResponse.json(await startOrchestrationRun(await request.json().catch(() => null)), { headers, status: 202 }); }
  catch (error) { return failure(error); }
}
export async function readOriginalOrchestrationRunRoute(runId: string) {
  try { return NextResponse.json(await readOriginalOrchestrationRun(runId), { headers }); }
  catch (error) { return failure(error); }
}
function failure(error: unknown) {
  const known = error instanceof OrchestrationOosError || error instanceof ConsoleSourceAuthorityError;
  return NextResponse.json({ mode: "live", code: known ? error.code : "orchestration_start_unavailable",
    error: known ? error.message : "Run truth is unavailable. Retain the original request and read it again." },
  { headers, status: error instanceof OrchestrationOosError ? error.status : 502 });
}
