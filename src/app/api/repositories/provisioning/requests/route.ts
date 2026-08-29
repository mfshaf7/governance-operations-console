import type { NextRequest } from "next/server";

import { provisionRepositoryRoute } from "../../../../../domain-workspaces/repository/server/repository-custody-api-routes.ts";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return provisionRepositoryRoute(request);
}
