import { NextResponse } from "next/server";
import { consoleOosModeSelected, resolveConsoleOosOperatorConfiguration } from "../../../console-integration/configuration/console-runtime-configuration.ts";
import { readSavedProjectOverview, readSavedProjectRun, readSavedProjectRunIntent } from "../../../console-integration/source-authoring/saved-project-runtime-contract.ts";
import { sourceId } from "../../../console-integration/source-authoring/source-editor-contract.ts";
import { prototypeSourceRequestId } from "../live-runtime/prototype-source-contract.ts";
import { PrototypeLandingOosError, prototypeOwnerRequest } from "./prototype-landing-oos-client.ts";

const headers = { "Cache-Control": "no-store" };
const owner = { authority: "operator-orchestration-service", sourceOwner: "operator-orchestration-service" };

export async function prototypeProjectRuntimeRoute(request: Request, requestId: string, action: "overview" | "run" | "command", commandId?: string) {
  if (!consoleOosModeSelected()) {
    return NextResponse.json({ projection: null, code: "project_runtime_unavailable", error: "The shared runtime is unavailable." }, { headers, status: 503 });
  }
  try {
    const id = prototypeSourceRequestId(requestId);
    const command = commandId === undefined ? null : sourceId(commandId);
    const base = `/v1/prototype-source-requests/${encodeURIComponent(id)}/project-runtime`;
    const recordRef = `oos://prototype-source-requests/${id}/project-runtime${command ? `/commands/${command}` : ""}`;
    const url = new URL(request.url);
    const query = url.searchParams;
    if (action === "overview") {
      if ([...query.keys()].some(key => key !== "before" || query.getAll(key).length !== 1) ||
          query.has("before") && !/^[1-9][0-9]{0,15}$/.test(query.get("before") ?? "")) {
        throw Error("Choose a valid runtime history page.");
      }
    } else if (query.size) {
      throw Error("Choose the exact original runtime command.");
    }
    const path = action === "run" ? `${base}/run` : command ? `${base}/commands/${encodeURIComponent(command)}` :
      `${base}${query.size ? `?${query}` : ""}`;
    let body;
    if (action === "run") {
      const raw = await request.text();
      if (Buffer.byteLength(raw) > 4096) throw Error("The saved-source request is too large.");
      body = readSavedProjectRunIntent(JSON.parse(raw));
    } else if (request.method === "POST") {
      body = {};
    }
    const config = resolveConsoleOosOperatorConfiguration();
    const response = await prototypeOwnerRequest(path, {
      method: request.method, headers: { "x-oos-operator-id": config.operatorId }, redirect: "error",
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }, { config }, request.method === "GET" ? { ...owner, recordRef } : undefined, 256 * 1024, action === "run" ? 90000 : 20000);
    const projection = action === "overview" ? readSavedProjectOverview(response) : readSavedProjectRun(response);
    if (action !== "overview" && "acknowledgement" in projection &&
        (projection.acknowledgement.command_id !== (command ?? (body && "command_id" in body ? body.command_id : null)) ||
        body && "source_digest" in body && (projection.source_digest !== body.source_digest ||
          projection.source_revision !== body.source_revision || projection.configuration_revision !== body.configuration_revision))) {
      throw Error("The result is for a different saved-source command.");
    }
    return NextResponse.json({ projection, error: null }, { headers, status: action === "run" ? 202 : 200 });
  } catch (failure) {
    const ownerFailure = failure instanceof PrototypeLandingOosError;
    const code = ownerFailure ? failure.code : "project_runtime_invalid_response";
    const error = code === "project_runtime_setup_unavailable" ? "This project needs a reviewed runtime setup." :
      code === "project_runtime_selection_changed" ? "The saved source or setup changed. Review the current version before running." :
      "The runtime owner did not confirm this operation. Check the original result or refresh the setup.";
    return NextResponse.json({ projection: null, code, error }, { headers, status: ownerFailure ? failure.status : 400 });
  }
}
