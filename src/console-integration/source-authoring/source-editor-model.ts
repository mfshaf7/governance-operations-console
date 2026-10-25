import { assertSourceOperations, type SourceDraft, type SourceEditorState, type SourceOperation } from "./source-editor-contract.ts";

export type SourceBuffer = { path: string; content: string; expectedDigest: string | null; baseline?: string | null; changed: boolean; deleted: boolean };
export const sourceEditable = (state: string) => ["not-started", "draft-ready", "failed", "cancelled"].includes(state);
export function draftBuffers(draft: SourceDraft | null): SourceBuffer[] {
  return draft?.change_set.operations.map(row => ({ path: row.path, content: row.content ?? "", expectedDigest: row.expected_digest,
    ...(row.action === "create" ? { baseline: null } : {}), changed: true, deleted: row.action === "delete" })) ?? [];
}
export function sourceBufferOperations(buffers: SourceBuffer[]): SourceOperation[] {
  return buffers.filter(buffer => buffer.changed).map<SourceOperation>(buffer => ({ action: buffer.expectedDigest === null ? "create" : buffer.deleted ? "delete" : "replace",
    path: buffer.path, content: buffer.deleted ? null : buffer.content, expected_digest: buffer.expectedDigest })).sort((a, b) => a.path.localeCompare(b.path));
}
export function sourceDraftFingerprint(buffers: SourceBuffer[], message: string, objective: string) {
  return JSON.stringify({ operations: sourceBufferOperations(buffers), message, objective });
}
export function sourceSaveCommand(current: SourceEditorState, objective: string, message: string, buffers: SourceBuffer[], inputOrigin: "manual" | "import", nonce: string, at: string) {
  if (!sourceEditable(current.state)) throw new Error("The current source action is read-only. Use its existing recovery or delivery controls.");
  const editing = current.state === "draft-ready";
  if (editing && (!current.attempt?.digest || !current.attempt.executionId)) throw new Error("Reload this exact retained source attempt before amending it.");
  return { schema_version: 1 as const, command_id: `operator-source-save:${nonce}`, execution_id: editing ? current.attempt!.executionId : `operator-source-execution:${nonce}`,
    expected_revision: current.revision, expected_change_set_digest: editing ? current.attempt!.digest : null, requested_at: at, objective,
    input_origin: inputOrigin, retry_of: !editing ? current.attempt?.requestId ?? null : null, commit_message: message, operations: assertSourceOperations(sourceBufferOperations(buffers)) };
}
export function replaceSourceBuffer(buffers: SourceBuffer[], next: SourceBuffer) {
  // Only changed files and the currently opened original need browser memory.
  // Evicted original files remain discoverable in the bounded owner tree.
  return [...buffers.filter(row => row.path !== next.path && row.changed).map(row => {
    const { baseline: _baseline, ...retained } = row; return retained;
  }), next];
}
