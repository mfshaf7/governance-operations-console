import { readWorkspaceRegistryRoute } from "../../../workspace-registry/server/workspace-registry-api-routes.ts";

export const dynamic = "force-dynamic";

export async function GET() {
  return readWorkspaceRegistryRoute();
}
