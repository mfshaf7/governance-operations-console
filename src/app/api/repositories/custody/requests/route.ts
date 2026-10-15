import type { NextRequest } from "next/server";

import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";
import { linkExistingRepositoryCustodyRoute, listRepositoryCustodyRequestsRoute } from "../../../../../domain-workspaces/repository/server/repository-custody-api-routes.ts";

export const dynamic = "force-dynamic";

export const GET = listRepositoryCustodyRequestsRoute;

export async function POST(request: NextRequest) {
  return authorizeConsoleMutation(request, () =>
    linkExistingRepositoryCustodyRoute(request),
  );
}
