import type { NextRequest } from "next/server";
import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";
import { decidePrototypeClosureRoute } from "@/domain-workspaces/prototype/server";

export async function POST(request: NextRequest, context: { params: Promise<{ requestId: string }> }) {
  return authorizeConsoleMutation(request, async () =>
    decidePrototypeClosureRoute(request, (await context.params).requestId),
  );
}
