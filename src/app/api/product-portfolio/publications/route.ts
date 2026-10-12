import type { NextRequest } from "next/server";

import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";
import {
  productPublicationModeRoute,
  submitProductPublicationRoute,
} from "@/domain-workspaces/portfolio/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return productPublicationModeRoute();
}

export async function POST(request: NextRequest) {
  return authorizeConsoleMutation(request, () =>
    submitProductPublicationRoute(request),
  );
}
