import { readRepositoryProvisioningResultRoute } from "../../../../../../domain-workspaces/repository/server/repository-custody-api-routes.ts";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ requestId: string }> },
) {
  const { requestId } = await context.params;
  return readRepositoryProvisioningResultRoute(requestId);
}
