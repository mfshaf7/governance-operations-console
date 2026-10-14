export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";
import { controlPlatformOperationRoute } from "@/environment-lifecycle/server";

export async function POST(request: NextRequest, context: { params: Promise<{ operationId: string }> }) {
  return authorizeConsoleMutation(request, async () => {
    const { operationId } = await context.params;
    return controlPlatformOperationRoute(request, operationId);
  });
}
