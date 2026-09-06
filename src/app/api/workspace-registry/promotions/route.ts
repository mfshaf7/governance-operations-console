import type { NextRequest } from "next/server";

import { submitWorkspaceInventoryRoute } from "../../../../workspace-registry/server/workspace-registry-api-routes.ts";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return submitWorkspaceInventoryRoute(request);
}
