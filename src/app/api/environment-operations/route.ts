export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";
import { listPlatformOperationsRoute, submitPlatformOperationRoute } from "@/environment-lifecycle/server";

export const GET = listPlatformOperationsRoute;
export async function POST(request: NextRequest) {
  return authorizeConsoleMutation(request, () => submitPlatformOperationRoute(request));
}
