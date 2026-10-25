import { NextResponse } from "next/server";
import { readCanonicalDeliveryHistory } from "../../../../../domain-workspaces/delivery/server/delivery-workspace-oos-client.ts";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: {params:Promise<{deliveryId:string}>}) {
  const headers={"Cache-Control":"no-store"};
  try { const {deliveryId}=await context.params;return NextResponse.json({mode:"live",status:"current",projection:await readCanonicalDeliveryHistory(deliveryId),error:null},{headers}); }
  catch { return NextResponse.json({mode:"live",status:"offline",projection:null,error:"Original Delivery owner history is unavailable. Retry the owner read; no historical result is inferred."},{headers,status:503}); }
}
