import { NextResponse } from "next/server";
import { readConsoleOperatorIdentity } from "@/console-integration/identity/server/console-operator-identity-route";

export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json(await readConsoleOperatorIdentity(), { headers: { "Cache-Control": "no-store" } });
}
