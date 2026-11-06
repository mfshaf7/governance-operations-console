import { readProposalRecordRoute } from "../../../../domain-workspaces/proposal/server/proposal-api-routes.ts";
import type { NextRequest } from "next/server";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest, context: {params: Promise<{proposalId:string}>}) {
  return readProposalRecordRoute(request, (await context.params).proposalId);
}
