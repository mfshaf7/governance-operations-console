import { NextResponse, type NextRequest } from "next/server";
import { consoleOosModeSelected } from "../../../console-integration/configuration/console-runtime-configuration.ts";
import { commandRepositoryBootstrap, createRepositoryBootstrap, listRepositoryBootstraps, prepareRepositoryBootstrap, readRepositoryBootstrap,
  readRepositoryBootstrapDraft, RepositoryBootstrapOosError } from "./repository-bootstrap-oos-client.ts";
const headers = { "Cache-Control": "no-store" };
export function repositoryBootstrapReadRoute(owner: string | null, id: string | null = null, draft = false) {
  return respond(() => id ? draft ? readRepositoryBootstrapDraft(id) : readRepositoryBootstrap(id) : listRepositoryBootstraps(owner ?? ""));
}
export function repositoryBootstrapWriteRoute(request: NextRequest, operation: "prepare" | "create" | "command", id: string | null = null) {
  return respond(async () => {
    const raw = await request.text(); if (Buffer.byteLength(raw) > 73_728) throw new Error("Bounded owner setup intent required.");
    const body: unknown = JSON.parse(raw);
    return operation === "prepare" ? prepareRepositoryBootstrap(body) : operation === "create" ? createRepositoryBootstrap(body) : commandRepositoryBootstrap(id ?? "", body);
  });
}
async function respond(operation: () => Promise<unknown>) {
  if (!consoleOosModeSelected()) return NextResponse.json({ mode: "disconnected-preview", projection: null, error: "Owner setup requires the commissioned OOS workflow; no fixture source execution is available." }, { headers, status: 503 });
  try { return NextResponse.json({ mode: "live", projection: await operation(), error: null }, { headers }); }
  catch (error) { return NextResponse.json({ mode: "live", projection: null, code: error instanceof RepositoryBootstrapOosError ? error.code : "repository_bootstrap_contract_rejected",
    error: "The owner did not confirm this exact setup. Refresh the original request; source readiness, app acceptance and admission remain separate." }, { headers, status: error instanceof RepositoryBootstrapOosError ? error.status : 400 }); }
}
