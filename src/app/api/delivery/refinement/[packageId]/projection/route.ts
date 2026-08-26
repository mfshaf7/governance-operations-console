import { readRefinementProjectionRoute } from "../../../../../../domain-workspaces/delivery/server/refinement-catalog-api-routes.ts";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ packageId: string }> },
) {
  const { packageId } = await params;
  return readRefinementProjectionRoute(packageId);
}
