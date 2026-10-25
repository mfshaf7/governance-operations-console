import { createHash } from "node:crypto";
import { assertOperatorDraftCommand, assertSourceCapture, assertSourceDraft, sourceDate, sourceEditorLimits, sourceObject, sourcePath, type OperatorDraftCommand, type SourceEditorState } from "../source-editor-contract.ts";

export class SourceEditorUnconfirmedSaveError extends Error {
  readonly status = 502;
  readonly code = "source_editor_save_unconfirmed";
  constructor() { super("The owner may have retained this save, but exact acknowledgement/readback is unavailable. Retry the original immutable command; do not issue a replacement save."); }
}

export function sourceCanonicalText(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(sourceCanonicalText).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, value]) => `${JSON.stringify(key)}:${sourceCanonicalText(value)}`).join(",")}}`;
  return JSON.stringify(value);
}
export const sourceTextDigest = (text: string) => `sha256:${createHash("sha256").update(text, "utf8").digest("hex")}`;
export const sourceCanonicalDigest = (value: unknown) => sourceTextDigest(sourceCanonicalText(value));
export function sourceBoundedFetch(fetchImpl: typeof fetch = fetch): typeof fetch {
  return async (input, init) => {
    const response = await fetchImpl(input, { ...init, redirect: "error" }), maximum = 2 * sourceEditorLimits.wireBytes;
    if (Number(response.headers.get("content-length")) > maximum) { await response.body?.cancel(); throw new Error("Source owner response exceeds the bounded envelope."); }
    const reader = response.body?.getReader(); if (!reader) return response;
    const chunks: Uint8Array[] = []; let size = 0;
    try {
      while (true) { const chunk = await reader.read(); if (chunk.done) break; size += chunk.value.byteLength; if (size > maximum) throw new Error("Source owner response exceeds the bounded envelope."); chunks.push(chunk.value); }
    } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return new Response(bytes, { status: response.status, statusText: response.statusText, headers: response.headers });
  };
}
export function sourceFileSelectors(url: string) {
  const query = new URL(url).searchParams, paths = query.getAll("path");
  if ([...query.keys()].some(key => key !== "path") || paths.length > 48 || new Set(paths).size !== paths.length) throw new Error("Select at most 48 distinct source paths.");
  return paths.map(sourcePath);
}
export async function readSourceSaveBody(request: Request): Promise<OperatorDraftCommand> {
  const reader = request.body?.getReader(); if (!reader) throw new Error("A bounded source draft is required.");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) { const chunk = await reader.read(); if (chunk.done) break; size += chunk.value.byteLength; if (size > sourceEditorLimits.wireBytes) throw new Error("Source draft exceeds the existing 1 MiB wire budget."); chunks.push(chunk.value); }
  } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return assertOperatorDraftCommand(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)));
}
export function verifySourceCapture(value: unknown, expected: { sessionId: string; base: string; ownerRepo?: string }, paths: string[]) {
  const raw = sourceObject(value), { context_digest, ...body } = raw, result = assertSourceCapture(raw);
  if (sourceTextDigest(JSON.stringify(body)) !== context_digest || result.session_id !== expected.sessionId || result.head_commit !== expected.base || expected.ownerRepo && result.owner_repo !== expected.ownerRepo ||
      paths.length !== result.files.length || paths.some(path => !result.files.some(file => file.path === path)) || result.files.some(file => sourceTextDigest(file.content) !== file.content_digest)) throw new Error("Source files do not bind the exact clean owner base and requested text.");
  return result;
}
export function verifySourceDraft(value: unknown, expected: { sessionId: string; base: string; revision: string; digest: string | null; accepted: boolean }, workflow: "prototype-source-draft" | "delivery-art-source-draft") {
  const raw = sourceObject(value), result = assertSourceDraft(raw, workflow);
  if (sourceCanonicalDigest(raw.change_set) !== result.digest || sourceCanonicalDigest(result.objective) !== result.change_set.objective_digest || result.session_id !== expected.sessionId || result.change_set.base_commit !== expected.base || result.revision !== expected.revision || result.digest !== expected.digest || result.accepted !== expected.accepted) throw new Error("The retained draft does not bind the exact current owner session, base, objective, revision and digest.");
  return result;
}
export function verifySourceSaveAcknowledgement(raw: unknown, command: OperatorDraftCommand, expected: { sessionId: string; base: string }) {
  const ack = sourceObject(raw), attempt = sourceObject(ack.attempt), change = sourceObject(attempt.change_set);
  const changeSet = { schema_version: 1, change_set_id: `operator-change-set:${sourceCanonicalDigest(command).slice(7)}`, session_id: expected.sessionId, base_commit: expected.base,
    objective_digest: sourceCanonicalDigest(command.objective), commit_message: command.commit_message, operations: command.operations };
  if (ack.session_id !== expected.sessionId || ack.state !== "draft-ready" || attempt.execution_id !== command.execution_id || change.digest !== sourceCanonicalDigest(changeSet) || change.commit_message !== command.commit_message || attempt.objective_digest !== changeSet.objective_digest || typeof ack.replayed !== "boolean") throw new Error("The owner save acknowledgement does not bind the exact immutable command and text.");
  return { commandId: command.command_id, savedRevision: sourceDate(ack.revision), savedDigest: String(change.digest), replayed: ack.replayed };
}
export function sourceEditorState(value: { session_id: string; revision: string; state: string; attempt: null | { request_id: string; execution_id?: string; objective_digest: string; change_set: null | { digest: string } } }): SourceEditorState {
  if (value.attempt && !value.attempt.execution_id) throw new Error("The current source attempt has no exact execution binding.");
  return { sessionId: value.session_id, revision: value.revision, state: value.state,
    attempt: value.attempt ? { requestId: value.attempt.request_id, executionId: value.attempt.execution_id!, objectiveDigest: value.attempt.objective_digest, digest: value.attempt.change_set?.digest ?? null } : null };
}
