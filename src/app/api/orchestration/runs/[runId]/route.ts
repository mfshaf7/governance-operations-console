export const dynamic = "force-dynamic";
import { readOriginalOrchestrationRunRoute } from "@/domain-workspaces/orchestration/server";
export async function GET(_request: Request, context: { params: Promise<{ runId: string }> }) {
  return readOriginalOrchestrationRunRoute((await context.params).runId);
}
