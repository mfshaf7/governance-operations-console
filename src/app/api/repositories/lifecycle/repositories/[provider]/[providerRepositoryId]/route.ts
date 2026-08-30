import { readRepositoryLifecycleAuditRoute } from "../../../../../../../domain-workspaces/repository/server/repository-lifecycle-api-routes.ts";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ provider: string; providerRepositoryId: string }>;
  },
) {
  const { provider, providerRepositoryId } = await context.params;
  return readRepositoryLifecycleAuditRoute(provider, providerRepositoryId);
}
