import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";
import { readDeliveryCommandOutcomeRoute } from "@/domain-workspaces/delivery/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ workItemId: string; commandId: string }> }) {
  return authorizeConsoleMutation(request, async () => {
    const { workItemId, commandId } = await params;
    return readDeliveryCommandOutcomeRoute("change-control", workItemId, commandId);
  });
}
