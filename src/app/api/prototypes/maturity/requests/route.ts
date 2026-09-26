import type { NextRequest } from "next/server";

import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";
import { submitPrototypeMaturityRoute } from "../../../../../domain-workspaces/prototype/server/prototype-maturity-api-routes.ts";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return authorizeConsoleMutation(request, () => submitPrototypeMaturityRoute(request));
}
