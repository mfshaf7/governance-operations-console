import type { NextRequest } from "next/server";
import { decidePrototypeClosureRoute } from "@/domain-workspaces/prototype";

export async function POST(request: NextRequest, context: { params: Promise<{ requestId: string }> }) {
  return decidePrototypeClosureRoute(request, (await context.params).requestId);
}
