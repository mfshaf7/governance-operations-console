import { cancelPrototypeLandingRoute } from "../../../../../../../domain-workspaces/prototype/server/prototype-landing-api-routes.ts";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ requestId: string }> },
) {
  const { requestId } = await context.params;
  return cancelPrototypeLandingRoute(requestId);
}
