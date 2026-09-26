import type { NextRequest } from "next/server";
import { preparePrototypeClosureRoute } from "@/domain-workspaces/prototype/server";

export async function POST(request: NextRequest) {
  return preparePrototypeClosureRoute(request);
}
