import { NextRequest } from "next/server";
import { authorizeConsoleMutation } from "@/console-integration/identity/server/console-session-authorization";
import { membershipApiRoute } from "@/domain-workspaces/delivery/server";
export const dynamic = "force-dynamic";
export function GET(request: NextRequest) { return authorizeConsoleMutation(request, () => membershipApiRoute(request)); }
export function POST(request: NextRequest) { return authorizeConsoleMutation(request, () => membershipApiRoute(request)); }
