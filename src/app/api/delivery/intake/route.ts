import { NextRequest, NextResponse } from "next/server";
import { readCanonicalDeliveryIntake } from "../../../../domain-workspaces/delivery/server/delivery-workspace-oos-client.ts";
import { deliveryOosConfigured } from "../../../../domain-workspaces/delivery/server/delivery-oos-client.ts";
import { DeliveryOosError } from "../../../../domain-workspaces/delivery/server/delivery-oos-client.ts";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const headers = { "Cache-Control": "no-store" };
  if (!deliveryOosConfigured()) return NextResponse.json({ mode: "disconnected-preview", projection: null }, { headers });
  try {
    const query=request.nextUrl.searchParams;const page=Number(query.get("page")??1),deliveryId=query.get("delivery_id")??undefined,search=query.get("search")??"";
    if(!Number.isSafeInteger(page)||page<1||page>100000||search.length>200||(deliveryId!==undefined&&!/^delivery-[1-9][0-9]*$/.test(deliveryId)))return NextResponse.json({error:"Invalid bounded Intake read."},{headers,status:400});
    return NextResponse.json({ mode: "live", projection: await readCanonicalDeliveryIntake({page,deliveryId,search}), error: null }, { headers });
  }
  catch (error) { return NextResponse.json({ mode: "live", projection: null, error: "Original Intake evidence is unavailable; no empty-source claim is made." }, { headers, status: error instanceof DeliveryOosError && [401,403].includes(error.status) ? error.status : 503 }); }
}
