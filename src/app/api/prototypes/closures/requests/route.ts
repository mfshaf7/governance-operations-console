import type { NextRequest } from "next/server";
import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";
import { submitPrototypeClosureRoute } from "@/domain-workspaces/prototype/server";

export async function POST(request: NextRequest) {
  return authorizeConsoleMutation(request, () => submitPrototypeClosureRoute(request));
}
