"use client";

import { useState } from "react";
import { TerasActionButton, TerasActionRow, TerasContentTray, TerasDialog,
  TerasNoteField, TerasSelectField, TerasTextField } from "@/teras";
import type { ContextBoardController } from "./use-context-board-controller";
import type { ContextDiagramDetails } from "./use-context-board-diagrams.ts";
import { contextBoardDiagramCopy, contextBoardDiagramTypes } from "./context-board-template-helpers";
import styles from "./context-board-diagrams-toolbar.module.css";

export function ContextBoardDiagramsToolbar({ board }: { board: ContextBoardController }) {
  const document = board.diagramDocument;
  const current = document.entries.find(view => view.id === document.activeId)!;
  const index = document.entries.findIndex(view => view.id === document.activeId);
  const [editing, setEditing] = useState<"create" | "edit" | "duplicate" | null>(null);
  const [removing, setRemoving] = useState(false);
  const [position, setPosition] = useState(0);
  const [draft, setDraft] = useState<ContextDiagramDetails>({ name: "", description: "", diagramType: "freeform" });
  if (!document.enabled) return null;
  const readOnly = board.contextBriefReadOnly;

  function open(mode: "create" | "edit" | "duplicate") {
    setPosition(index);
    setDraft(mode === "create" ? { name: "", description: "", diagramType: "c4" }
      : { name: mode === "duplicate" ? `${current.name} copy` : current.name,
        description: current.description, diagramType: current.diagramType });
    setEditing(mode);
  }

  function save() {
    if (readOnly || !draft.name.trim() || !editing) return;
    document.change(editing, draft, position); setEditing(null);
  }

  return (
    <>
      <div className={styles.toolbar} aria-label="Brief diagrams">
        <TerasSelectField className={styles.selector} label={`Diagram · ${index + 1} of ${document.entries.length}`}
          ariaLabel="Select brief diagram" value={document.activeId} onValueChange={document.select}
          options={document.entries.map((view, position) => ({ value: view.id, label: `${position + 1}. ${view.name}` }))} />
        <TerasActionRow spacing="compact">
          <TerasActionButton disabled={readOnly} onClick={() => open("create")}>Add diagram</TerasActionButton>
          <TerasActionButton emphasis="secondary" onClick={() => open("edit")}>Diagram details</TerasActionButton>
        </TerasActionRow>
      </div>
      <TerasDialog open={editing !== null} onClose={() => setEditing(null)} width="standard" height="content"
        contentOverflow="auto" closeLabel="Close diagram details" kicker="Context Brief"
        title={editing === "create" ? "Add Diagram" : editing === "duplicate" ? "Duplicate Diagram" : "Diagram Details"}
        description="Give each view a clear purpose. All diagrams belong to the same saved and finalized brief."
        actions={<><TerasActionButton emphasis="secondary" onClick={() => setEditing(null)}>{readOnly ? "Close" : "Cancel"}</TerasActionButton>
          {!readOnly ? <TerasActionButton disabled={!draft.name.trim()} onClick={save}>{editing === "create" || editing === "duplicate" ? "Add diagram" : "Save changes"}</TerasActionButton> : null}</>}>
        <div className={styles.fields}>
          <TerasTextField autoFocus label="Diagram name" maxLength={200} value={draft.name} disabled={readOnly}
            placeholder="Example: Runtime interactions" onValueChange={name => setDraft(value => ({ ...value, name }))} />
          <TerasSelectField label="Diagram type" disabled={readOnly} value={draft.diagramType}
            helper="Choose the tools for this view. Existing cards stay as authored."
            onValueChange={diagramType => setDraft(value => ({ ...value, diagramType }))}
            options={contextBoardDiagramTypes.map(type => ({ value: type, label: contextBoardDiagramCopy(type).label }))} />
          <TerasNoteField label="What this diagram explains" maxLength={8000} readOnly={readOnly} minimumHeight="medium"
            helper="Describe its scope, important relationships, evidence and open questions."
            value={draft.description} onValueChange={description => setDraft(value => ({ ...value, description }))} />
          {editing === "edit" && !readOnly ? <TerasContentTray kicker="Manage diagram">
            <TerasActionRow spacing="compact">
              <TerasActionButton emphasis="secondary" disabled={position === 0} onClick={() => setPosition(value => value - 1)}>Move earlier</TerasActionButton>
              <TerasActionButton emphasis="secondary" disabled={position === document.entries.length - 1} onClick={() => setPosition(value => value + 1)}>Move later</TerasActionButton>
              <TerasActionButton emphasis="secondary" onClick={() => { setDraft(value => ({ ...value, name: `${value.name} copy` })); setEditing("duplicate"); }}>Duplicate</TerasActionButton>
              <TerasActionButton emphasis="secondary" tone="danger" disabled={document.entries.length < 2} onClick={() => setRemoving(true)}>Delete diagram</TerasActionButton>
            </TerasActionRow>
            <small>Position {position + 1} of {document.entries.length}. Save changes to keep the new order.</small>
          </TerasContentTray> : null}
        </div>
      </TerasDialog>
      <TerasDialog open={removing} onClose={() => setRemoving(false)} width="compact" height="content" contentOverflow="auto"
        kicker="Delete diagram" title={`Delete ${current.name}?`} closeLabel="Cancel diagram deletion"
        description="This removes the selected diagram from the working brief. Other diagrams and saved checkpoints remain."
        actions={<><TerasActionButton emphasis="secondary" onClick={() => setRemoving(false)}>Keep diagram</TerasActionButton>
          <TerasActionButton tone="danger" onClick={() => { document.remove(); setRemoving(false); setEditing(null); }}>Delete diagram</TerasActionButton></>}>
        <p>The complete diagram, including its notes and connections, will be removed from this draft.</p>
      </TerasDialog>
    </>
  );
}
