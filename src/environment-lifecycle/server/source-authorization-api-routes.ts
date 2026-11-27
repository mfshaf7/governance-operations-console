import { NextResponse, type NextRequest } from "next/server";
import { PlatformOperationOosError } from "./platform-operation-oos-client.ts";
import { commandSourceAuthorization, listSourceAuthorizations, prepareSourceAuthorization, readSourceAuthorization } from "./source-authorization-oos-client.ts";
const headers = { "Cache-Control": "no-store" };
export function readSourceAuthorizationRoute(intentId: string | null = null, workItemRef: string | null = null) {
  return response(() => intentId ? readSourceAuthorization(intentId) : listSourceAuthorizations({ workItemRef }));
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
  catch (error) {
    const ownerError = error instanceof PlatformOperationOosError ? error : null;
    return NextResponse.json({
      mode: "live", projection: null,
      code: ownerError?.code ?? "source_authorization_rejected",
      error: ownerError?.retryable
        ? "The source operation has no confirmed result yet. Check its status before retrying the same request."
        : "The source authorization request was rejected. Refresh the source scope before trying again.",
    }, { headers, status: ownerError?.status ?? 400 });
  }
}
