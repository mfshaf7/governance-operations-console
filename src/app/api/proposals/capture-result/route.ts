import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";
import { lookupProposalCaptureRoute } from "../../../../domain-workspaces/proposal/server/proposal-api-routes.ts";
import type { NextRequest } from "next/server";
export async function POST(request:NextRequest) { return authorizeConsoleMutation(request,()=>lookupProposalCaptureRoute(request)); }
