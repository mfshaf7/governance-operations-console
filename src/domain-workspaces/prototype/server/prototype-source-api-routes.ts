import { NextResponse, type NextRequest } from "next/server";
import { consoleOosModeSelected } from "../../../console-integration/configuration/console-runtime-configuration.ts";
import { assertPrototypeSourceIntent } from "../live-runtime/prototype-source-contract.ts";
import { PrototypeLandingOosError } from "./prototype-landing-oos-client.ts";
import { commandPrototypeSource, createPrototypeSource, listPrototypeSources, readPrototypeSource, readPrototypeSourceDraft } from "./prototype-source-oos-client.ts";

const headers = { "Cache-Control": "no-store" };
export async function prototypeSourceReadRoute(requestId: string | null = null, draft = false) {
  return respond(async () => requestId ? draft ? readPrototypeSourceDraft(requestId) : readPrototypeSource(requestId) : listPrototypeSources());
}
export async function prototypeSourceWriteRoute(request: NextRequest, requestId: string | null = null, action: string | null = null) {
  return respond(async () => {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 65536) throw new Error("Source intent exceeds its bounded input size.");
    const body: unknown = JSON.parse(raw);
    if (!requestId) return createPrototypeSource(body);
    const intent = assertPrototypeSourceIntent(body);
    if (intent.action !== action) throw new Error("Source action does not match its route.");
    return commandPrototypeSource(requestId, intent);
  });
}
async function respond(operation: () => Promise<unknown>) {
  if (!consoleOosModeSelected()) return NextResponse.json({ mode: "disconnected-preview", projection: null, error: "Prototype source authoring requires the commissioned live workflow; no fixture execution is available." }, { headers, status: 503 });
  try { return NextResponse.json({ mode: "live", projection: await operation(), error: null }, { headers }); }
  catch (error) {
    const known = error instanceof PrototypeLandingOosError;
    return NextResponse.json({ mode: "live", projection: null, code: known ? error.code : "prototype_source_contract_rejected", error: "The source owner did not confirm this exact request. Refresh the retained request before retrying; source and lifecycle completion are not implied." }, { headers, status: known ? error.status : 400 });
  }
}
