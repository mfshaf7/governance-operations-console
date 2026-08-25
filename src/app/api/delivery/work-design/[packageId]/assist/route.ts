import type { NextRequest } from "next/server";

import { requestWorkDesignAdviceRoute } from "../../../../../../domain-workspaces/delivery/server/work-design-api-routes.ts";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ packageId: string }> },
) {
  const { packageId } = await context.params;
  return requestWorkDesignAdviceRoute(request, packageId);
}
