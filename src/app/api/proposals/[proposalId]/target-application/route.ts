import type { NextRequest } from "next/server";

import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";
import { proposalTargetApplicationRoute } from "../../../../../domain-workspaces/proposal/server/proposal-api-routes.ts";

export const dynamic = "force-dynamic";

async function route(
  request: NextRequest,
  context: { params: Promise<{ proposalId: string }> },
) {
  return authorizeConsoleMutation(request, async () => {
    const { proposalId } = await context.params;
    return proposalTargetApplicationRoute(request, proposalId);
  });
}

export const DELETE = route;
export const POST = route;
