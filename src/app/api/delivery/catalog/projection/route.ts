import { readCatalogProjectionRoute } from "../../../../../domain-workspaces/delivery/server/refinement-catalog-api-routes.ts";

export const dynamic = "force-dynamic";

export async function GET() {
  return readCatalogProjectionRoute();
}
