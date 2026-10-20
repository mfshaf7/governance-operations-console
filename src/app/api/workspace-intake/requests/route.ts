import type { NextRequest } from "next/server";

import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";
import { submitWorkspaceIntakeRoute, listWorkspaceIntakeRequestsRoute } from "../../../../console-integration/workspace-intake/server/workspace-intake-api-routes.ts";

export const dynamic = "force-dynamic";

export const GET = listWorkspaceIntakeRequestsRoute;

export async function POST(request: NextRequest) {
  return authorizeConsoleMutation(request, () => submitWorkspaceIntakeRoute(request));
}
