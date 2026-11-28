import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";
import { prototypeProjectRuntimeRoute } from "@/domain-workspaces/prototype/server";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ requestId: string; commandId: string }> };
async function command(request: Request, { params }: Context) {
  const { requestId, commandId } = await params;
  return authorizeConsoleMutation(request, () => prototypeProjectRuntimeRoute(request, requestId, "command", commandId));
}
export const GET = command;
export const POST = command;
