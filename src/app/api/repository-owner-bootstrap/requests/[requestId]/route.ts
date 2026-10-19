import type { NextRequest } from "next/server";
import { authorizeConsoleMutation } from "../../../../../console-integration/identity/server/console-session-authorization.ts";
import { repositoryBootstrapReadRoute, repositoryBootstrapWriteRoute } from "../../../../../domain-workspaces/repository/server/repository-bootstrap-api-routes.ts";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ requestId: string }> }) { return repositoryBootstrapReadRoute(null, (await params).requestId); }
export async function POST(request: NextRequest, { params }: { params: Promise<{ requestId: string }> }) { return authorizeConsoleMutation(request, async () => repositoryBootstrapWriteRoute(request, "command", (await params).requestId)); }
