import type { NextRequest } from "next/server";
import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";
import { commandDeliverySourceRealizationRoute } from "../../../../../../../../domain-workspaces/delivery/server/delivery-source-realization-api-routes.ts";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ workItemId: string }> }) {
  return authorizeConsoleMutation(request, async () => {
    const { workItemId } = await params;
    return commandDeliverySourceRealizationRoute(request, workItemId, "cancel");
  });
}
