import { readWorkspaceIntakeRoute } from "../../../../../console-integration/workspace-intake/server/workspace-intake-api-routes.ts";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ requestId: string }> },
) {
  const { requestId } = await context.params;
  return readWorkspaceIntakeRoute(requestId);
}
