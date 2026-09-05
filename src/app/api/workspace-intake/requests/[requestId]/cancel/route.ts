import { cancelWorkspaceIntakeRoute } from "../../../../../../console-integration/workspace-intake/server/workspace-intake-api-routes.ts";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ requestId: string }> },
) {
  const { requestId } = await context.params;
  return cancelWorkspaceIntakeRoute(requestId);
}
