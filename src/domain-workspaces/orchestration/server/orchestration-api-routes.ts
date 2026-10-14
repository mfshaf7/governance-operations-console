import { NextRequest, NextResponse } from "next/server";
import { consoleOosModeSelected } from "../../../console-integration/configuration/console-runtime-configuration.ts";
import { controlOrchestrationRun, OrchestrationOosError, readOrchestrationWorkspace } from "./orchestration-oos-client.ts";

const noStoreHeaders = { "Cache-Control": "no-store" };
export async function readOrchestrationWorkspaceRoute() {
  if (!consoleOosModeSelected()) return NextResponse.json({ definitions: [], error: null, mode: "disconnected-preview", observedAt: new Date().toISOString(), runs: [], status: "current" }, { headers: noStoreHeaders });
  try { return NextResponse.json({ ...(await readOrchestrationWorkspace()), error: null, mode: "live", observedAt: new Date().toISOString(), status: "current" }, { headers: noStoreHeaders }); }
  catch (error) { return errorResponse(error); }
}
export async function controlOrchestrationRunRoute(request: NextRequest, runId: string) {
  try { return NextResponse.json(await controlOrchestrationRun(runId, await request.json().catch(() => null)), { headers: noStoreHeaders }); }
  catch (error) { return errorResponse(error); }
}
function errorResponse(error: unknown) {
  const known = error instanceof OrchestrationOosError;
  return NextResponse.json({ code: known ? error.code : "orchestration_adapter_failed", error: known ? error.message : "Orchestration is unavailable.", mode: "live", status: "offline" }, { headers: noStoreHeaders, status: known ? error.status : 502 });
}
