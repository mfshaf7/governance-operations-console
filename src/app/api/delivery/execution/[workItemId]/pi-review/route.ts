import { NextRequest, NextResponse } from "next/server";
import { completionTargetId } from "../../../../../../domain-workspaces/delivery/live-runtime/delivery-item-completion-contract.ts";
import { submitItemPiReview } from "../../../../../../domain-workspaces/delivery/server/delivery-item-completion-client.ts";
import { DeliveryOosError, deliveryOosConfigured } from "../../../../../../domain-workspaces/delivery/server/delivery-oos-client.ts";
import { authorizeConsoleMutation } from "../../../../../../console-integration/identity/server/console-session-authorization.ts";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ workItemId: string }> }) {
  return authorizeConsoleMutation(request, async () => {
    try {
      if (!deliveryOosConfigured()) throw new Error("PI review requires its live broker.");
      const result = await submitItemPiReview(completionTargetId((await params).workItemId), await request.json());
      return NextResponse.json({ mode: "live", ...result }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      return NextResponse.json({ mode: "live", code: error instanceof DeliveryOosError ? error.code : "delivery_pi_review_invalid",
        error: error instanceof Error ? error.message : "PI review is unavailable." },
      { status: error instanceof DeliveryOosError ? error.status : 400, headers: { "Cache-Control": "no-store" } });
    }
  });
}
