import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";
import { commandPrototypePreviewRoute } from "@/domain-workspaces/prototype/server";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ prototypeId: string }> },
) {
  return authorizeConsoleMutation(request, async () => {
    const { prototypeId } = await context.params;
    return commandPrototypePreviewRoute(request, prototypeId);
  });
}
