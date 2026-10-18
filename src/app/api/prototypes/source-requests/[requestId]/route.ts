import { prototypeSourceReadRoute } from "../../../../../domain-workspaces/prototype/server/prototype-source-api-routes.ts";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  return prototypeSourceReadRoute((await params).requestId);
}
