import type { NextRequest } from "next/server";

import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";
import { submitWorkspaceInventoryRoute } from "../../../../workspace-registry/server/workspace-registry-api-routes.ts";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return authorizeConsoleMutation(request, () =>
    submitWorkspaceInventoryRoute(request),
  );
}
