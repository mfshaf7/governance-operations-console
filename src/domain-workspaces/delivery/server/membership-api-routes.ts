import type { NextRequest } from "next/server";
import { assertMembershipOutcome, assertMembershipProjection } from "../live-runtime/membership-contract.ts";
import { DeliveryOosError, deliveryOosRequest, resolveDeliveryOosConfig } from "./delivery-oos-client.ts";

const headers = { "Cache-Control": "no-store" };
export async function membershipApiRoute(request: NextRequest) {
  try {
    const config = resolveDeliveryOosConfig();
    if (request.method === "GET") {
      const result = await deliveryOosRequest(config, `/v1/delivery-memberships/projection${request.nextUrl.search}`, { method: "GET", headers: { "x-oos-operator-id": config.operatorId } });
      return Response.json(assertMembershipProjection(result), { headers });
    }
    if (request.headers.get("origin") !== request.nextUrl.origin || request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
      return Response.json({ code: "membership_origin_denied", message: "Submit project membership changes from this Console." }, { status: 403, headers });
    }
    const length = Number(request.headers.get("content-length"));
    if (Number.isFinite(length) && length > 8192) return Response.json({ message: "The membership request is too large." }, { status: 413, headers });
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 8192) return Response.json({ message: "The membership request is too large." }, { status: 413, headers });
    try { JSON.parse(raw); } catch { return Response.json({ message: "The membership request must be valid JSON." }, { status: 400, headers }); }
    // Preserve the original transport text so OOS's strict duplicate-key
    // parser sees it. Re-serialization would silently accept last-key-wins.
    const result = await deliveryOosRequest(config, "/v1/delivery-memberships/mutations", { method: "POST", headers: { "x-oos-operator-id": config.operatorId }, body: raw });
    return Response.json(assertMembershipOutcome(result), { headers });
  } catch (error) {
    return Response.json({ code: error instanceof DeliveryOosError ? error.code : "membership_response_invalid",
      message: error instanceof Error ? error.message : "Project members are unavailable." }, { status: error instanceof DeliveryOosError ? error.status : 502, headers });
  }
}
