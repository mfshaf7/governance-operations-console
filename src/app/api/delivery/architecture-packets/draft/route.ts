import type { NextRequest } from "next/server";

import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";
import { draftArchitecturePacketRoute } from "../../../../../domain-workspaces/delivery/server/architecture-packet-api-routes.ts";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return authorizeConsoleMutation(request, () =>
    draftArchitecturePacketRoute(request),
  );
}
