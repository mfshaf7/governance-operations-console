import type { NextRequest } from "next/server";

import { continueDeliveryWorkSessionRoute } from "../../../../../../../domain-workspaces/delivery/server/delivery-work-session-api-routes.ts";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workItemId: string }> },
) {
  const { workItemId } = await params;
  return continueDeliveryWorkSessionRoute(request, workItemId);
}
