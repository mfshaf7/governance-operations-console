"use client";
import { useEffect, useRef, useState } from "react";
import { TerasActionButton, TerasActionRow, TerasCodeEditor, TerasDetailGrid, TerasDraftCloseGuardDialog, TerasEmptyState, TerasFieldStack, TerasList, TerasMetadataList, TerasModalShell, TerasNoteField, TerasPanel, TerasPanelHeader, TerasSegmentedControl, TerasSignalItem, TerasTextField } from "@/teras";
import { byteLength, sourcePathIssue, type SourceDraft, type SourceEditorTarget } from "../source-editor-contract.ts";
import { sourceBufferOperations } from "../source-editor-model.ts";
import { useSourceEditor } from "../live-runtime/use-source-editor.ts";
import { SourceImportPanel } from "./source-import-panel.tsx";

export function SourceEditorWorkspace({ target, onClose, onSaved, onReviewed }: { target: SourceEditorTarget; onClose: () => void; onSaved: (draft: SourceDraft) => void; onReviewed: (draft: SourceDraft) => void }) {
  const runtime = useSourceEditor(target, onSaved), current = runtime.data;
  const [filter, setFilter] = useState(""), [newPath, setNewPath] = useState(""), [mode, setMode] = useState<"edit" | "diff">("diff");
  const [importOpen, setImportOpen] = useState(false), [guard, setGuard] = useState<"close" | "reload" | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const buffer = current?.buffers.find(row => row.path === current.selected);
  const inspectedBaseline = useRef<string | null>(null);
  useEffect(() => {
    const key = `${current?.current.revision}:${current?.selected}`;
    if (current?.selected && buffer && buffer.baseline === undefined && runtime.editable && inspectedBaseline.current !== key) {
      inspectedBaseline.current = key; void runtime.select(current.selected);
    }
  }, [current?.selected, current?.current.revision, buffer?.baseline, runtime.editable]);
  const operations = current ? sourceBufferOperations(current.buffers) : [];
  const paths = current ? [...new Set([...operations.map(row => row.path), ...current.paths])].filter(path => path.toLowerCase().includes(filter.toLowerCase())) : [];
  const requestClose = () => { if (!runtime.pending) runtime.dirty || runtime.uncertain ? setGuard("close") : onClose(); };
  const requestReload = () => { if (runtime.dirty || runtime.uncertain) setGuard("reload"); else void runtime.reload(); };
  const save = () => void runtime.save();
  return <>
    <TerasModalShell width="viewport" height="fill" bodyLayout="scroll" kicker="Source workspace" title={target.label} onClose={requestClose} surfaceId="source-editor-workspace"
      description="Edit text or import files, review the diff, then save a private draft. Exact-digest acceptance and Gary source delivery are separate actions."
      modalAttributes={{ onKeyDown: event => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); if (runtime.editable && operations.length) save(); } } }}>
      <TerasFieldStack spacing="normal">
        <TerasPanel frame="padded" treatment="state" tone={runtime.error ? "danger" : runtime.uncertain ? "warn" : "info"}>
          <TerasPanelHeader kicker={runtime.pending ? "Working" : runtime.dirty ? "Unsaved local changes" : "Current retained source"} title={current?.current.state ?? "Loading source workspace"}
            description={runtime.error ?? runtime.notice ?? "Ctrl/Cmd+S saves the private draft. Ctrl/Cmd+F searches the code editor. Tab indents; Escape then Tab moves keyboard focus out of the editor."} />
          {current && showDetails ? <TerasMetadataList items={[
            { label: "Session", value: current.current.sessionId }, { label: "Source base", value: current.base }, { label: "Owner revision", value: current.current.revision },
            { label: "Saved draft digest", value: current.draft?.digest ?? "No draft saved" },
            { label: "Draft origin", value: current.draft?.provenance ? current.draft.provenance.origin === "operator-amended-model" ? "Operator amended model proposal; original model evidence does not attest these bytes" : `Operator / ${current.draft.provenance.inputOrigin}` : current.draft ? "Original proposal / owner evidence" : "Manual source work" },
            { label: "Local changes", value: `${operations.length} operations / ${operations.reduce((n, row) => n + byteLength(row.content ?? ""), 0)} UTF-8 bytes` },
          ]} /> : null}
          <TerasActionRow>
            <TerasActionButton disabled={!runtime.editable || !operations.length || !runtime.dirty && !!current?.draft} onClick={save}>Save private draft</TerasActionButton>
            {runtime.uncertain ? <TerasActionButton disabled={runtime.pending} onClick={save}>Retry original save</TerasActionButton> : null}
            <TerasActionButton emphasis="secondary" disabled={runtime.pending || !!runtime.error || runtime.dirty || runtime.uncertain || !current?.draft || current.current.state !== "draft-ready"} onClick={() => current?.draft && onReviewed(current.draft)}>Mark saved digest inspected</TerasActionButton>
            <TerasActionButton emphasis="secondary" disabled={runtime.pending} onClick={requestReload}>Reload current owner draft</TerasActionButton>
            <TerasActionButton emphasis="secondary" onClick={() => setShowDetails(!showDetails)}>{showDetails ? "Hide saved draft details" : "Show saved draft details"}</TerasActionButton>
            <TerasActionButton emphasis="secondary" disabled={!runtime.editable} onClick={() => setImportOpen(!importOpen)}>{importOpen ? "Hide import" : "Import files or folder"}</TerasActionButton>
          </TerasActionRow>
        </TerasPanel>
        {current ? <>
          {importOpen ? <SourceImportPanel scope={target.scope} disabled={!runtime.editable} onImport={files => runtime.importFiles(files).then(success => { if (success) setImportOpen(false); })} /> : null}
          <TerasDetailGrid variant="balanced">
            <TerasPanel frame="padded" treatment="neutral">
              <TerasPanelHeader kicker="Files" title={`${current.paths.length} source paths${current.truncated ? " / truncated tree" : ""}`} description="Changed files stay at the top. Unsupported paths show their reason. Original text is read on selection; saved draft text is retained for review." />
              <TerasFieldStack spacing="normal">
                <TerasTextField label="Find source path" value={filter} onValueChange={setFilter} maxLength={240} />
                {paths.length ? <TerasList frame="contained" scrollHeight="medium">{paths.slice(0, 100).map(path => {
                  const operation = operations.find(row => row.path === path), issue = sourcePathIssue(path, target.scope);
                  return <TerasSignalItem key={path} label={operation?.action ?? "Existing source"} title={path} detail={issue ?? (path === current.selected ? "Selected file" : undefined)} tone={issue ? "warn" : "info"}
                    actions={<TerasActionButton emphasis="secondary" aria-pressed={path === current.selected} disabled={runtime.pending || !!issue} onClick={() => void runtime.select(path)}>Open file</TerasActionButton>} />;
                })}</TerasList> : <TerasEmptyState>No matching source files. Add a path or import supported text.</TerasEmptyState>}
                {paths.length > 100 ? <TerasEmptyState>Showing the first 100 of {paths.length} matching paths. Refine the path search to open another file.</TerasEmptyState> : null}
                <TerasTextField label="New relative file path" value={newPath} onValueChange={setNewPath} disabled={!runtime.editable} maxLength={240} />
                <TerasActionButton emphasis="secondary" disabled={!runtime.editable || !newPath} onClick={() => void runtime.add(newPath)}>Add text file</TerasActionButton>
                <TerasNoteField label={current.current.state === "draft-ready" ? "Original source objective (retained by owner)" : "Source objective"} minimumHeight="short" value={current.objective} onValueChange={runtime.setObjective} readOnly={!!target.objectiveReadOnly || current.current.state === "draft-ready" || !runtime.editable} maxLength={target.objectiveMax} />
                <TerasTextField label="Commit message for the saved draft" value={current.message} onValueChange={runtime.setMessage} maxLength={120} disabled={!runtime.editable} />
              </TerasFieldStack>
            </TerasPanel>
            <TerasPanel frame="padded" treatment="neutral">
              <TerasPanelHeader kicker={buffer?.deleted ? "Explicit deletion" : "Text source"} title={buffer?.path ?? "Select a file"}
                description={buffer ? `${byteLength(buffer.content)} UTF-8 bytes${buffer.content.startsWith("\uFEFF") ? " / BOM preserved" : ""}. ${buffer.baseline === undefined ? "Original text is not available in this lifecycle; retained draft inspection only." : "Diff compares the exact owner base with this buffer."}` : "Open a source file, add a path or import text to begin."} />
              <TerasFieldStack spacing="normal">
                <TerasActionRow>
                  <TerasSegmentedControl ariaLabel="Source view" value={mode} onValueChange={setMode} options={[{ value: "edit", label: "Edit text" }, { value: "diff", label: "Review diff" }]} />
                  <TerasActionButton emphasis="secondary" disabled={!runtime.editable || !buffer || buffer.deleted} onClick={runtime.remove}>Delete file explicitly</TerasActionButton>
                  <TerasActionButton emphasis="secondary" disabled={!runtime.editable || !buffer?.changed} onClick={() => void runtime.undoChange()}>Undo file change</TerasActionButton>
                </TerasActionRow>
                {buffer ? <TerasCodeEditor key={buffer.path} path={buffer.path} value={buffer.deleted ? "" : buffer.content} original={buffer.baseline ?? ""}
                  diff={mode === "diff" && buffer.baseline !== undefined} readOnly={!runtime.editable || buffer.deleted || buffer.baseline === undefined} onValueChange={runtime.edit} /> : <TerasEmptyState>Source text is loaded on selection.</TerasEmptyState>}
              </TerasFieldStack>
            </TerasPanel>
          </TerasDetailGrid>
        </> : null}
      </TerasFieldStack>
    </TerasModalShell>
    <TerasDraftCloseGuardDialog open={guard !== null} kicker="Unsaved source buffers" title="Discard local edits?" description="The owner keeps saved private drafts. Unsaved browser buffers and an uncertain save retry identity will be lost if you leave or reload. Keep editing to reconcile or save them first."
      leaveLabel={guard === "reload" ? "Discard buffers and reload" : "Discard buffers and close"} onKeepEditing={() => setGuard(null)} onLeave={() => {
        const action = guard; setGuard(null); if (action === "reload") void runtime.reload(); else onClose();
      }} />
  </>;
}
