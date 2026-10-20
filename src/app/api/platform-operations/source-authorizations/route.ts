import type { NextRequest } from "next/server";
import { authorizeConsoleMutation } from "../../../../console-integration/identity/server/console-session-authorization.ts";
import { readSourceAuthorizationRoute, writeSourceAuthorizationRoute } from "../../../../environment-lifecycle/server/source-authorization-api-routes.ts";
export const dynamic = "force-dynamic";
export function GET() { return readSourceAuthorizationRoute(); }
export function POST(request: NextRequest) { return authorizeConsoleMutation(request, () => writeSourceAuthorizationRoute(request)); }
