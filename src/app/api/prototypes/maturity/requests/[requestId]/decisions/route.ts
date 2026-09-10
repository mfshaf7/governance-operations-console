import type { NextRequest } from "next/server";

import { decidePrototypeMaturityRoute } from "../../../../../../../domain-workspaces/prototype/server/prototype-maturity-api-routes.ts";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ requestId: string }> },
) {
  const { requestId } = await context.params;
  return decidePrototypeMaturityRoute(request, requestId);
}
