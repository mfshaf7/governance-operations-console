import { NextRequest } from "next/server";

import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";
import { submitDeliveryChangeRoute } from "../../../../../../../domain-workspaces/delivery/server/delivery-change-api-routes.ts";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workItemId: string }> },
) {
  return authorizeConsoleMutation(request, async () => {
    const { workItemId } = await params;
    return submitDeliveryChangeRoute(request, workItemId);
  });
}
