import { NextRequest, NextResponse } from "next/server";
import { completionTargetId } from "../../../../../../domain-workspaces/delivery/live-runtime/delivery-item-completion-contract.ts";
import { readItemCompletionContext, submitItemCompletion } from "../../../../../../domain-workspaces/delivery/server/delivery-item-completion-client.ts";
import { deliveryOosConfigured, DeliveryOosError } from "../../../../../../domain-workspaces/delivery/server/delivery-oos-client.ts";
import { authorizeConsoleMutation } from "../../../../../../console-integration/identity/server/console-session-authorization.ts";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
type Context = { params: Promise<{ workItemId: string }> };

export async function GET(request: NextRequest, { params }: Context) {
  try {
    if (!deliveryOosConfigured()) return NextResponse.json({ mode: "disconnected-preview", context: null }, { headers });
    const includeCompletedChildEvidence = request.nextUrl.searchParams.get("include_completed_child_evidence") === "true";
    const context = await readItemCompletionContext(completionTargetId((await params).workItemId),
      { includeCompletedChildEvidence, includeRecordedCompletion: !includeCompletedChildEvidence });
    return NextResponse.json({ mode: "live", context }, { headers });
  } catch (error) { return failure(error); }
}

export async function POST(request: NextRequest, { params }: Context) {
  return authorizeConsoleMutation(request, async () => {
  try {
    if (!deliveryOosConfigured()) throw new Error("Non-source completion requires its live broker.");
    const result = await submitItemCompletion(completionTargetId((await params).workItemId), await request.json(), { includeRecordedCompletion: true });
    return NextResponse.json({ mode: "live", ...result }, { headers });
  } catch (error) { return failure(error); }
  });
}

function failure(error: unknown) {
  return NextResponse.json({ mode: "live", code: error instanceof DeliveryOosError ? error.code : "delivery_completion_invalid",
    error: error instanceof Error ? error.message : "Completion is unavailable." },
  { headers, status: error instanceof DeliveryOosError ? error.status : 400 });
}
