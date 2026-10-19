import { repositoryBootstrapReadRoute } from "../../../../../../domain-workspaces/repository/server/repository-bootstrap-api-routes.ts";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ requestId: string }> }) { return repositoryBootstrapReadRoute(null, (await params).requestId, true); }
