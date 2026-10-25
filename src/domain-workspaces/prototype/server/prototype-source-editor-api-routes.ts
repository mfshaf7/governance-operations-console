import { NextResponse } from "next/server";
import { SourceEditorUnconfirmedSaveError, readSourceSaveBody, sourceFileSelectors } from "../../../console-integration/source-authoring/server/source-editor-evidence.ts";
import { readPrototypeEditorFiles, savePrototypeEditorDraft } from "./prototype-source-editor-oos-client.ts";
import { consoleOosModeSelected } from "../../../console-integration/configuration/console-runtime-configuration.ts";
import { PrototypeLandingOosError } from "./prototype-landing-oos-client.ts";
export async function prototypeSourceEditorRoute(request: Request, id: string) {
  try {
    if (!consoleOosModeSelected()) throw new Error("Use the commissioned live source workflow.");
    const projection = request.method === "POST" ? await savePrototypeEditorDraft(id, await readSourceSaveBody(request)) : await readPrototypeEditorFiles(id, sourceFileSelectors(request.url));
    return NextResponse.json({ mode: "live", projection, error: null }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const known = error instanceof PrototypeLandingOosError || error instanceof SourceEditorUnconfirmedSaveError;
    return NextResponse.json({ mode: "live", projection: null, code: known ? error.code : "prototype_source_editor_rejected",
      error: error instanceof SourceEditorUnconfirmedSaveError ? error.message : "The source owner did not confirm this exact read or save. Your buffers are retained; inspect the current owner request before retrying." },
    { status: known ? error.status : 400, headers: { "Cache-Control": "private, no-store" } });
  }
}
