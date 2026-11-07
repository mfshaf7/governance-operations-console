import type { NextRequest } from "next/server";
import { authorizeConsoleMutation } from "../../../../console-integration/identity/server/console-session-authorization.ts";
import { repositoryBootstrapReadRoute, repositoryBootstrapWriteRoute } from "../../../../domain-workspaces/repository/server/repository-bootstrap-api-routes.ts";
export const dynamic = "force-dynamic";
export function GET(request: NextRequest) {
  const keys = [...request.nextUrl.searchParams.keys()];
  const valid = keys.includes("owner_repo") && keys.every(key => ["owner_repo", "cursor"].includes(key) && request.nextUrl.searchParams.getAll(key).length === 1);
  return valid ? repositoryBootstrapReadRoute(request.nextUrl.searchParams.get("owner_repo"),null,false,request.nextUrl.searchParams.get("cursor")) : repositoryBootstrapReadRoute(null);
}
export function POST(request: NextRequest) { return authorizeConsoleMutation(request, () => repositoryBootstrapWriteRoute(request, "create")); }
