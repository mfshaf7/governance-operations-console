"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, FileText, Folder, FolderOpen } from "lucide-react";
import { TerasActionButton, TerasActionRow, TerasEmptyState, TerasFieldStack, TerasTextField } from "@/teras";
import { sourcePathIssue, type SourceEditorTarget } from "../source-editor-contract.ts";
import { sourceCreationIssue, sourceFileTree } from "../source-file-tree.ts";
import type { SourceOperation } from "../source-editor-contract.ts";
import styles from "./source-editor-workspace.module.css";

export function SourceFileExplorer({ paths, selected, operations, scope, truncated, editable, pending, contextPaths, contextPending, onSelect, onContext, onCreate }: {
  paths: string[]; selected: string | null; operations: SourceOperation[]; scope: SourceEditorTarget["scope"]; truncated: boolean; editable: boolean; pending: boolean;
  contextPaths: string[]; contextPending: boolean; onSelect: (path: string) => void; onContext: (path: string) => void;
  onCreate: (path: string, folder: boolean) => Promise<boolean>;
}) {
  const [query, setQuery] = useState(""), [collapsed, setCollapsed] = useState(new Set<string>()), [directory, setDirectory] = useState(scope?.source_root ?? "");
  const [creating, setCreating] = useState<"file" | "folder" | null>(null), [newPath, setNewPath] = useState(""), [focused, setFocused] = useState<string | null>(null);
  const [creationError, setCreationError] = useState<string | null>(null);
  const root = useRef<HTMLUListElement>(null), entries = sourceFileTree(paths, query, collapsed);
  const tabStop = entries.some(entry => entry.path === focused) ? focused : entries[0]?.path;
  useEffect(() => {
    if (!selected) return;
    const parts = selected.split("/"); parts.pop(); setDirectory(parts.join("/"));
    setCollapsed(current => new Set([...current].filter(path => !selected.startsWith(`${path}/`))));
  }, [selected]);
  const toggle = (path: string) => setCollapsed(current => { const next = new Set(current); if (next.has(path)) next.delete(path); else next.add(path); return next; });
  const start = (kind: "file" | "folder") => { setCreating(kind); setCreationError(null); setNewPath(directory ? `${directory}/` : ""); };
  const focus = (path?: string) => { if (!path) return; setFocused(path); Array.from(root.current?.querySelectorAll<HTMLButtonElement>("[data-source-tree-entry]") ?? []).find(node => node.dataset.sourceTreeEntry === path)?.focus(); };
  return <TerasFieldStack spacing="compact">
    <TerasTextField label="Find files or folders" value={query} onValueChange={setQuery} maxLength={240} />
    <TerasActionRow>
      <TerasActionButton size="table-compact" emphasis="secondary" disabled={!editable} onClick={() => start("file")}>New file</TerasActionButton>
      <TerasActionButton size="table-compact" emphasis="secondary" disabled={!editable} onClick={() => start("folder")}>New folder</TerasActionButton>
    </TerasActionRow>
    {creating ? <form className={styles.createPath} onSubmit={async event => { event.preventDefault(); const issue = sourceCreationIssue(newPath, paths, truncated, scope, creating === "folder"); setCreationError(issue); if (!issue && editable && newPath && await onCreate(newPath, creating === "folder")) { setCreating(null); setQuery(""); setCollapsed(new Set()); } }}>
      <TerasTextField autoFocus label={creating === "folder" ? "New relative folder path" : "New relative file path"} helper={creating === "folder" ? "Adds a .gitkeep file so the folder is retained when saved to Git." : "Relative to the repository root. Include folders, for example src/components/Button.tsx."} value={newPath} onValueChange={value => { setNewPath(value); setCreationError(null); }} disabled={!editable} maxLength={creating === "folder" ? 231 : 240} />
      {creationError ? <p role="alert" className={styles.explorerHint}>{creationError}</p> : null}
      <TerasActionRow><TerasActionButton type="submit" size="table-compact" disabled={!editable || !newPath}>Create {creating}</TerasActionButton><TerasActionButton size="table-compact" emphasis="secondary" onClick={() => setCreating(null)}>Cancel</TerasActionButton></TerasActionRow>
    </form> : null}
    {entries.length ? <ul ref={root} role="tree" aria-label="Source file tree" className={styles.tree}>
      {entries.map((entry, index) => {
        const issue = entry.folder ? null : sourcePathIssue(entry.path, scope), operation = operations.find(row => row.path === entry.path), expanded = !!query || !collapsed.has(entry.path);
        return <li key={entry.path} role="none" className={styles.treeRow} style={{ paddingLeft: `${entry.depth * 12}px` }}>
          <button type="button" role="treeitem" aria-level={entry.depth + 1} aria-expanded={entry.folder ? expanded : undefined} aria-selected={!entry.folder && selected === entry.path} aria-disabled={!entry.folder && (pending || !!issue)}
            aria-label={entry.folder ? `Folder ${entry.path}` : `Open ${entry.path}`} title={issue ? `${entry.path}: ${issue}` : entry.path} data-source-tree-entry={entry.path} className={styles.treeEntry}
            tabIndex={tabStop === entry.path ? 0 : -1} onFocus={() => setFocused(entry.path)}
            onClick={() => { if (entry.folder) { setDirectory(entry.path); toggle(entry.path); } else if (!pending && !issue) { setDirectory(entry.path.includes("/") ? entry.path.slice(0, entry.path.lastIndexOf("/")) : ""); onSelect(entry.path); } }}
            onKeyDown={event => {
              const key = event.key; if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"].includes(key)) return; event.preventDefault();
              if (key === "ArrowUp") focus(entries[Math.max(0, index - 1)]?.path);
              if (key === "ArrowDown") focus(entries[Math.min(entries.length - 1, index + 1)]?.path);
              if (key === "Home") focus(entries[0]?.path);
              if (key === "End") focus(entries.at(-1)?.path);
              if (key === "ArrowRight" && entry.folder) { if (!expanded) toggle(entry.path); else focus(entries[index + 1]?.path); }
              if (key === "ArrowLeft") { if (entry.folder && expanded && !query) toggle(entry.path); else focus(entry.path.includes("/") ? entry.path.slice(0, entry.path.lastIndexOf("/")) : undefined); }
            }}>
            {entry.folder ? <>{expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}{expanded ? <FolderOpen size={15} /> : <Folder size={15} />}</> : <><span className={styles.treeIndent} /><FileText size={15} /></>}
            <span className={styles.treeName}>{entry.name}</span>{operation ? <span className={styles.fileChange} title={operation.action}>{operation.action === "create" ? "A" : operation.action === "delete" ? "D" : "M"}</span> : null}
          </button>
          {!entry.folder ? <input className={styles.contextCheck} type="checkbox" aria-label={`${contextPaths.includes(entry.path) ? "Remove from" : "Add to"} AI context: ${entry.path}`} title="Include this file when asking AI" checked={contextPaths.includes(entry.path)} disabled={contextPending || !!issue} onChange={() => onContext(entry.path)} /> : null}
        </li>;
      })}
    </ul> : <TerasEmptyState>No matching files or folders.</TerasEmptyState>}
    <p className={styles.explorerHint}>A · Added　M · Modified　D · Deleted<br />Checkboxes select AI context.</p>
  </TerasFieldStack>;
}
