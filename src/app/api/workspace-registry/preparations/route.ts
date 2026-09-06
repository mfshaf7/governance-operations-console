import type { NextRequest } from "next/server";

import { prepareWorkspaceInventoryRoute } from "../../../../workspace-registry/server/workspace-registry-api-routes.ts";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return prepareWorkspaceInventoryRoute(request);
}
