export const dynamic = "force-dynamic";

import { modelOperationsOperatingProjectionRoute } from "../../../../../domain-workspaces/model-operations/server/model-operations-api-routes.ts";

export async function GET(
  _request: Request,
  context: { params: Promise<{ requestId: string }> },
) {
  const { requestId } = await context.params;
  return modelOperationsOperatingProjectionRoute(requestId);
}
