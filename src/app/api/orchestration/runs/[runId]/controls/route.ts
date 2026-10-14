export const dynamic = "force-dynamic";
import type { NextRequest } from "next/server";
import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";
import { controlOrchestrationRunRoute } from "@/domain-workspaces/orchestration/server";
export async function POST(request: NextRequest, context: { params: Promise<{ runId: string }> }) {
  return authorizeConsoleMutation(request, async () => { const { runId } = await context.params; return controlOrchestrationRunRoute(request, runId); });
}
