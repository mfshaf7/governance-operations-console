import { NextResponse } from "next/server";
import { consoleOosModeSelected, resolveConsoleOosOperatorConfiguration } from "../configuration/console-runtime-configuration.ts";
import { consoleMutationAttributionHeaders } from "../identity/server/console-session-authorization.ts";
import { acceptCurrentConsoleSourceProjection, consoleSourceProjectionHeaders } from "../source-authority/console-source-authority.ts";

const headers = { "Cache-Control": "no-store" };
const maxBytes = 4 * 1024 * 1024;

export function savedWorkConfigured() { return consoleOosModeSelected(); }
export function savedWorkPreviewResponse() { return NextResponse.json({ mode: "disconnected-preview", snapshot: null }, { headers }); }

export async function savedWorkRoute(request: Request, kind: string, subjectId: string) {
  try {
    if (!["work-design", "refinement", "orchestration"].includes(kind) || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,200}$/.test(subjectId))
      return NextResponse.json({ error: "Invalid saved-work subject." }, { status: 400, headers });
    const config = resolveConsoleOosOperatorConfiguration();
    const url = new URL(request.url);
    if (request.method === "POST" && (request.headers.get("sec-fetch-site") === "cross-site" ||
        (request.headers.has("origin") && request.headers.get("origin") !== url.origin)))
      return NextResponse.json({ error: "Use the same-origin Console save action." }, { status: 403, headers });
    const base = `/v1/operator-saved-work/${kind}/${encodeURIComponent(subjectId)}`;
    const query = new URLSearchParams();
    for (const name of ["action", "recovery_id"]) if (url.searchParams.has(name)) query.set(name, url.searchParams.get(name)!);
    const suffix = query.size ? `?${query}` : "";
    let body: string | undefined;
    if (request.method === "POST") {
      if (!request.headers.get("content-type")?.startsWith("application/json"))
        return NextResponse.json({ error: "Saved work requires JSON input." }, { status: 415, headers });
      const reader = request.body?.getReader(); const chunks: Uint8Array[] = []; let count = 0;
      if (reader) for (;;) {
        const next = await reader.read(); if (next.done) break;
        count += next.value.byteLength;
        if (count > maxBytes) { await reader.cancel(); return NextResponse.json({ error: "Saved work exceeds the save limit." }, { status: 413, headers }); }
        chunks.push(next.value);
      }
      body = Buffer.concat(chunks).toString("utf8");
    }
    const response = await fetch(`${config.baseUrl}${base}${suffix}`, {
      method: request.method, cache: "no-store", signal: AbortSignal.timeout(15_000), body,
      headers: { ...(request.method === "GET" ? consoleSourceProjectionHeaders() : { Accept: "application/json" }),
        ...consoleMutationAttributionHeaders(), "Content-Type": "application/json", "x-oos-caller-id": config.callerId,
        "x-oos-caller-secret": config.callerSecret, "x-oos-operator-id": config.operatorId },
    });
    const value: unknown = await response.json();
    if (!response.ok) {
      const error = value as { code?: string; error?: string; message?: string };
      return NextResponse.json({ error: error.message ?? "The saved-work owner rejected this request.", code: error.code ?? error.error }, { status: response.status, headers });
    }
    const snapshot = request.method === "GET" ? acceptCurrentConsoleSourceProjection(value, {
      authority: "operator-orchestration-service", sourceOwner: "operator-orchestration-service", recordRef: `oos://operator-saved-work/${kind}/${subjectId}`,
    }) : value;
    return NextResponse.json({ mode: "live", operatorId: config.operatorId, snapshot }, { headers });
  } catch {
    return NextResponse.json({ error: "Server save or recovery is unavailable. Your browser copy is retained." }, { status: 503, headers });
  }
}
