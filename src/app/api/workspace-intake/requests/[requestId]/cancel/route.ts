import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";
import { cancelWorkspaceIntakeRoute } from "../../../../../../console-integration/workspace-intake/server/workspace-intake-api-routes.ts";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ requestId: string }> },
) {
  return authorizeConsoleMutation(request, async () => {
    const { requestId } = await context.params;
    return cancelWorkspaceIntakeRoute(requestId);
  });
}
