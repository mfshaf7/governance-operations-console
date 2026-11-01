import type { NextRequest } from "next/server";
import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";
import { prepareProductPublicationRoute } from "@/domain-workspaces/portfolio/server";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  return authorizeConsoleMutation(request, () => prepareProductPublicationRoute(productId));
}
