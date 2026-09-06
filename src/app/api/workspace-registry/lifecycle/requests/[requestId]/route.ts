import { readWorkspaceInventoryLifecycleRoute } from "@/workspace-registry/server/workspace-registry-api-routes";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ requestId: string }> },
) {
  const { requestId } = await context.params;
  return readWorkspaceInventoryLifecycleRoute(requestId);
}
