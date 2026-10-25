import { NextResponse } from "next/server";
import { SourceEditorUnconfirmedSaveError, readSourceSaveBody, sourceFileSelectors } from "../../../console-integration/source-authoring/server/source-editor-evidence.ts";
import { readDeliveryEditorDraft, readDeliveryEditorFiles, saveDeliveryEditorDraft } from "./delivery-source-editor-oos-client.ts";
import { DeliveryOosError, deliveryOosConfigured } from "./delivery-oos-client.ts";

export async function deliverySourceEditorRoute(request: Request, id: string, kind: "draft" | "files") {
  try {
    if (!deliveryOosConfigured() || !/^[1-9][0-9]*$/.test(id) || !Number.isSafeInteger(Number(id))) throw new Error("A commissioned, actual Delivery source work item is required.");
    const result = request.method === "POST" ? await saveDeliveryEditorDraft(Number(id), await readSourceSaveBody(request))
      : kind === "files" ? await readDeliveryEditorFiles(Number(id), sourceFileSelectors(request.url)) : await readDeliveryEditorDraft(Number(id));
    return NextResponse.json({ mode: "live", projection: result, error: null }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const known = error instanceof DeliveryOosError || error instanceof SourceEditorUnconfirmedSaveError;
    return NextResponse.json({ mode: "live", projection: null, code: known ? error.code : "delivery_source_editor_rejected",
      error: error instanceof SourceEditorUnconfirmedSaveError ? error.message : "The source owner did not confirm this exact read or save. Your local buffers are retained; inspect the current owner state before retrying." },
    { status: known ? error.status : 400, headers: { "Cache-Control": "private, no-store" } });
  }
}
