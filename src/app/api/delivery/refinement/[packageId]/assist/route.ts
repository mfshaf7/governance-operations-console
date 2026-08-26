import { NextRequest } from "next/server";

import { requestRefinementAdviceRoute } from "../../../../../../domain-workspaces/delivery/server/refinement-catalog-api-routes.ts";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ packageId: string }> },
) {
  const { packageId } = await params;
  return requestRefinementAdviceRoute(request, packageId);
}
