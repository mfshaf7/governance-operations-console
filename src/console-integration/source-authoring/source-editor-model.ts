import { assertSourceOperations, byteLength, sourceEditorLimits, sourceSectionLimits, wellFormed, type SourceDraft, type SourceEditorState, type SourceFileRegion, type SourceOperation, type SourcePatch } from "./source-editor-contract.ts";

export type SourceBuffer = { path: string; content: string; expectedDigest: string | null; baseline?: string | null; changed: boolean; deleted: boolean;
  patch?: SourcePatch; region?: SourceFileRegion };
export const sourceEditable = (state: string) => ["not-started", "draft-ready", "failed", "cancelled"].includes(state);
export function draftBuffers(draft: SourceDraft | null): SourceBuffer[] {
  return draft?.change_set.operations.map(row => ({ path: row.path, content: row.content ?? "", expectedDigest: row.expected_digest,
    ...(row.action === "create" ? { baseline: null } : row.patch ? { baseline: row.patch.before, patch: row.patch } : {}),
    changed: true, deleted: row.action === "delete" })) ?? [];
}
export function sourceBufferOperations(buffers: SourceBuffer[]): SourceOperation[] {
  return buffers.filter(buffer => buffer.changed).map<SourceOperation>(buffer => ({ action: buffer.expectedDigest === null ? "create" : buffer.deleted ? "delete" : buffer.patch ? "patch" : "replace",
    path: buffer.path, content: buffer.deleted ? null : buffer.content, expected_digest: buffer.expectedDigest,
    ...(buffer.patch ? { patch: buffer.patch } : {}) })).sort((a, b) => a.path.localeCompare(b.path));
}
export function sourceDraftFingerprint(buffers: SourceBuffer[], message: string, objective: string) {
  return JSON.stringify({ operations: sourceBufferOperations(buffers), message, objective });
}
function boundedReplacement(operation: SourceOperation, buffer: SourceBuffer): SourceOperation {
  if (operation.action !== "replace" || operation.patch || operation.content === null || byteLength(operation.content) <= sourceEditorLimits.fileBytes) return operation;
  const original = buffer.baseline, next = operation.content;
  if (typeof original !== "string" || byteLength(next) > sourceSectionLimits.fileBytes || !wellFormed(next)) {
    throw new Error("This file exceeds the full-file limit. Use the section editor for a smaller change.");
  }
  let start = 0, end = original.length, nextEnd = next.length;
  while (start < end && start < nextEnd && original[start] === next[start]) start++;
  while (end > start && nextEnd > start && original[end - 1] === next[nextEnd - 1]) { end--; nextEnd--; }
  // Keep a split surrogate pair in the edited range.
  if (!wellFormed(original.slice(0, start))) start--;
  if (!wellFormed(original.slice(end))) { end++; nextEnd++; }
  const before = original.slice(start, end), content = next.slice(start, nextEnd);
  if (byteLength(before) > sourceSectionLimits.textBytes || byteLength(content) > sourceSectionLimits.textBytes) {
    throw new Error("The changed section exceeds 16 KiB. Make a smaller edit or use the governed engineering source path.");
  }
  return { ...operation, action: "patch", content, patch: { offset_utf16: start, before } };
}

export function sourceSaveCommand(current: SourceEditorState, objective: string, message: string, buffers: SourceBuffer[], inputOrigin: "manual" | "import", nonce: string, at: string, sectionEditing = false) {
  if (!sourceEditable(current.state)) throw new Error("The current source action is read-only. Use its existing recovery or delivery controls.");
  const editing = current.state === "draft-ready";
  if (editing && (!current.attempt?.digest || !current.attempt.executionId)) throw new Error("Reload this exact retained source attempt before amending it.");
  const operations = sourceBufferOperations(buffers);
  const boundedOperations = sectionEditing ? operations.map(operation => boundedReplacement(operation, buffers.find(buffer => buffer.path === operation.path)!)) : operations;
  return { schema_version: 1 as const, command_id: `operator-source-save:${nonce}`, execution_id: editing ? current.attempt!.executionId : `operator-source-execution:${nonce}`,
    expected_revision: current.revision, expected_change_set_digest: editing ? current.attempt!.digest : null, requested_at: at, objective,
    input_origin: inputOrigin, retry_of: !editing ? current.attempt?.requestId ?? null : null, commit_message: message, operations: assertSourceOperations(boundedOperations, sectionEditing) };
}
export function replaceSourceBuffer(buffers: SourceBuffer[], next: SourceBuffer) {
  // Only changed files and the currently opened original need browser memory.
  // Evicted original files remain discoverable in the bounded owner tree.
  return [...buffers.filter(row => row.path !== next.path && row.changed).map(row => {
    if (row.patch || byteLength(row.content) > sourceEditorLimits.fileBytes) return row;
    const { baseline: _baseline, ...retained } = row; return retained;
  }), next];
}

// A proposal binds the files it saw. Unrelated edits and a changed commit
// summary are preserved and must not invalidate an otherwise current proposal.
export function sourceAssistantFingerprint(buffers: SourceBuffer[], files: SourceBuffer[]) {
  return JSON.stringify(files.map(original => {
    const current = buffers.find(file => file.path === original.path);
    return { path: original.path, content: current?.content ?? original.baseline ?? "", deleted: current ? current.deleted : original.expectedDigest === null, expectedDigest: current ? current.expectedDigest : original.expectedDigest };
  }));
}
