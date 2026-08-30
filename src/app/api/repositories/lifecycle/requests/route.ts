import type { NextRequest } from "next/server";

import { executeRepositoryLifecycleActionRoute } from "../../../../../domain-workspaces/repository/server/repository-lifecycle-api-routes.ts";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return executeRepositoryLifecycleActionRoute(request);
}
