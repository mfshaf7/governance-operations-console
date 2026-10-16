import { NextResponse } from "next/server";
import { prototypeLandingOosConfigured, readCanonicalPrototypeWorkspace } from "../../../../domain-workspaces/prototype/server/prototype-landing-oos-client.ts";

export const dynamic = "force-dynamic";

export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  if (!prototypeLandingOosConfigured()) return NextResponse.json({ mode: "disconnected-preview", projection: null, error: null }, { headers });
  try { return NextResponse.json({ mode: "live", projection: await readCanonicalPrototypeWorkspace(), error: null }, { headers }); }
  catch { return NextResponse.json({ mode: "live", projection: null, error: "Canonical Prototype records are unavailable. Fixtures are not a fallback." }, { headers, status: 503 }); }
}
