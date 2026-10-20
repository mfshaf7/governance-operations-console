import type { NextRequest } from "next/server";
import { authorizeConsoleMutation } from "../../../../../../console-integration/identity/server/console-session-authorization.ts";
import { prototypeSourceWriteRoute } from "../../../../../../domain-workspaces/prototype/server/prototype-source-api-routes.ts";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export async function POST(request: NextRequest, { params }: { params: Promise<{ requestId: string; action: string }> }) {
  return authorizeConsoleMutation(request, async () => {
    const { requestId, action } = await params;
    return prototypeSourceWriteRoute(request, requestId, action);
  });
}
