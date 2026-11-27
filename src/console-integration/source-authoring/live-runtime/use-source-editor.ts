"use client";
import { useEffect, useRef, useState } from "react";
import { assertOperatorDraftCommand, assertSourceOperations, byteLength, sourcePathIssue, type OperatorDraftCommand, type SourceDraft, type SourceEditorState, type SourceEditorTarget } from "../source-editor-contract.ts";
import { draftBuffers, replaceSourceBuffer, sourceBufferOperations, sourceDraftFingerprint, sourceAssistantFingerprint, sourceEditable, sourceSaveCommand, type SourceBuffer } from "../source-editor-model.ts";
import { sourceCreationIssue } from "../source-file-tree.ts";
import { expiredSourceEditorSession, missingEditorDraft, readEditorDraft, readEditorFiles, sourceDefinitiveSaveRejection, sourceEditorRequest, sourceObjectiveDigest, SourceEditorRequestError, type SourceSaveAcknowledgement } from "./source-editor-api.ts";

export type EditorData = { current: SourceEditorState; draft: SourceDraft | null; paths: string[]; truncated: boolean; base: string;
  buffers: SourceBuffer[]; selected: string | null; message: string; objective: string; fingerprint: string; origin: "manual" | "import" };
type RetainedDraft = { draft: SourceDraft; sessionId: string; sameRepository: boolean };
export function useSourceEditor(target: SourceEditorTarget, onSaved: (draft: SourceDraft) => void) {
  const [data, setData] = useState<EditorData | null>(null), [pending, setPending] = useState(false), [error, setError] = useState<string | null>(null), [notice, setNotice] = useState<string | null>(null);
  const [retained, setRetained] = useState<RetainedDraft | null>(null);
  const latest = useRef(data), busy = useRef(false), alive = useRef(true), savedCallback = useRef(onSaved);
  const [uncertain, setUncertain] = useState(false), command = useRef<OperatorDraftCommand | null>(null);
  const [blocked, setBlocked] = useState<"expired" | "dirty" | null>(null);
  const [sectionPath, setSectionPath] = useState<string | null>(null);
  latest.current = data; savedCallback.current = onSaved;
  async function run(operation: () => Promise<void>) {
    if (busy.current) return false; busy.current = true; setPending(true); setError(null);
    try { await operation(); return true; }
    catch (caught) {
      if (alive.current) {
        const expired = expiredSourceEditorSession(caught);
        if (expired) setBlocked("expired");
        else if (caught instanceof SourceEditorRequestError && caught.code === "delivery_art_source_realization_worktree_dirty") setBlocked("dirty");
        setError(expired ? "Renew Console access, then check this workspace again. Keep this tab open to retain unsaved edits." :
          caught instanceof Error ? caught.message : "The source operation was not confirmed. Your local buffers are retained.");
      }
      return false;
    }
    finally { busy.current = false; if (alive.current) setPending(false); }
  }
  async function load(expectedDigest?: string) {
    let draft: SourceDraft | null = null;
    try { draft = await readEditorDraft(target.endpoint); }
    catch (error) { if (!missingEditorDraft(error)) throw error; }
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
    setBlocked(null);
    setSectionPath(null);
    setRetained(null);
    setData({ current, draft, paths, truncated, base, buffers, selected: buffers[0]?.path ?? null, message, objective,
      fingerprint: sourceDraftFingerprint(buffers, message, objective), origin: "manual" });
    return draft;
  }
  useEffect(() => { alive.current = true; void run(async () => { await load(); }); return () => { alive.current = false; }; }, [target.endpoint]); // A new actual session remounts the workspace.
  const dirty = data !== null && sourceDraftFingerprint(data.buffers, data.message, data.objective) !== data.fingerprint;
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => { if (dirty || pending || uncertain) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", guard); return () => window.removeEventListener("beforeunload", guard);
  }, [dirty, pending, uncertain]);
  function update(operation: (current: EditorData) => EditorData) {
    if (busy.current || command.current || blocked) return;
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
  async function loadSection(path: string, line: number, current: EditorData) {
    if (!target.sectionEditing || !Number.isSafeInteger(line) || line < 1 || line > 262144) throw new Error("Enter a valid starting line.");
    if (current.buffers.some(file => file.path === path && file.changed)) {
      throw new Error("Undo this file’s local change before opening a different section.");
    }
    const result = await readEditorFiles(target.endpoint, [path], line), file = result.capture.files[0], region = file?.region;
    if (!region || file.path !== path || result.capture.head_commit !== current.base ||
        result.current.sessionId !== current.current.sessionId || result.current.revision !== current.current.revision ||
        result.current.attempt?.digest !== current.current.attempt?.digest) {
      throw new Error("The selected section no longer matches the current source workspace. Your edits are retained.");
    }
    if (!alive.current) return;
    setSectionPath(path);
    setData({ ...current, selected: path, buffers: replaceSourceBuffer(current.buffers, {
      path, content: file.content, baseline: file.content, expectedDigest: region.baseline_digest, changed: false, deleted: false,
      patch: { offset_utf16: region.offset_utf16, before: file.content }, region,
    }) });
  }
  const addPath = (path: string, folder = false) => run(async () => {
    const current = latest.current; if (!current || !sourceEditable(current.current.state) || command.current) return;
    const paths = [...new Set([...current.paths, ...current.buffers.map(row => row.path)])];
    const issue = sourceCreationIssue(path, paths, current.truncated, target.scope, folder); if (issue) throw new Error(issue);
    if (sourceBufferOperations(current.buffers).length >= 64) throw new Error("The draft already contains 64 changed files.");
    const file = folder ? `${path}/.gitkeep` : path;
    setData({ ...current, selected: file, buffers: replaceSourceBuffer(current.buffers, { path: file, content: "", expectedDigest: null, baseline: null, changed: true, deleted: false }) });
    setNotice(folder ? "Folder added to your local draft with a .gitkeep file. Save the private draft to retain it." : "File added to your local draft. Save the private draft to retain it.");
  });
  return { data, pending, dirty, uncertain, error, notice, retained, blocked, sectionPath,
    editable: !!data && sourceEditable(data.current.state) && !pending && !uncertain && !blocked,
    checkWorkspace: () => run(async () => {
      const current = latest.current;
      if (!current) { await load(); return; }
      if (command.current) {
        // A pending command may already have saved. Its exact replay checks the
        // original acknowledgement before the editor replaces any buffers.
        try { await readEditorDraft(target.endpoint); } catch (failure) { if (!missingEditorDraft(failure)) throw failure; }
        setNotice("Console access is available again. Retry the original save to confirm its result.");
      } else {
        const result = await readEditorFiles(target.endpoint);
        if (result.current.sessionId !== current.current.sessionId || result.current.revision !== current.current.revision ||
            result.current.attempt?.digest !== current.current.attempt?.digest || result.capture.head_commit !== current.base) {
          throw new Error("The owner source changed. Your local edits are retained. Review the current work session before discarding or reapplying them.");
        }
        setNotice("The approved source workspace is ready. Your local edits are available.");
      }
      setBlocked(null);
    }),
    reviewRetained: () => run(async () => {
      const result = await sourceEditorRequest<RetainedDraft>(`${target.endpoint}/draft?retained=1`);
      if (result.sessionId !== latest.current?.current.sessionId) throw new Error("The source workspace changed. Reload it before viewing the saved draft.");
      if (alive.current) setRetained(result);
    }),
    closeRetained: () => { setRetained(null); setError(null); },
    recoverRetained: () => run(async () => {
      const current = latest.current;
      if (!retained?.sameRepository || !current || retained.sessionId !== current.current.sessionId ||
          !sourceEditable(current.current.state) || current.draft || dirty || command.current) {
        throw new Error("The previous draft is available for review. Start with an empty draft in the same repository to recover its files.");
      }
      const buffers = draftBuffers(retained.draft);
      const existing = buffers.filter(buffer => buffer.expectedDigest !== null && !buffer.patch);
      function assertCurrentBase(result: Awaited<ReturnType<typeof readEditorFiles>>) {
        if (result.current.sessionId !== current?.current.sessionId || result.current.revision !== current.current.revision || result.capture.head_commit !== current.base) {
          throw new Error("The new source workspace changed during review. Reload it before recovering the draft.");
        }
      }
      const source = await readEditorFiles(target.endpoint);
      assertCurrentBase(source);
      for (const buffer of buffers) {
        const issue = buffer.expectedDigest === null
          ? sourceCreationIssue(buffer.path, source.capture.tree.paths, source.capture.tree.truncated, target.scope, false)
          : sourcePathIssue(buffer.path, target.scope);
        if (issue) throw new Error(`${buffer.path}: ${issue}. The previous draft remains available for review.`);
      }
      for (let offset = 0; offset < existing.length; offset += 4) {
        const batch = existing.slice(offset, offset + 4);
        const result = await readEditorFiles(target.endpoint, batch.map(buffer => buffer.path));
        assertCurrentBase(result);
        for (const buffer of batch) {
          const file = result.capture.files.find(entry => entry.path === buffer.path);
          if (!file || file.content_digest !== buffer.expectedDigest) {
            throw new Error(`${buffer.path} has changed since the draft was saved. Compare its previous text with the current file before copying your changes.`);
          }
          buffer.baseline = file.content;
        }
      }
      for (const buffer of buffers.filter(file => file.patch)) {
        const result = await readEditorFiles(target.endpoint, [buffer.path], 1);
        assertCurrentBase(result);
        if (result.capture.files[0]?.region?.baseline_digest !== buffer.expectedDigest) {
          throw new Error(`${buffer.path} has changed since the section was saved. Review it against the current source before recovering it.`);
        }
      }
      if (!alive.current) return;
      setData({ ...current, buffers, selected: buffers[0]?.path ?? null, message: retained.draft.change_set.commit_message,
        objective: target.objectiveReadOnly ? current.objective : retained.draft.objective, origin: "import" });
      setRetained(null);
      setNotice("Recovered files are ready for review. Save them as a private draft for this workspace when ready.");
    }),
    reload: () => run(async () => { await load(); }),
    openSection: (path: string, line: number) => run(async () => {
      const current = latest.current;
      if (current && !blocked && !command.current && sourceEditable(current.current.state)) await loadSection(path, line, current);
    }),
    select: (path: string) => run(async () => {
      const current = latest.current; if (!current) return;
      if (!sourceEditable(current.current.state) || blocked) { setData({ ...current, selected: path }); return; }
      try {
        const buffer = await baseline(path, current);
        if (alive.current) {
          setSectionPath(buffer.patch ? path : null);
          setData({ ...current, selected: path, buffers: replaceSourceBuffer(current.buffers, buffer) });
        }
      } catch (failure) {
        if (!target.sectionEditing || !(failure instanceof SourceEditorRequestError) || failure.code !== "delivery_art_source_realization_patch_required") throw failure;
        if (alive.current) {
          setSectionPath(path);
          setData({ ...current, selected: path });
        }
        await loadSection(path, 1, current);
      }
    }),
    setMessage: (message: string) => update(current => ({ ...current, message })),
    setObjective: (objective: string) => update(current => ({ ...current, objective })),
    edit: (content: string) => update(current => ({ ...current, buffers: current.buffers.map(row => row.path === current.selected ? { ...row, content, deleted: false, changed: row.expectedDigest === null || row.baseline === undefined || content !== row.baseline } : row) })),
    add: (path: string) => addPath(path),
    addFolder: (path: string) => addPath(path, true),
    remove: () => update(current => ({ ...current, buffers: current.buffers.flatMap(row => row.path !== current.selected || row.patch ? [row] : row.expectedDigest === null ? [] : [{ ...row, changed: true, deleted: true }]) })),
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
        if (original?.patch) throw new Error(`${file.path} uses a section edit. Review or undo it before importing whole-file text.`);
        if (!original && current.paths.includes(file.path)) original = originals.get(file.path);
        if (!original) {
          if (current.truncated) throw new Error("This source tree is truncated. A new imported path cannot be proven absent; use a smaller owner scope or explicit owner review.");
          original = { path: file.path, content: "", baseline: null, expectedDigest: null, changed: false, deleted: false };
        }
        buffers = replaceSourceBuffer(buffers, { ...original, content: file.content, changed: original.expectedDigest === null || original.baseline === undefined || file.content !== original.baseline, deleted: false });
      }
      const operations = sourceBufferOperations(buffers);
      if (operations.length) assertSourceOperations(operations, target.sectionEditing);
      if (byteLength(JSON.stringify(operations)) > 1048576) throw new Error("The import exceeds the serialized source wire budget. Select fewer or smaller files.");
      if (alive.current) { setData({ ...current, buffers, selected: files[0]?.path ?? current.selected, origin: "import" }); setNotice(`${files.length} selected files prepared locally. Review the diff, then save the private draft.`); }
    }),
    assistantSnapshot: async (paths: string[], readOnlyPaths: string[] = []) => {
      let snapshot: { fingerprint: string; current: SourceEditorState; files: SourceBuffer[]; readOnlyPaths: string[] } | null = null;
      const success = await run(async () => {
        const current = latest.current;
        if (!current || command.current || !sourceEditable(current.current.state) || !paths.length || paths.length > 48) throw Error("Select editable source files first.");
        const files: SourceBuffer[] = [];
        for (const path of paths) {
          const file = await baseline(path, current);
          if (file.patch) throw Error("Section edits are available for manual editing only. Remove that file from AI context.");
          if (file.deleted) throw Error("Remove deleted files from AI context, or undo their deletion first.");
          files.push(file);
        }
        if (files.reduce((n, file) => n + byteLength(file.content), 0) > 262144) throw Error("Selected context exceeds 256 KiB. Choose fewer files.");
        if(readOnlyPaths.some(path=>!paths.includes(path)))throw Error("Read-only context must name selected files only.");
        snapshot = { fingerprint: sourceAssistantFingerprint(current.buffers, files), current: current.current, files, readOnlyPaths: [...readOnlyPaths] };
      });
      if (!success || !snapshot) throw Error("Selected source context could not be prepared. Your buffers are retained.");
      return snapshot as { fingerprint: string; current: SourceEditorState; files: SourceBuffer[]; readOnlyPaths: string[] };
    },
    applyAssistant: (snapshot: { fingerprint: string; current: SourceEditorState; files: SourceBuffer[]; readOnlyPaths?: string[] }, edits: Array<{path: string; content: string | null}>) => {
      const current = latest.current;
      if (!current || busy.current || command.current || blocked || !sourceEditable(current.current.state) || current.current.revision !== snapshot.current.revision || sourceAssistantFingerprint(current.buffers, snapshot.files) !== snapshot.fingerprint) throw Error("Your draft changed after this proposal. Ask again using the current files; later edits were preserved.");
      let buffers = [...current.buffers];
      for (const edit of edits) {
        const original = snapshot.files.find(file => file.path === edit.path);
        if (!original || current.buffers.some(buffer => buffer.path === edit.path && buffer.patch) || snapshot.readOnlyPaths?.includes(edit.path) || sourcePathIssue(edit.path, target.scope)) throw Error("The proposal escapes the selected editable files.");
        if (edit.content === null && original.expectedDigest === null) { buffers = buffers.filter(file => file.path !== edit.path); continue; }
        const file = { ...original, content: edit.content ?? original.content, deleted: edit.content === null,
          changed: edit.content === null || original.expectedDigest === null || edit.content !== original.baseline };
        buffers = [...buffers.filter(row => row.path !== file.path), file];
      }
      const operations = sourceBufferOperations(buffers); if (operations.length) assertSourceOperations(operations, target.sectionEditing);
      setData({ ...current, buffers, selected: edits[0]?.path ?? current.selected, origin: "manual" });
      setNotice("Reviewed AI changes added to your local draft. Save when ready; no source was committed.");
      const affected = edits.map(edit => buffers.find(file => file.path === edit.path) ?? { ...snapshot.files.find(file => file.path === edit.path)!, deleted: true });
      return { before: current, files: affected, paths: edits.map(edit => edit.path), after: sourceAssistantFingerprint(buffers, affected) };
    },
    undoAssistant: (token: { before: EditorData; after: string; files: SourceBuffer[]; paths: string[] }) => {
      const current=latest.current;
      if(!current||busy.current||command.current||current.current.revision!==token.before.current.revision||sourceAssistantFingerprint(current.buffers,token.files)!==token.after)throw Error("Later changes or a save exist. Undo individual edits instead; your newer work was preserved.");
      setData({...current,buffers:[...current.buffers.filter(file=>!token.paths.includes(file.path)),...token.before.buffers.filter(file=>token.paths.includes(file.path))]});setNotice("AI changes undone. Your earlier draft is restored.");
    },
    save: () => run(async () => {
      const current = latest.current; if (!current) return;
      if (!command.current) {
        if (current.objective.trim().length < target.objectiveMin || current.objective.length > target.objectiveMax) throw new Error(`Use an objective between ${target.objectiveMin} and ${target.objectiveMax} characters.`);
        if (current.current.state === "draft-ready" && current.current.attempt?.objectiveDigest !== await sourceObjectiveDigest(current.objective)) throw new Error("Amending this draft requires its original exact objective. Re-enter that objective, or cancel the old attempt before starting a different one.");
        command.current = assertOperatorDraftCommand(sourceSaveCommand(current.current, current.objective, current.message, current.buffers, current.origin, crypto.randomUUID(), new Date().toISOString(), target.sectionEditing), target.sectionEditing);
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
        const draft = await load(ack.savedDigest);
        if (draft) savedCallback.current(draft);
      } catch (error) {
        if (sourceDefinitiveSaveRejection(error, receivedAcknowledgement)) command.current = null;
        if (alive.current) setUncertain(command.current !== null);
        throw error;
      }
    }),
  };
}
