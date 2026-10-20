import { NextResponse, type NextRequest } from "next/server";
import { PlatformOperationOosError } from "./platform-operation-oos-client.ts";
import { commandSourceAuthorization, listSourceAuthorizations, prepareSourceAuthorization, readSourceAuthorization } from "./source-authorization-oos-client.ts";
const headers = { "Cache-Control": "no-store" };
export function readSourceAuthorizationRoute(intentId: string | null = null) {
  return response(() => intentId ? readSourceAuthorization(intentId) : listSourceAuthorizations());
}
export function writeSourceAuthorizationRoute(request: NextRequest, intentId: string | null = null) {
  return response(async () => {
    const raw = await request.text(); if (Buffer.byteLength(raw) > 32768) throw new Error("Bounded source intent required.");
    const value: unknown = JSON.parse(raw);
    return intentId ? commandSourceAuthorization(intentId, value) : prepareSourceAuthorization(value);
  });
}
async function response(operation: () => Promise<unknown>) {
  try { return NextResponse.json({ mode: "live", projection: await operation(), error: null }, { headers }); }
  catch (error) { return NextResponse.json({ mode: "live", projection: null, code: error instanceof PlatformOperationOosError ? error.code : "source_authorization_rejected", error: "The source owner has not confirmed this exact authorization. Refresh its retained scope and Platform operation; no credential is available to browser code." }, { headers, status: error instanceof PlatformOperationOosError ? error.status : 400 }); }
}
