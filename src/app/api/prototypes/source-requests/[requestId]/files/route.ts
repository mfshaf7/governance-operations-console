import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";
import { prototypeSourceEditorRoute } from "../../../../../../domain-workspaces/prototype/server/prototype-source-editor-api-routes.ts";
export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  return authorizeConsoleMutation(request, async () => prototypeSourceEditorRoute(request, (await params).requestId));
}
