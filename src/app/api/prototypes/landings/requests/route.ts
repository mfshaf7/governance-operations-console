import type { NextRequest } from "next/server";

import { submitPrototypeLandingRoute } from "../../../../../domain-workspaces/prototype/server/prototype-landing-api-routes.ts";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return submitPrototypeLandingRoute(request);
}
