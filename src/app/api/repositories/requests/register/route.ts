import { NextResponse } from "next/server";
import { readRepositoryRequestRegister } from "../../../../../domain-workspaces/operation-integrations/server/repository-request-register-query.ts";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  try { return NextResponse.json(await readRepositoryRequestRegister(new URL(request.url).searchParams, request.signal), { headers }); }
  catch (error) {
    const code = Number((error as { status?: number }).status);
    const status = [400, 401, 403].includes(code) ? code : 503;
    return NextResponse.json({ mode: "live", status: "offline", error: "Repository requests could not be verified. Retry this page." }, { headers, status });
  }
}
