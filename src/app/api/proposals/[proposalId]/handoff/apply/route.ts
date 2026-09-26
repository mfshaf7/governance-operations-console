import type { NextRequest } from "next/server";

import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";
import { applyProposalDeliveryHandoffRoute } from "../../../../../../domain-workspaces/proposal/server/proposal-api-routes.ts";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ proposalId: string }> },
) {
  return authorizeConsoleMutation(request, async () => {
    const { proposalId } = await context.params;
    return applyProposalDeliveryHandoffRoute(request, proposalId);
  });
}
