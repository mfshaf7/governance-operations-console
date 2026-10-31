import { resolveConsoleOosOperatorConfiguration, type ConsoleOosOperatorConfiguration } from "../../console-integration/configuration/console-runtime-configuration.ts";
import { consoleMutationAttributionHeaders } from "../../console-integration/identity/server/console-session-authorization.ts";
import { aiActivityTasks, type AiActivitySnapshot, type RecentAiActivity } from "../model/recent-ai-activity.ts";

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("AI history returned an invalid projection.");
  return value as Record<string, unknown>;
}
function exact(value: Record<string, unknown>, keys: readonly string[]) {
  if (Object.keys(value).length !== keys.length || keys.some(key => !(key in value))) throw Error("AI history returned unexpected fields.");
}
function text(value: unknown, max = 1024, nullable = false): asserts value is string | null {
  if (nullable && value === null) return;
  if (typeof value !== "string" || !value || value.length > max || /[\u0000-\u001f]/u.test(value)) throw Error("AI history returned invalid metadata.");
}

export function decodeAiActivityPage(value: unknown, identity: { callerId: string; operatorId: string }): AiActivitySnapshot {
  const page = object(value);
  exact(page, ["schema_version", "artifact_type", "caller_id", "operator_id", "observed_at", "items", "next_cursor", "coverage"]);
  if (page.schema_version !== 1 || page.artifact_type !== "ai-activity-page" || page.caller_id !== identity.callerId || page.operator_id !== identity.operatorId ||
      typeof page.observed_at !== "string" || !Number.isFinite(Date.parse(page.observed_at)) || !Array.isArray(page.items) || page.items.length > 50) throw Error("AI history identity or page boundary did not match.");
  text(page.coverage, 500); text(page.next_cursor, 2048, true);
  if (typeof page.next_cursor === "string" && !/^[A-Za-z0-9_-]+$/.test(page.next_cursor)) throw Error("AI history cursor is invalid.");
  const ids = new Set<string>();
  const items: RecentAiActivity[] = page.items.map(value => {
    const row = object(value);
    exact(row, ["id", "source", "session_ref", "invocation_id", "kind", "subject_ref", "state", "requested_at", "completed_at", "receipt_ref", "audit_ref", "context_ref", "error_code"]);
    text(row.id, 600);
    if (ids.has(row.id as string)) throw Error("AI history repeated a request identity.");
    ids.add(row.id as string);
    if (!["agent-console", "work-design", "refinement"].includes(String(row.source)) || !["working", "completed", "failed", "cancelled", "interrupted"].includes(String(row.state)) ||
        (row.kind !== null && (typeof row.kind !== "string" || !aiActivityTasks[row.kind]))) throw Error("AI history returned an unknown request kind or state.");
    for (const key of ["session_ref", "invocation_id", "subject_ref", "audit_ref", "context_ref", "error_code"]) text(row[key], 1024, true);
    if (typeof row.requested_at !== "string" || !Number.isFinite(Date.parse(row.requested_at)) ||
        (row.completed_at !== null && (typeof row.completed_at !== "string" || !Number.isFinite(Date.parse(row.completed_at)) || Date.parse(row.completed_at) < Date.parse(row.requested_at)))) throw Error("AI history has invalid request times.");
    const terminal = ["completed", "failed", "cancelled"].includes(String(row.state));
    if ((terminal && row.completed_at === null) || (!terminal && row.completed_at !== null)) throw Error("AI history has an unsettled terminal outcome.");
    let receiptRef: string | null = null;
    if (row.receipt_ref !== null) {
      const receipt = object(row.receipt_ref); exact(receipt, ["uri", "digest"]); text(receipt.uri);
      if (typeof receipt.digest !== "string" || !/^sha256:[a-f0-9]{64}$/.test(receipt.digest)) throw Error("AI history receipt digest is invalid.");
      receiptRef = receipt.uri as string;
    }
    if (row.source === "agent-console" && ["completed", "failed", "cancelled"].includes(String(row.state)) && receiptRef === null) throw Error("AI history terminal invocation has no receipt.");
    if (row.source !== "agent-console" && row.state === "completed" && (!row.audit_ref || !row.context_ref)) throw Error("AI history completed advice has no governed evidence.");
    const display = row.kind ? aiActivityTasks[row.kind as string] : ["Assistant request", "Agent Console"];
    return { id: row.id as string, task: display[0], surface: display[1], subject: row.subject_ref as string ?? "Item not recorded",
      state: row.state as RecentAiActivity["state"], occurredAt: row.requested_at as string,
      kind: row.kind as string | null, subjectRef: row.subject_ref as string | null, receiptRef,
      auditRef: row.audit_ref as string | null, contextRef: row.context_ref as string | null, sessionRef: row.session_ref as string | null,
      errorCode: row.error_code as string | null,
      detail: row.kind === null ? "This older request has no recorded task or item metadata. Its outcome and retained evidence are shown as recorded."
        : row.state === "interrupted" ? "No current owner process confirms this unfinished request. Completion is unconfirmed."
          : "Recorded AI request outcome. Completing assistance does not approve, submit or apply its workflow.",
    };
  });
  return { mode: "live", status: "current", observedAt: page.observed_at, items, nextCursor: page.next_cursor as string | null, coverage: page.coverage as string, error: null };
}

export async function readAiActivity({ cursor, config = resolveConsoleOosOperatorConfiguration(), fetchImpl = fetch, signal }: {
  cursor?: string | null; config?: ConsoleOosOperatorConfiguration; fetchImpl?: typeof fetch; signal?: AbortSignal;
} = {}) {
  const query = new URLSearchParams({ limit: "10" }); if (cursor) query.set("cursor", cursor);
  const response = await fetchImpl(`${config.baseUrl}/v1/agent-console/activity?${query}`, {
    cache: "no-store", signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(12000)]) : AbortSignal.timeout(12000),
    headers: { ...consoleMutationAttributionHeaders(), Accept: "application/json", "x-oos-caller-id": config.callerId, "x-oos-caller-secret": config.callerSecret, "x-oos-operator-id": config.operatorId },
  });
  if (!response.ok) throw Error("AI request history is unavailable from its owner.");
  if (!response.body) throw Error("AI history returned no projection.");
  const reader = response.body.getReader(); let size = 0; const chunks: Uint8Array[] = [];
  try { for (;;) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > 131072) { await reader.cancel(); throw Error("AI history exceeded its bounded projection."); } chunks.push(part.value); } }
  finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const page = decodeAiActivityPage(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)), config);
  if (page.items.length > 10) throw Error("AI history exceeded the requested page size.");
  return page;
}
