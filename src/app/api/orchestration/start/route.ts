export const dynamic = "force-dynamic";
import type { NextRequest } from "next/server";
import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";
import { readOrchestrationStartContextRoute, startOrchestrationRunRoute } from "@/domain-workspaces/orchestration/server";
export const GET = readOrchestrationStartContextRoute;
export async function POST(request: NextRequest) {
  return authorizeConsoleMutation(request, () => startOrchestrationRunRoute(request));
}
