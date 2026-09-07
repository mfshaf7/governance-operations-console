import type { NextRequest } from "next/server";

import { preparePrototypeLandingRoute } from "../../../../../domain-workspaces/prototype/server/prototype-landing-api-routes.ts";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return preparePrototypeLandingRoute(request);
}
