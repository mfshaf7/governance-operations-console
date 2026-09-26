export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";

import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";
import {
  captureProposalRoute,
  listProposalsRoute,
} from "../../../domain-workspaces/proposal/server/proposal-api-routes.ts";

export const GET = listProposalsRoute;

export async function POST(request: NextRequest) {
  return authorizeConsoleMutation(request, () => captureProposalRoute(request));
}
