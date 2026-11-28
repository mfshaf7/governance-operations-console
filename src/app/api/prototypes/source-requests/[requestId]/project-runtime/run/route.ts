import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";
import { prototypeProjectRuntimeRoute } from "@/domain-workspaces/prototype/server";

export const dynamic = "force-dynamic";
export async function POST(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  return authorizeConsoleMutation(request, async () => prototypeProjectRuntimeRoute(request, (await params).requestId, "run"));
}
