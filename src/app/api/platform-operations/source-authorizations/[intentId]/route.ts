import type { NextRequest } from "next/server";
import { authorizeConsoleMutation } from "../../../../../console-integration/identity/server/console-session-authorization.ts";
import { readSourceAuthorizationRoute, writeSourceAuthorizationRoute } from "../../../../../environment-lifecycle/server/source-authorization-api-routes.ts";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ intentId: string }> }) { return readSourceAuthorizationRoute((await params).intentId); }
export function POST(request: NextRequest, { params }: { params: Promise<{ intentId: string }> }) { return authorizeConsoleMutation(request, async () => writeSourceAuthorizationRoute(request, (await params).intentId)); }
