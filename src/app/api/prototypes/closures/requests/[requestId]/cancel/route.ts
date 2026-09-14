import { cancelPrototypeClosureRoute } from "@/domain-workspaces/prototype";

export async function POST(_request: Request, context: { params: Promise<{ requestId: string }> }) {
  return cancelPrototypeClosureRoute((await context.params).requestId);
}
