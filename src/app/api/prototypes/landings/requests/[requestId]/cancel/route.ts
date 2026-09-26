import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";
import { cancelPrototypeLandingRoute } from "../../../../../../../domain-workspaces/prototype/server/prototype-landing-api-routes.ts";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ requestId: string }> },
) {
  return authorizeConsoleMutation(request, async () => {
    const { requestId } = await context.params;
    return cancelPrototypeLandingRoute(requestId);
  });
}
