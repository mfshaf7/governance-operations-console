import { NextResponse, type NextRequest } from "next/server";
import { ConsoleRuntimeConfigurationError } from "../../../console-integration/configuration/console-runtime-configuration.ts";
import { createModelRuntimeClient, ModelRuntimeServiceError } from "./model-runtime-oos-client.ts";
import { modelText, ModelRuntimeContractError } from "../work-model/model-runtime-contract.ts";

export async function modelRuntimeRoute(request: NextRequest, path: string[]) {
  try {
    const client = createModelRuntimeClient();
    const method = request.method;
    let result: unknown;
    if (path[0] === "connections") {
      if (method === "GET" && path.length === 1) result = await client.connections();
      else if (method === "GET" && path.length === 3 && path[1] === "operations") result = await client.connectionOperation(path[2]);
      else if (method === "POST" && path.length === 2 && ["commands", "credentials", "reconcile"].includes(path[1])) {
        const raw = await request.text();
        if (new TextEncoder().encode(raw).byteLength > 16_384) return NextResponse.json({ error: "Connection input exceeds its limit." }, { status: 413 });
        const input: unknown = JSON.parse(raw);
        result = path[1] === "credentials" ? await client.connectionCredentials(input) : path[1] === "commands" ? await client.connectionCommand(input) : await client.reconcileConnection(input);
      } else return NextResponse.json({ error: "Connection route not found." }, { status: 404 });
    } else if (method === "GET" && path.join("/") === "registry") result = await client.registry();
    else if (method === "GET" && path.join("/") === "catalogue") {
      const backend = request.nextUrl.searchParams.get("backend_id"), model = request.nextUrl.searchParams.get("model");
      if (!modelText(backend) || model !== null && !modelText(model)) throw new ModelRuntimeContractError();
      result = await client.catalogue(backend, model);
    } else if (method === "GET" && path.join("/") === "requests") result = await client.list(request.nextUrl.searchParams.get("cursor"));
    else if (method === "GET" && path.length === 2 && path[0] === "requests") result = await client.get(path[1]);
    else if (method === "POST" && (path.join("/") === "requests" || path.length === 3 && path[0] === "requests" && path[2] === "controls")) {
      const raw = await request.text();
      if (new TextEncoder().encode(raw).byteLength > 65_536) return NextResponse.json({ error: "The model operation exceeds its input limit." }, { status: 413 });
      const input: unknown = JSON.parse(raw);
      result = path.length === 1 ? await client.submit(input) : await client.control(path[1], input);
    } else return NextResponse.json({ error: "Model operation route not found." }, { status: 404 });
    return NextResponse.json(result, { status: method === "POST" && path.length === 1 ? 202 : 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof ModelRuntimeServiceError ? error.status :
      error instanceof ConsoleRuntimeConfigurationError ? 503 :
      error instanceof ModelRuntimeContractError || error instanceof SyntaxError ? 400 : 502;
    return NextResponse.json({
      code: error instanceof ModelRuntimeServiceError || error instanceof ConsoleRuntimeConfigurationError ? error.code : "model_operations_request_invalid",
      error: error instanceof ModelRuntimeServiceError ? error.message :
        status === 503 ? "Runtime model controls are not configured." : "The model operation could not be confirmed. Refresh its owner state.",
      status: "unavailable",
    }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
