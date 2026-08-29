import { NextRequest } from "next/server";

import { submitDeliveryCloseoutRoute } from "../../../../../../../domain-workspaces/delivery/server/delivery-closeout-api-routes.ts";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workItemId: string }> },
) {
  const { workItemId } = await params;
  return submitDeliveryCloseoutRoute(request, workItemId);
}
