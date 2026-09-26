import type { NextRequest } from "next/server";

import { submitWorkspaceInventoryLifecycleRoute } from "@/workspace-registry/server/workspace-registry-api-routes";
import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return authorizeConsoleMutation(request, () =>
    submitWorkspaceInventoryLifecycleRoute(request),
  );
}
