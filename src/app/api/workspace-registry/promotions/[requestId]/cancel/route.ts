import { cancelWorkspaceInventoryRoute } from "../../../../../../workspace-registry/server/workspace-registry-api-routes.ts";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ requestId: string }> },
) {
  const { requestId } = await context.params;
  return cancelWorkspaceInventoryRoute(requestId);
}
