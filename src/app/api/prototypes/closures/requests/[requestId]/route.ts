import { readPrototypeClosureRoute } from "@/domain-workspaces/prototype/server";

export async function GET(_request: Request, context: { params: Promise<{ requestId: string }> }) {
  return readPrototypeClosureRoute((await context.params).requestId);
}
