export const dynamic = "force-dynamic";

import { readPlatformOperationRoute } from "@/environment-lifecycle/server";

export async function GET(_request: Request, context: { params: Promise<{ operationId: string }> }) {
  const { operationId } = await context.params;
  return readPlatformOperationRoute(operationId);
}
