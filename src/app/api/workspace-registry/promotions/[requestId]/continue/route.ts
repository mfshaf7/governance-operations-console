import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";
import { continueWorkspaceInventoryRoute } from "../../../../../../workspace-registry/server/workspace-registry-api-routes.ts";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ requestId: string }> },
) {
  return authorizeConsoleMutation(request, async () => {
    const { requestId } = await context.params;
    return continueWorkspaceInventoryRoute(requestId);
  });
}
