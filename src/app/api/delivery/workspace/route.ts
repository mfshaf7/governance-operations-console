import { NextResponse } from "next/server";
import { readCanonicalDeliveryWorkspace } from "../../../../domain-workspaces/delivery/server/delivery-workspace-oos-client.ts";
import { deliveryOosConfigured } from "../../../../domain-workspaces/delivery/server/delivery-oos-client.ts";

export const dynamic = "force-dynamic";

export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  if (!deliveryOosConfigured()) return NextResponse.json({ mode: "disconnected-preview", projection: null, error: null }, { headers });
  try {
    return NextResponse.json({ mode: "live", projection: await readCanonicalDeliveryWorkspace(), error: null }, { headers });
  } catch {
    return NextResponse.json({ mode: "live", projection: null, error: "Canonical Delivery records are unavailable; fixtures are not a fallback." }, { headers, status: 503 });
  }
}
