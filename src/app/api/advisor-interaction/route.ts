import type { NextRequest } from "next/server";
import { authorizeConsoleMutation } from "../../../console-integration/identity/server/console-session-authorization.ts";
import { requestAdvisorDraftRoute } from "../../../agent-console/server/advisor-draft-route.ts";

export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  return authorizeConsoleMutation(request, () => requestAdvisorDraftRoute(request));
}
