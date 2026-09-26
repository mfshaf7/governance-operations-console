import type { NextRequest } from "next/server";

import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";
import { executeRepositoryLifecycleActionRoute } from "../../../../../domain-workspaces/repository/server/repository-lifecycle-api-routes.ts";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return authorizeConsoleMutation(request, () =>
    executeRepositoryLifecycleActionRoute(request),
  );
}
