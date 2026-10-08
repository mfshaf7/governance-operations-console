import { provePrototypePreviewRoute } from "@/domain-workspaces/prototype/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ prototypeId: string }> },
) {
  const { prototypeId } = await context.params;
  return provePrototypePreviewRoute(prototypeId);
}
