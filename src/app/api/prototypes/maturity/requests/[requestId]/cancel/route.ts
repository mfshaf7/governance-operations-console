import { cancelPrototypeMaturityRoute } from "../../../../../../../domain-workspaces/prototype/server/prototype-maturity-api-routes.ts";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ requestId: string }> },
) {
  const { requestId } = await context.params;
  return cancelPrototypeMaturityRoute(requestId);
}
