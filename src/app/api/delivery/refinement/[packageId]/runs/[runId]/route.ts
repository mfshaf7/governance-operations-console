import { readRefinementRunRoute } from "../../../../../../../domain-workspaces/delivery/server/refinement-catalog-api-routes.ts";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  {
    params,
  }: { params: Promise<{ packageId: string; runId: string }> },
) {
  const { packageId, runId } = await params;
  return readRefinementRunRoute(packageId, runId);
}
