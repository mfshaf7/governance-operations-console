import { NextRequest } from "next/server";

import { applyRefinementRoute } from "../../../../../../domain-workspaces/delivery/server/refinement-catalog-api-routes.ts";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ packageId: string }> },
) {
  const { packageId } = await params;
  return applyRefinementRoute(request, packageId);
}
