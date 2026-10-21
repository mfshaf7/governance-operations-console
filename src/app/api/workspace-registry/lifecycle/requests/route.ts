import type { NextRequest } from "next/server";

import { listWorkspaceInventoryRoute, submitWorkspaceInventoryLifecycleRoute } from "@/workspace-registry/server/workspace-registry-api-routes";
import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return listWorkspaceInventoryRoute(request, "lifecycle");
}

export async function POST(request: NextRequest) {
  return authorizeConsoleMutation(request, () =>
    submitWorkspaceInventoryLifecycleRoute(request),
  );
}
