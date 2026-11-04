import { readWorkspaceRegistryRoute } from "../../../workspace-registry/server/workspace-registry-api-routes.ts";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return readWorkspaceRegistryRoute(request);
}
