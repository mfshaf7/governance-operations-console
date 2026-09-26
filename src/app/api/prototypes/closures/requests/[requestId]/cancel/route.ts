import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";
import { cancelPrototypeClosureRoute } from "@/domain-workspaces/prototype/server";

export async function POST(request: Request, context: { params: Promise<{ requestId: string }> }) {
  return authorizeConsoleMutation(request, async () =>
    cancelPrototypeClosureRoute((await context.params).requestId),
  );
}
