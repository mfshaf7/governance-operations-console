import { NextResponse } from "next/server";
import { consoleOosModeSelected } from "../../../console-integration/configuration/console-runtime-configuration";
import { readAiActivity } from "../../../agent-console/server/ai-activity-client";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  if ([...query.keys()].some(key => key !== "cursor") || query.getAll("cursor").length > 1 || (query.has("cursor") && !/^[A-Za-z0-9_-]{1,2048}$/.test(query.get("cursor")!))) {
    return NextResponse.json({ error: "Invalid AI history query." }, { status: 400, headers });
  }
  if (!consoleOosModeSelected()) return NextResponse.json({ mode: "disconnected-preview", status: "current", observedAt: new Date().toISOString(), items: [], nextCursor: null, coverage: "Disconnected preview", error: null }, { headers });
  try { return NextResponse.json(await readAiActivity({ cursor: query.get("cursor"), signal: request.signal }), { headers }); }
  catch { return NextResponse.json({ mode: "live", status: "offline", observedAt: null, items: [], nextCursor: null, coverage: "Owner history unavailable", error: "AI activity could not be refreshed. No model request was made." }, { status: 503, headers }); }
}
