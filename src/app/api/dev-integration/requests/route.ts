import type { NextRequest } from "next/server";
import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";
import { requestsRoute } from "@/environment-lifecycle/server/dev-integration-api-routes";
export const dynamic = "force-dynamic";
export const GET = requestsRoute;
export async function POST(request: NextRequest) {
  return authorizeConsoleMutation(request, () => requestsRoute(request));
}
