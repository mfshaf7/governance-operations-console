import { NextResponse } from "next/server";
import { SourceEditorUnconfirmedSaveError, readSourceAssistantBody, readSourceSaveBody, sourceFileSelectors } from "../../../console-integration/source-authoring/server/source-editor-evidence.ts";
import { assistDeliveryEditor, readDeliveryEditorDraft, readDeliveryEditorFiles, readRetainedDeliveryEditorDraft, saveDeliveryEditorDraft } from "./delivery-source-editor-oos-client.ts";
import { DeliveryOosError, deliveryOosConfigured } from "./delivery-oos-client.ts";

const workspaceErrors: Partial<Record<string, string>> = {
  delivery_art_source_realization_worktree_dirty: "The prepared repository has uncommitted changes. Keep those changes safe and restore the prepared workspace to its approved revision, then check source again.",
  delivery_art_source_realization_source_drift: "The prepared repository no longer matches the approved source revision. Check the source workspace in the work session before continuing.",
  delivery_art_source_realization_worktree_missing: "The source workspace has not been prepared. Open the work session to prepare it before editing.",
  delivery_art_source_realization_context_unavailable: "The selected file is unavailable for text editing. Check the file type and the source available in this workspace.",
  delivery_art_source_realization_patch_required: "This file is too large to open at once. Choose a section by its starting line.",
  delivery_art_source_realization_patch_line_unavailable: "Choose a starting line within this file.",
  delivery_art_source_realization_patch_limit: "The selected file or section exceeds the editor’s text limit. Choose a smaller section if available.",
};

function deliveryFileSelectors(url: string) {
  const selected = new URL(url);
  const lines = selected.searchParams.getAll("line");
  selected.searchParams.delete("line");
  const paths = sourceFileSelectors(selected.href);
  if (lines.length && (lines.length !== 1 || paths.length !== 1 || !/^[1-9]\d{0,5}$/.test(lines[0]) || Number(lines[0]) > 262144)) {
    throw new Error("Choose one source file and a valid starting line.");
  }
  return { paths, startLine: lines.length ? Number(lines[0]) : undefined };
}

export async function deliverySourceEditorRoute(request: Request, id: string, kind: "draft" | "files" | "assist") {
  try {
    if (!deliveryOosConfigured() || !/^[1-9][0-9]*$/.test(id) || !Number.isSafeInteger(Number(id))) throw new Error("A commissioned, actual Delivery source work item is required.");
    const draftQuery = kind === "draft" && request.method === "GET" ? [...new URL(request.url).searchParams.entries()] : [];
    const retained = draftQuery.length === 1 && draftQuery[0][0] === "retained" && draftQuery[0][1] === "1";
    if (draftQuery.length && !retained) throw new Error("Select the current saved draft or its retained predecessor.");
    const result = kind === "assist" ? await assistDeliveryEditor(Number(id), await readSourceAssistantBody(request)) : request.method === "POST" ? await saveDeliveryEditorDraft(Number(id), await readSourceSaveBody(request, true))
      : kind === "files" ? await readDeliveryEditorFiles(Number(id), deliveryFileSelectors(request.url))
        : retained ? await readRetainedDeliveryEditorDraft(Number(id)) : await readDeliveryEditorDraft(Number(id));
    return NextResponse.json({ mode: "live", projection: result, error: null }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const known = error instanceof DeliveryOosError || error instanceof SourceEditorUnconfirmedSaveError;
    return NextResponse.json({ mode: "live", projection: null, code: known ? error.code : "delivery_source_editor_rejected",
      error: (error instanceof DeliveryOosError && workspaceErrors[error.code]) ||
        (kind === "assist" ? known && error.status === 409 ? "The source session changed. Your local edits are retained; reload current source before asking again." : known && [413,422].includes(error.status) ? "The selected context was not admitted. Review the allowed files or select fewer files, then ask again." : "The source assistant did not return a confirmed reply. Your files are unchanged; retry the original request or check source availability." : error instanceof SourceEditorUnconfirmedSaveError ? error.message : "The source owner did not confirm this exact read or save. Your local buffers are retained; inspect the current owner state before retrying.") },
    { status: known ? error.status : 400, headers: { "Cache-Control": "private, no-store" } });
  }
}
