import type { NextRequest } from "next/server";
import { submitPrototypeClosureRoute } from "@/domain-workspaces/prototype";

export async function POST(request: NextRequest) {
  return submitPrototypeClosureRoute(request);
}
