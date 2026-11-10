import { NextResponse } from "next/server";
import { SourceEditorUnconfirmedSaveError, readSourceSaveBody, sourceFileSelectors } from "../../../console-integration/source-authoring/server/source-editor-evidence.ts";
import { assistPrototypeEditor, readPrototypeEditorFiles, savePrototypeEditorDraft } from "./prototype-source-editor-oos-client.ts";
import { consoleOosModeSelected } from "../../../console-integration/configuration/console-runtime-configuration.ts";
import { PrototypeLandingOosError } from "./prototype-landing-oos-client.ts";
export async function prototypeSourceEditorRoute(request: Request, id: string, kind: "files" | "assist" = "files") {
  try {
    if (!consoleOosModeSelected()) throw new Error("Use the commissioned live source workflow.");
    const projection = kind === "assist" ? await assistPrototypeEditor(id, await readSourceSaveBody(request)) : request.method === "POST" ? await savePrototypeEditorDraft(id, await readSourceSaveBody(request)) : await readPrototypeEditorFiles(id, sourceFileSelectors(request.url));
    return NextResponse.json({ mode: "live", projection, error: null }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const known = error instanceof PrototypeLandingOosError || error instanceof SourceEditorUnconfirmedSaveError;
    return NextResponse.json({ mode: "live", projection: null, code: known ? error.code : "prototype_source_editor_rejected",
      error: kind === "assist" ? known && error.status === 409 ? "The source session changed. Your local edits are retained; reload current source before asking again." : known && [413,422].includes(error.status) ? "The selected context was not admitted. Review the allowed files or select fewer files, then ask again." : "The source assistant did not return a confirmed reply. Your files are unchanged; retry the original request or check source availability." : error instanceof SourceEditorUnconfirmedSaveError ? error.message : "The source owner did not confirm this exact read or save. Your buffers are retained; inspect the current owner request before retrying." },
    { status: known ? error.status : 400, headers: { "Cache-Control": "private, no-store" } });
  }
}
