import type { NextRequest } from "next/server";
import { authorizeConsoleMutation } from "../../../../console-integration/identity/server/console-session-authorization.ts";
import { repositoryBootstrapReadRoute, repositoryBootstrapWriteRoute } from "../../../../domain-workspaces/repository/server/repository-bootstrap-api-routes.ts";
export const dynamic = "force-dynamic";
export function GET(request: NextRequest) {
  const keys = [...request.nextUrl.searchParams.keys()];
  return keys.length === 1 && keys[0] === "owner_repo" ? repositoryBootstrapReadRoute(request.nextUrl.searchParams.get("owner_repo")) : repositoryBootstrapReadRoute(null);
}
export function POST(request: NextRequest) { return authorizeConsoleMutation(request, () => repositoryBootstrapWriteRoute(request, "create")); }
