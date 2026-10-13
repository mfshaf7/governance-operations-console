import { readCurrentArchitecturePacketRoute } from "../../../../../domain-workspaces/delivery/server/architecture-packet-api-routes.ts";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ deliveryId: string }> },
) {
  const { deliveryId } = await params;
  return readCurrentArchitecturePacketRoute(deliveryId);
}
