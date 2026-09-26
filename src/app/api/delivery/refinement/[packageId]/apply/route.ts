import { NextRequest } from "next/server";

import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";
import { applyRefinementRoute } from "../../../../../../domain-workspaces/delivery/server/refinement-catalog-api-routes.ts";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ packageId: string }> },
) {
  return authorizeConsoleMutation(request, async () => {
    const { packageId } = await params;
    return applyRefinementRoute(request, packageId);
  });
}
