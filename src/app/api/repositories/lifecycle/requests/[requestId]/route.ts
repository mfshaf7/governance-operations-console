import { readRepositoryLifecycleResultRoute } from "../../../../../../domain-workspaces/repository/server/repository-lifecycle-api-routes.ts";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ requestId: string }> },
) {
  const { requestId } = await context.params;
  return readRepositoryLifecycleResultRoute(requestId);
}
