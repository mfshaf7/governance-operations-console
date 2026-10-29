import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";
import { savedWorkConfigured, savedWorkPreviewResponse, savedWorkRoute } from "@/console-integration/saved-work/server";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ kind: string; subjectId: string }> };
export async function GET(request: Request, context: Context) {
  if (!savedWorkConfigured()) return savedWorkPreviewResponse();
  return authorizeConsoleMutation(request, async () => { const { kind, subjectId } = await context.params; return savedWorkRoute(request, kind, subjectId); });
}
export async function POST(request: Request, context: Context) {
  return authorizeConsoleMutation(request, async () => { const { kind, subjectId } = await context.params; return savedWorkRoute(request, kind, subjectId); });
}
