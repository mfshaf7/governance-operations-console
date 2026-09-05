import type { NextRequest } from "next/server";

import { prepareWorkspaceIntakeRoute } from "../../../../console-integration/workspace-intake/server/workspace-intake-api-routes.ts";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return prepareWorkspaceIntakeRoute(request);
}
