import { readPrototypeLandingRoute } from "../../../../../../domain-workspaces/prototype/server/prototype-landing-api-routes.ts";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ requestId: string }> },
) {
  const { requestId } = await context.params;
  return readPrototypeLandingRoute(requestId);
}
