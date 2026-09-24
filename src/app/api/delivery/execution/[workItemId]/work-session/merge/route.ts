import type { NextRequest } from "next/server";

import { mergeDeliveryWorkSessionRoute } from "../../../../../../../domain-workspaces/delivery/server/delivery-work-session-api-routes.ts";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workItemId: string }> },
) {
  const { workItemId } = await params;
  return mergeDeliveryWorkSessionRoute(request, workItemId);
}
