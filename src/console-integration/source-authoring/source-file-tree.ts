import { sourcePathIssue, type SourceEditorTarget } from "./source-editor-contract.ts";

export type SourceTreeEntry = { path: string; name: string; folder: boolean; depth: number };

export function sourceFileTree(paths: string[], query = "", collapsed = new Set<string>()): SourceTreeEntry[] {
  const nodes = new Map<string, SourceTreeEntry>();
  const matching = [...new Set(paths)].filter(path => path.toLowerCase().includes(query.toLowerCase()));
  for (const path of matching) {
    const parts = path.split("/");
    parts.forEach((name, depth) => {
      const key = parts.slice(0, depth + 1).join("/");
      nodes.set(key, { path: key, name, depth, folder: depth < parts.length - 1 });
    });
  }
  const children = new Map<string, SourceTreeEntry[]>();
  for (const entry of nodes.values()) {
    const parent = entry.path.slice(0, Math.max(0, entry.path.lastIndexOf("/")));
    const rows = children.get(parent) ?? []; rows.push(entry); children.set(parent, rows);
  }
  const result: SourceTreeEntry[] = [];
  const walk = (parent: string) => {
    const rows = children.get(parent) ?? [];
    rows.sort((a, b) => Number(b.folder) - Number(a.folder) || a.name.localeCompare(b.name));
    for (const row of rows) { result.push(row); if (row.folder && (query || !collapsed.has(row.path))) walk(row.path); }
  };
  walk(""); return result;
}

export function sourceCreationIssue(path: string, paths: string[], truncated: boolean, scope: SourceEditorTarget["scope"], folder = false): string | null {
  const issue = sourcePathIssue(folder ? `${path}/.gitkeep` : path, scope);
  if (issue) return issue;
  if (truncated) return "The source tree is partial. Reload a smaller source scope before creating a new path.";
  if (paths.some(existing => existing === path || existing.startsWith(`${path}/`))) return "That path already exists. Choose another name.";
  if (paths.some(existing => path.startsWith(`${existing}/`))) return "A file already uses part of that folder path. Choose another location.";
  return null;
}
