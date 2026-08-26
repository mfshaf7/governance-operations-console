import { readDeliveryWorkSessionRoute } from "../../../../../../domain-workspaces/delivery/server/delivery-work-session-api-routes.ts";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workItemId: string }> },
) {
  const { workItemId } = await params;
  return readDeliveryWorkSessionRoute(workItemId);
}
