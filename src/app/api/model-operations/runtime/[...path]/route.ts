import { type NextRequest } from "next/server";
import { authorizeConsoleMutation } from "../../../../../console-integration/identity/server/console-session-authorization.ts";
import { modelRuntimeRoute } from "../../../../../domain-workspaces/model-operations/server/model-runtime-api-routes.ts";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };
export async function GET(request: NextRequest, { params }: Context) {
  const path = (await params).path;
  return authorizeConsoleMutation(request, () => modelRuntimeRoute(request, path));
}
export async function POST(request: NextRequest, { params }: Context) {
  const path = (await params).path;
  return authorizeConsoleMutation(request, () => modelRuntimeRoute(request, path));
}
