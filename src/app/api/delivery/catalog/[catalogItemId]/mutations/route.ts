import { NextRequest } from "next/server";

import { mutateCatalogRoute } from "../../../../../../domain-workspaces/delivery/server/refinement-catalog-api-routes.ts";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ catalogItemId: string }> },
) {
  const { catalogItemId } = await params;
  return mutateCatalogRoute(request, catalogItemId);
}
