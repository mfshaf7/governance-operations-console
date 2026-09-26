import type { NextRequest } from "next/server";

import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";
import { decidePrototypeMaturityRoute } from "../../../../../../../domain-workspaces/prototype/server/prototype-maturity-api-routes.ts";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ requestId: string }> },
) {
  return authorizeConsoleMutation(request, async () => {
    const { requestId } = await context.params;
    return decidePrototypeMaturityRoute(request, requestId);
  });
}
