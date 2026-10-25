"use client";
import { useEffect, useRef, useState } from "react";
import { assertOperatorDraftCommand, assertSourceOperations, byteLength, sourcePathIssue, type OperatorDraftCommand, type SourceDraft, type SourceEditorState, type SourceEditorTarget } from "../source-editor-contract.ts";
import { draftBuffers, replaceSourceBuffer, sourceBufferOperations, sourceDraftFingerprint, sourceEditable, sourceSaveCommand, type SourceBuffer } from "../source-editor-model.ts";
import { readEditorDraft, readEditorFiles, sourceDefinitiveSaveRejection, sourceEditorRequest, sourceObjectiveDigest, SourceEditorRequestError, type SourceSaveAcknowledgement } from "./source-editor-api.ts";

type EditorData = { current: SourceEditorState; draft: SourceDraft | null; paths: string[]; truncated: boolean; base: string;
  buffers: SourceBuffer[]; selected: string | null; message: string; objective: string; fingerprint: string; origin: "manual" | "import" };
export function useSourceEditor(target: SourceEditorTarget, onSaved: (draft: SourceDraft) => void) {
  const [data, setData] = useState<EditorData | null>(null), [pending, setPending] = useState(false), [error, setError] = useState<string | null>(null), [notice, setNotice] = useState<string | null>(null);
  const latest = useRef(data), busy = useRef(false), alive = useRef(true), savedCallback = useRef(onSaved);
  const [uncertain, setUncertain] = useState(false), command = useRef<OperatorDraftCommand | null>(null);
  latest.current = data; savedCallback.current = onSaved;
  async function run(operation: () => Promise<void>) {
    if (busy.current) return false; busy.current = true; setPending(true); setError(null);
    try { await operation(); return true; }
    catch (caught) { if (alive.current) setError(caught instanceof Error ? caught.message : "The source operation was not confirmed. Your local buffers are retained."); return false; }
    finally { busy.current = false; if (alive.current) setPending(false); }
  }
  async function load(expectedDigest?: string) {
    let draft: SourceDraft | null = null;
    try { draft = await readEditorDraft(target.endpoint); }
    catch (error) { if (!(error instanceof SourceEditorRequestError) || error.status !== 404) throw error; }
    let current = draft?.editorState ?? target.current, paths = draft?.change_set.operations.map(row => row.path) ?? [], truncated = false, base = draft?.change_set.base_commit ?? "";
    if (draft && (!draft.editorState || draft.session_id !== target.current.sessionId || draft.revision !== current.revision || draft.digest !== current.attempt?.digest)) throw new Error("Source changed while loading. Refresh the owner state; your buffers are retained.");
    if (expectedDigest && draft?.digest !== expectedDigest) throw new Error("Your save was acknowledged, but a newer owner draft now exists. Your local buffers are retained; reload explicitly to reconcile.");
    if (sourceEditable(current.state)) {
      const result = await readEditorFiles(target.endpoint);
      if (result.current.sessionId !== target.current.sessionId || draft && (result.current.revision !== draft.revision || result.current.attempt?.digest !== draft.digest) || !draft && result.current.attempt?.digest) throw new Error("Source changed during inspection. Reload the current owner draft before editing.");
      current = result.current; paths = result.capture.tree.paths; truncated = result.capture.tree.truncated; base = result.capture.head_commit;
    }
    const buffers = draftBuffers(draft), message = draft?.change_set.commit_message ?? "", objective = draft?.objective ?? target.objective;
    if (!alive.current) return;
    command.current = null; setUncertain(false);
    setData({ current, draft, paths, truncated, base, buffers, selected: buffers[0]?.path ?? null, message, objective,
      fingerprint: sourceDraftFingerprint(buffers, message, objective), origin: "manual" });
  }
  useEffect(() => { alive.current = true; void run(() => load()); return () => { alive.current = false; }; }, [target.endpoint]); // A new actual session remounts the workspace.
  const dirty = data !== null && sourceDraftFingerprint(data.buffers, data.message, data.objective) !== data.fingerprint;
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => { if (dirty || pending || uncertain) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", guard); return () => window.removeEventListener("beforeunload", guard);
  }, [dirty, pending, uncertain]);
  function update(operation: (current: EditorData) => EditorData) {
    if (busy.current || command.current) return;
    setData(current => current && sourceEditable(current.current.state) ? operation(current) : current);
  }
  async function baseline(path: string, current: EditorData): Promise<SourceBuffer> {
    const existing = current.buffers.find(row => row.path === path);
    if (existing?.baseline !== undefined) return existing;
    const issue = sourcePathIssue(path, target.scope); if (issue) throw new Error(issue);
    const result = await readEditorFiles(target.endpoint, [path]), file = result.capture.files[0];
    if (!file || result.capture.head_commit !== current.base || result.current.sessionId !== current.current.sessionId || result.current.revision !== current.current.revision || existing && existing.expectedDigest !== file.content_digest) throw new Error("The selected source or draft changed. Your edits are retained; refresh and reconcile before saving.");
    return existing ? { ...existing, baseline: file.content } : { path, content: file.content, expectedDigest: file.content_digest, baseline: file.content, changed: false, deleted: false };
  }
  return { data, pending, dirty, uncertain, error, notice, editable: !!data && sourceEditable(data.current.state) && !pending && !uncertain,
    reload: () => run(() => load()),
    select: (path: string) => run(async () => {
      const current = latest.current; if (!current) return;
      if (!sourceEditable(current.current.state)) { setData({ ...current, selected: path }); return; }
      const buffer = await baseline(path, current);
      if (alive.current) setData({ ...current, selected: path, buffers: replaceSourceBuffer(current.buffers, buffer) });
    }),
    setMessage: (message: string) => update(current => ({ ...current, message })),
    setObjective: (objective: string) => update(current => ({ ...current, objective })),
    edit: (content: string) => update(current => ({ ...current, buffers: current.buffers.map(row => row.path === current.selected ? { ...row, content, deleted: false, changed: row.expectedDigest === null || row.baseline === undefined || content !== row.baseline } : row) })),
    add: (path: string) => run(async () => {
      const current = latest.current; if (!current || !sourceEditable(current.current.state) || command.current) return;
      const issue = sourcePathIssue(path, target.scope); if (issue) throw new Error(issue);
      if (current.paths.includes(path) || current.buffers.some(row => row.path === path)) throw new Error("That path exists. Select it to edit the existing file.");
      if (sourceBufferOperations(current.buffers).length >= 64) throw new Error("The draft already contains 64 changed files.");
      setData({ ...current, selected: path, buffers: replaceSourceBuffer(current.buffers, { path, content: "", expectedDigest: null, baseline: null, changed: true, deleted: false }) });
    }),
    remove: () => update(current => ({ ...current, buffers: current.buffers.flatMap(row => row.path !== current.selected ? [row] : row.expectedDigest === null ? [] : [{ ...row, changed: true, deleted: true }]) })),
    undoChange: () => run(async () => {
      const current = latest.current; if (!current || !current.selected || !sourceEditable(current.current.state) || command.current) return;
      const existing = current.buffers.find(row => row.path === current.selected); if (!existing) return;
      if (existing.expectedDigest === null) { setData({ ...current, buffers: current.buffers.filter(row => row !== existing), selected: null }); return; }
      const original = await baseline(existing.path, current);
      setData({ ...current, buffers: replaceSourceBuffer(current.buffers, { ...original, content: original.baseline!, deleted: false, changed: false }) });
    }),
    importFiles: (files: Array<{ path: string; content: string }>) => run(async () => {
      const current = latest.current; if (!current || !sourceEditable(current.current.state) || command.current) return;
      let buffers = [...current.buffers];
      // Prepare every baseline before changing any local buffer. A partial
      // import failure must never silently stage only half the selection.
      const originalPaths = files.map(file => file.path).filter(path => current.paths.includes(path) && !buffers.some(row => row.path === path));
      const originals = new Map<string, SourceBuffer>();
      for (let offset = 0; offset < originalPaths.length; offset += 4) {
        // Four maximum-size files fit the existing 256 KiB read envelope.
        const paths = originalPaths.slice(offset, offset + 4), result = await readEditorFiles(target.endpoint, paths);
        if (result.capture.head_commit !== current.base || result.current.sessionId !== current.current.sessionId || result.current.revision !== current.current.revision) throw new Error("Source changed during import preparation. No imported buffers were applied.");
        for (const file of result.capture.files) originals.set(file.path, { path: file.path, content: file.content, expectedDigest: file.content_digest, baseline: file.content, changed: false, deleted: false });
        setNotice(`Read original text for ${Math.min(offset + 4, originalPaths.length)} of ${originalPaths.length} existing import paths.`);
      }
      for (const file of files) {
        const issue = sourcePathIssue(file.path, target.scope); if (issue) throw new Error(`${file.path}: ${issue}`);
        let original = buffers.find(row => row.path === file.path);
        if (!original && current.paths.includes(file.path)) original = originals.get(file.path);
        if (!original) {
          if (current.truncated) throw new Error("This source tree is truncated. A new imported path cannot be proven absent; use a smaller owner scope or explicit owner review.");
          original = { path: file.path, content: "", baseline: null, expectedDigest: null, changed: false, deleted: false };
        }
        buffers = replaceSourceBuffer(buffers, { ...original, content: file.content, changed: original.expectedDigest === null || original.baseline === undefined || file.content !== original.baseline, deleted: false });
      }
      const operations = sourceBufferOperations(buffers);
      if (operations.length) assertSourceOperations(operations);
      if (byteLength(JSON.stringify(operations)) > 1048576) throw new Error("The import exceeds the serialized source wire budget. Select fewer or smaller files.");
      if (alive.current) { setData({ ...current, buffers, selected: files[0]?.path ?? current.selected, origin: "import" }); setNotice(`${files.length} selected files prepared locally. Review the diff, then save the private draft.`); }
    }),
    save: () => run(async () => {
      const current = latest.current; if (!current) return;
      if (!command.current) {
        if (current.objective.trim().length < target.objectiveMin || current.objective.length > target.objectiveMax) throw new Error(`Use an objective between ${target.objectiveMin} and ${target.objectiveMax} characters.`);
        if (current.current.state === "draft-ready" && current.current.attempt?.objectiveDigest !== await sourceObjectiveDigest(current.objective)) throw new Error("Amending this draft requires its original exact objective. Re-enter that objective, or cancel the old attempt before starting a different one.");
        command.current = assertOperatorDraftCommand(sourceSaveCommand(current.current, current.objective, current.message, current.buffers, current.origin, crypto.randomUUID(), new Date().toISOString()));
      }
      let receivedAcknowledgement = false;
      try {
        const ack = await sourceEditorRequest<SourceSaveAcknowledgement>(`${target.endpoint}/draft`, command.current);
        receivedAcknowledgement = true;
        if (ack.commandId !== command.current.command_id || ack.current.sessionId !== current.current.sessionId) throw new Error("Save acknowledgement belongs to another source command or session.");
        setNotice(`Private draft saved at ${ack.savedRevision}. Exact digest: ${ack.savedDigest}. Source acceptance is a separate action.`);
        if (ack.current.revision !== ack.savedRevision || ack.current.attempt?.digest !== ack.savedDigest) {
          command.current = null; setUncertain(false); throw new Error("The original save is acknowledged, but the owner now has a newer draft. Your local edits remain; reload explicitly to reconcile.");
        }
        await load(ack.savedDigest);
        const draft = await readEditorDraft(target.endpoint);
        if (draft.digest !== ack.savedDigest) throw new Error("A newer owner draft replaced this save before final readback. Refresh before acceptance.");
        savedCallback.current(draft);
      } catch (error) {
        if (sourceDefinitiveSaveRejection(error, receivedAcknowledgement)) command.current = null;
        if (alive.current) setUncertain(command.current !== null);
        throw error;
      }
    }),
  };
}
