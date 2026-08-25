import type { NextRequest } from "next/server";

import { applyPrototypeDeliveryApplicationRoute } from "../../../../domain-workspaces/prototype/server/prototype-delivery-api-routes.ts";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return applyPrototypeDeliveryApplicationRoute(request);
}
