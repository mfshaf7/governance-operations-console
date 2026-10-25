import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";
import { deliverySourceEditorRoute } from "../../../../../../../../domain-workspaces/delivery/server/delivery-source-editor-api-routes.ts";
export const dynamic = "force-dynamic";
async function route(request: Request, { params }: { params: Promise<{ workItemId: string }> }) {
  return authorizeConsoleMutation(request, async () => deliverySourceEditorRoute(request, (await params).workItemId, "draft"));
}
export const GET = route;
export const POST = route;
