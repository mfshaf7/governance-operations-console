import { readWorkDesignProjectionRoute } from "../../../../../../domain-workspaces/delivery/server/work-design-api-routes.ts";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ packageId: string }> },
) {
  const { packageId } = await context.params;
  return readWorkDesignProjectionRoute(packageId);
}
