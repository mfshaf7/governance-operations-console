import type { NextRequest } from "next/server";

import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";
import { applyProposalCommandRoute } from "../../../../../domain-workspaces/proposal/server/proposal-api-routes.ts";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ proposalId: string }> },
) {
  return authorizeConsoleMutation(request, async () => {
    const { proposalId } = await context.params;
    return applyProposalCommandRoute(request, proposalId);
  });
}
