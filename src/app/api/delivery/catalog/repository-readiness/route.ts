import { NextRequest } from "next/server";
import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";
import { prepareCatalogReadinessRoute } from "../../../../../domain-workspaces/delivery/server/refinement-catalog-api-routes.ts";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  return authorizeConsoleMutation(request, () => prepareCatalogReadinessRoute(request));
}
