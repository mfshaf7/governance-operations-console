import type { NextRequest } from "next/server";

import { closeDeliveryWorkSessionRoute } from "../../../../../../../domain-workspaces/delivery/server/delivery-work-session-api-routes.ts";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workItemId: string }> },
) {
  const { workItemId } = await params;
  return closeDeliveryWorkSessionRoute(request, workItemId);
}
