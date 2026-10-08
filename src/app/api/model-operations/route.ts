export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";

import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";
import {
  listModelOperationsRoute,
  submitModelProfileRequestRoute,
} from "@/domain-workspaces/model-operations/server";

export const GET = listModelOperationsRoute;

export async function POST(request: NextRequest) {
  return authorizeConsoleMutation(request, () =>
    submitModelProfileRequestRoute(request),
  );
}
