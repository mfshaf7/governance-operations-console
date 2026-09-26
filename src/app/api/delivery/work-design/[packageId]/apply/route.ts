import type { NextRequest } from "next/server";

import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";
import { applyWorkDesignDraftRoute } from "../../../../../../domain-workspaces/delivery/server/work-design-api-routes.ts";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ packageId: string }> },
) {
  return authorizeConsoleMutation(request, async () => {
    const { packageId } = await context.params;
    return applyWorkDesignDraftRoute(request, packageId);
  });
}
