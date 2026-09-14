import { continuePrototypeClosureRoute } from "@/domain-workspaces/prototype";

export async function POST(_request: Request, context: { params: Promise<{ requestId: string }> }) {
  return continuePrototypeClosureRoute((await context.params).requestId);
}
