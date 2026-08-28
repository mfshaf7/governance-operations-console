import { NextRequest } from "next/server";

import { submitDeliveryChangeRoute } from "../../../../../../../domain-workspaces/delivery/server/delivery-change-api-routes.ts";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workItemId: string }> },
) {
  const { workItemId } = await params;
  return submitDeliveryChangeRoute(request, workItemId);
}
