import { NextRequest } from "next/server";

import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";
import { mutateCatalogRoute } from "../../../../../../domain-workspaces/delivery/server/refinement-catalog-api-routes.ts";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ catalogItemId: string }> },
) {
  return authorizeConsoleMutation(request, async () => {
    const { catalogItemId } = await params;
    return mutateCatalogRoute(request, catalogItemId);
  });
}
