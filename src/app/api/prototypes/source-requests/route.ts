import type { NextRequest } from "next/server";
import { authorizeConsoleMutation } from "../../../../console-integration/identity/server/console-session-authorization.ts";
import { prototypeSourceReadRoute, prototypeSourceWriteRoute } from "../../../../domain-workspaces/prototype/server/prototype-source-api-routes.ts";

export const dynamic = "force-dynamic";
export function GET() { return prototypeSourceReadRoute(); }
export function POST(request: NextRequest) { return authorizeConsoleMutation(request, () => prototypeSourceWriteRoute(request)); }
