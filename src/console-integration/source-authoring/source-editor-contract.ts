import type { SourcePreviewAdapter } from "./source-preview-contract.ts";
export const sourceEditorLimits = { fileBytes: 65536, readBytes: 262144, readFiles: 48, treePaths: 5000, operations: 64, changedBytes: 524288, wireBytes: 1048576 } as const;
export const sourceSectionLimits = { textBytes: 16384, fileBytes: 262144 } as const;
export type SourcePatch = { offset_utf16: number; before: string };
export type SourceOperation = { action: "create" | "replace" | "delete" | "patch"; path: string; content: string | null; expected_digest: string | null; patch?: SourcePatch };
export type OperatorDraftCommand = {
  schema_version: 1; command_id: string; execution_id: string; expected_revision: string;
  expected_change_set_digest: string | null; requested_at: string; objective: string;
  input_origin: "manual" | "import"; retry_of: string | null; commit_message: string; operations: SourceOperation[];
};
export type SourceFileRegion = { start_line: number; end_line: number; total_lines: number; offset_utf16: number; baseline_digest: string; baseline_bytes: number };
export type SourceFile = { path: string; content: string; content_digest: string; size_bytes: number; region?: SourceFileRegion };
export type SourceCapture = {
  schema_version: 1; session_id: string; owner_repo: string; landing_unit_id: string; head_commit: string; clean: true;
  tree: { paths: string[]; total_path_count: number; truncated: boolean }; files: SourceFile[]; admitted_bytes: number; context_digest: string;
};
export type SourceDraft = {
  session_id: string; revision: string; digest: string; objective: string; accepted: boolean;
  change_set: { schema_version: 1; change_set_id: string; session_id: string; base_commit: string; objective_digest: string; commit_message: string; operations: SourceOperation[] };
  provenance: null | { origin: "operator" | "operator-amended-model"; inputOrigin: "manual" | "import"; amendedAt: string; originalModel: boolean };
  editorState?: SourceEditorState;
};
export type SourceEditorState = {
  sessionId: string; revision: string; state: string;
  attempt: null | { requestId: string; executionId: string; objectiveDigest: string; digest: string | null };
};
export type SourceEditorTarget = {
  endpoint: string; label: string; current: SourceEditorState; objective: string;
  preview?: SourcePreviewAdapter;
  retainedDraftAvailable?: boolean;
  sectionEditing?: boolean;
  objectiveReadOnly?: boolean; objectiveMin: number; objectiveMax: number;
  scope: null | { source_root: string; design_profile: string };
};

export function sourceObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid();
  return value as Record<string, unknown>;
}
export function sourceExact(value: Record<string, unknown>, keys: string[]) {
  if (Object.keys(value).sort().join(",") !== [...keys].sort().join(",")) invalid();
}
export function sourceString(value: unknown, max = 256, empty = false): string {
  if (typeof value !== "string" || value.length > max || (!empty && !value.trim()) || !wellFormed(value)) invalid();
  return value;
}
export function sourceId(value: unknown) {
  const result = sourceString(value); if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/.test(result)) invalid(); return result;
}
export function sourceDigest(value: unknown) {
  const result = sourceString(value); if (!/^sha256:[0-9a-f]{64}$/.test(result)) invalid(); return result;
}
export function sourceDate(value: unknown) {
  const result = sourceString(value, 64); if (!/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(result) || !Number.isFinite(Date.parse(result))) invalid(); return result;
}
export function sourceCommit(value: unknown) {
  const result = sourceString(value, 40); if (!/^[0-9a-f]{40}$/.test(result)) invalid(); return result;
}
export function byteLength(value: string) { return new TextEncoder().encode(value).length; }
export function wellFormed(value: string) { try { encodeURIComponent(value); return true; } catch { return false; } }
export function sourceText(value: unknown) {
  const result = sourceString(value, sourceEditorLimits.fileBytes, true);
  if (result.includes("\0") || byteLength(result) > sourceEditorLimits.fileBytes) invalid(); return result;
}
export function sourcePath(value: unknown) {
  const result = sourceString(value, 240);
  if (!/^[A-Za-z0-9._/-]+$/.test(result) || result.startsWith("/") || result.split("/").some(part => !part || part === "." || part === ".." || part === ".git")) invalid(); return result;
}
export function sourcePathIssue(path: string, scope: SourceEditorTarget["scope"]): string | null {
  try { sourcePath(path); } catch { return "Unsupported or unsafe source path"; }
  if (path.split("/").some(part => /^(?:\.git|\.env(?:\..*)?|id_rsa|id_ed25519|credentials(?:\.json)?|\.npmrc|\.pypirc|\.netrc)$/i.test(part) || /\.(?:pem|p12|pfx|key)$/i.test(part))) return "Credential path is excluded";
  if (scope && path !== scope.design_profile) {
    if (!path.startsWith(`${scope.source_root}/`)) return "Outside this Prototype app/design scope";
    if (path.slice(scope.source_root.length + 1).split("/").some(part => /^(?:\.github|\.gitlab|\.codex|\.claude|node_modules|\.venv|agents\.md|claude\.md)$/i.test(part))) return "Prototype owner control is inspect-only";
  }
  return null;
}
function boundedInteger(value: unknown, min: number, max: number) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) invalid();
  return value;
}
export function assertSourceOperations(value: unknown, allowPatch = false): SourceOperation[] {
  if (!Array.isArray(value) || !value.length || value.length > sourceEditorLimits.operations) invalid();
  const result = value.map(entry => {
    const row = sourceObject(entry);
    const hasPatch = Object.hasOwn(row, "patch");
    sourceExact(row, ["action", "path", "content", "expected_digest", ...(hasPatch ? ["patch"] : [])]);
    if (!["create", "replace", "delete", "patch"].includes(String(row.action)) || hasPatch !== (row.action === "patch")) invalid();
    const content = row.content === null ? null : sourceText(row.content), expected = row.expected_digest === null ? null : sourceDigest(row.expected_digest);
    if (row.action === "create" ? content === null || expected !== null : row.action === "delete" ? content !== null || expected === null : content === null || expected === null) invalid();
    let patch: SourcePatch | undefined;
    if (hasPatch) {
      if (!allowPatch || content === null) invalid();
      const section = sourceObject(row.patch); sourceExact(section, ["offset_utf16", "before"]);
      const before = sourceText(section.before);
      if (before === content || byteLength(before) > sourceSectionLimits.textBytes || byteLength(content) > sourceSectionLimits.textBytes) invalid();
      patch = { offset_utf16: boundedInteger(section.offset_utf16, 0, sourceSectionLimits.fileBytes), before };
    }
    return { action: row.action as SourceOperation["action"], path: sourcePath(row.path), content, expected_digest: expected, ...(patch ? { patch } : {}) };
  });
  if (new Set(result.map(row => row.path)).size !== result.length || result.reduce((n, row) => n + byteLength(row.content ?? "") + byteLength(row.patch?.before ?? ""), 0) > sourceEditorLimits.changedBytes) invalid();
  return result;
}
export function assertOperatorDraftCommand(value: unknown, allowPatch = false): OperatorDraftCommand {
  const item = sourceObject(value); sourceExact(item, ["schema_version", "command_id", "execution_id", "expected_revision", "expected_change_set_digest", "requested_at", "objective", "input_origin", "retry_of", "commit_message", "operations"]);
  const objective = sourceString(item.objective, 16384), message = sourceString(item.commit_message, 120);
  if (item.schema_version !== 1 || objective.length < 8 || message.length < 10 || !["manual", "import"].includes(String(item.input_origin))) invalid();
  const result: OperatorDraftCommand = { schema_version: 1, command_id: sourceId(item.command_id), execution_id: sourceId(item.execution_id), expected_revision: sourceDate(item.expected_revision),
    expected_change_set_digest: item.expected_change_set_digest === null ? null : sourceDigest(item.expected_change_set_digest), requested_at: sourceDate(item.requested_at), objective,
    input_origin: item.input_origin as "manual" | "import", retry_of: item.retry_of === null ? null : sourceId(item.retry_of), commit_message: message, operations: assertSourceOperations(item.operations, allowPatch) };
  if (byteLength(JSON.stringify(result)) > sourceEditorLimits.wireBytes) invalid(); return result;
}
export function assertSourceCapture(value: unknown, startLine?: number): SourceCapture {
  const item = sourceObject(value), tree = sourceObject(item.tree);
  sourceExact(item, ["schema_version", "session_id", "owner_repo", "landing_unit_id", "head_commit", "clean", "tree", "files", "admitted_bytes", "context_digest"]);
  sourceExact(tree, ["paths", "total_path_count", "truncated"]);
  if (item.schema_version !== 1 || item.clean !== true || !Array.isArray(tree.paths) || tree.paths.length > 5000 || !Array.isArray(item.files) || item.files.length > 48 || !Number.isSafeInteger(tree.total_path_count) || Number(tree.total_path_count) < tree.paths.length || tree.truncated !== (Number(tree.total_path_count) > tree.paths.length)) invalid();
  const paths = tree.paths.map(path => sourceString(path, 4096));
  if (new Set(paths).size !== paths.length) invalid();
  const entries = item.files;
  const files = entries.map(value => {
    const row = sourceObject(value); sourceExact(row, ["path", "content", "content_digest", "size_bytes", ...(startLine === undefined ? [] : ["region"])]);
    const content = sourceText(row.content), size = byteLength(content);
    if (row.size_bytes !== size) invalid();
    let region: SourceFileRegion | undefined;
    if (startLine !== undefined) {
      const part = sourceObject(row.region);
      sourceExact(part, ["start_line", "end_line", "total_lines", "offset_utf16", "baseline_digest", "baseline_bytes"]);
      if (entries.length !== 1 || part.start_line !== startLine || size > sourceSectionLimits.textBytes) invalid();
      const total = boundedInteger(part.total_lines, startLine, sourceSectionLimits.fileBytes);
      const bytes = boundedInteger(part.baseline_bytes, size, sourceSectionLimits.fileBytes);
      region = { start_line: startLine, end_line: boundedInteger(part.end_line, startLine, Math.min(startLine + 39, total)),
        total_lines: total, offset_utf16: boundedInteger(part.offset_utf16, 0, bytes - size),
        baseline_digest: sourceDigest(part.baseline_digest), baseline_bytes: bytes };
    }
    return { path: sourcePath(row.path), content, content_digest: sourceDigest(row.content_digest), size_bytes: size, ...(region ? { region } : {}) };
  });
  const size = files.reduce((n, file) => n + file.size_bytes, 0);
  if (size > sourceEditorLimits.readBytes || item.admitted_bytes !== size || new Set(files.map(file => file.path)).size !== files.length) invalid();
  return { schema_version: 1, session_id: sourceId(item.session_id), owner_repo: sourceString(item.owner_repo), landing_unit_id: sourceId(item.landing_unit_id), head_commit: sourceCommit(item.head_commit), clean: true,
    tree: { paths, total_path_count: Number(tree.total_path_count), truncated: tree.truncated as boolean }, files, admitted_bytes: size, context_digest: sourceDigest(item.context_digest) };
}
export function assertSourceDraft(value: unknown, workflow: "prototype-source-draft" | "delivery-art-source-draft"): SourceDraft {
  const item = sourceObject(value), change = sourceObject(item.change_set);
  if (item.schema_version !== 1 || item.workflow_id !== workflow || typeof item.accepted !== "boolean") invalid();
  sourceExact(change, ["schema_version", "change_set_id", "session_id", "base_commit", "objective_digest", "commit_message", "operations"]);
  if (change.schema_version !== 1 || item.session_id !== change.session_id) invalid();
  let provenance: SourceDraft["provenance"] = null;
  if (item.operator_draft !== null && item.operator_draft !== undefined) {
    const p = sourceObject(item.operator_draft);
    sourceExact(p, ["origin", "input_origin", "operator_id", "command_id", "amended_at", "previous_draft_ref", "previous_draft_digest", "original_model"]);
    if (!["operator", "operator-amended-model"].includes(String(p.origin)) || !["manual", "import"].includes(String(p.input_origin))) invalid();
    sourceString(p.operator_id); sourceId(p.command_id); if (p.previous_draft_digest !== null) sourceDigest(p.previous_draft_digest);
    if (p.previous_draft_ref !== null) {
      if (workflow === "prototype-source-draft") {
        const reference = sourceObject(p.previous_draft_ref);
        sourceExact(reference, ["request_id", "digest"]);
        if (sourceId(reference.request_id) !== sourceId(item.request_id)) invalid();
        sourceDigest(reference.digest);
      } else sourceString(p.previous_draft_ref, 4096);
    }
    if (p.original_model !== null) sourceObject(p.original_model);
    if ((p.origin === "operator-amended-model") !== (p.original_model !== null)) invalid();
    provenance = { origin: p.origin as "operator" | "operator-amended-model", inputOrigin: p.input_origin as "manual" | "import", amendedAt: sourceDate(p.amended_at), originalModel: p.original_model !== null };
  }
  const objective = sourceString(item.objective, 16384); if (objective.length < 8) invalid();
  return { session_id: sourceId(item.session_id), revision: sourceDate(item.revision), digest: sourceDigest(item.digest), objective, accepted: item.accepted,
    change_set: { schema_version: 1, change_set_id: sourceId(change.change_set_id), session_id: sourceId(change.session_id), base_commit: sourceCommit(change.base_commit), objective_digest: sourceDigest(change.objective_digest), commit_message: sourceString(change.commit_message, 120), operations: assertSourceOperations(change.operations, workflow === "delivery-art-source-draft") }, provenance };
}
function invalid(): never { throw new Error("Source editor input or owner response is outside the bounded text-source contract."); }
