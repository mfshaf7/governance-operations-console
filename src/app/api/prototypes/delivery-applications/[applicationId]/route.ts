import { readPrototypeDeliveryApplicationRoute } from "../../../../../domain-workspaces/prototype/server/prototype-delivery-api-routes.ts";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ applicationId: string }> },
) {
  const { applicationId } = await context.params;
  return readPrototypeDeliveryApplicationRoute(applicationId);
}
