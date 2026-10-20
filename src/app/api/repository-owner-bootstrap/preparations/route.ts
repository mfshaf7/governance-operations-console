import type { NextRequest } from "next/server";
import { authorizeConsoleMutation } from "../../../../console-integration/identity/server/console-session-authorization.ts";
import { repositoryBootstrapWriteRoute } from "../../../../domain-workspaces/repository/server/repository-bootstrap-api-routes.ts";
export const dynamic = "force-dynamic";
export function POST(request: NextRequest) { return authorizeConsoleMutation(request, () => repositoryBootstrapWriteRoute(request, "prepare")); }
