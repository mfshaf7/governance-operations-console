import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";
import { prototypeSourceEditorRoute } from "@/domain-workspaces/prototype/server";
export const dynamic = "force-dynamic";
export async function POST(request: Request, {params}: {params: Promise<{requestId: string}>}) {
 return authorizeConsoleMutation(request, async()=>prototypeSourceEditorRoute(request,(await params).requestId,"assist"));
}
