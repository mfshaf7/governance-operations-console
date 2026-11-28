import { readCompletionPrerequisitesRoute, readCurrentArchitecturePacketRoute } from "../../../../../domain-workspaces/delivery/server/architecture-packet-api-routes.ts";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ deliveryId: string }> },
) {
  const { deliveryId } = await params;
  return new URL(request.url).searchParams.get("view") === "completion-prerequisites"
    ? readCompletionPrerequisitesRoute(deliveryId)
    : readCurrentArchitecturePacketRoute(deliveryId);
}
