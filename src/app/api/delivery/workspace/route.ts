import { NextResponse } from "next/server";
import { readCanonicalDeliveryInventory } from "../../../../domain-workspaces/delivery/server/delivery-workspace-oos-client.ts";
import { deliveryOosConfigured, DeliveryOosError } from "../../../../domain-workspaces/delivery/server/delivery-oos-client.ts";

export const dynamic = "force-dynamic";

export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  if (!deliveryOosConfigured()) return NextResponse.json({ mode: "disconnected-preview", projection: null, error: null }, { headers });
  try {
    return NextResponse.json({ mode: "live", projection: await readCanonicalDeliveryInventory({overview:true}), error: null }, { headers });
  } catch (error) {
    const status=error instanceof DeliveryOosError && [401,403].includes(error.status)?error.status:503;
    return NextResponse.json({ mode: "live", projection: null, error: "Canonical Delivery records are unavailable; fixtures are not a fallback." }, { headers, status });
  }
}
