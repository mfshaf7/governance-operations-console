export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";
import { readModelProfileRequestRoute, commandModelProfileRequestRoute } from "@/domain-workspaces/model-operations/server";

type Context = { params: Promise<{ requestId: string }> };

export async function GET(_request: Request, context: Context) {
  return readModelProfileRequestRoute((await context.params).requestId);
}

export async function POST(request: NextRequest, context: Context) {
  const { requestId } = await context.params;
  return authorizeConsoleMutation(request, () => commandModelProfileRequestRoute(request, requestId));
}
