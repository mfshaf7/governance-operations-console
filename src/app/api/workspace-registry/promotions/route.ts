import type { NextRequest } from "next/server";

import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";
import { listWorkspaceInventoryRoute, submitWorkspaceInventoryRoute } from "../../../../workspace-registry/server/workspace-registry-api-routes.ts";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return listWorkspaceInventoryRoute(request, "promotion");
}

export async function POST(request: NextRequest) {
  return authorizeConsoleMutation(request, () =>
    submitWorkspaceInventoryRoute(request),
  );
}
