import type { NextRequest } from "next/server";

import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";
import { readProductPublicationRoute } from "@/domain-workspaces/portfolio/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> },
) {
  const { requestId } = await params;
  return authorizeConsoleMutation(request, () =>
    readProductPublicationRoute(requestId),
  );
}
