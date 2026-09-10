import type { NextRequest } from "next/server";

import { preparePrototypeMaturityRoute } from "../../../../../domain-workspaces/prototype/server/prototype-maturity-api-routes.ts";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return preparePrototypeMaturityRoute(request);
}
