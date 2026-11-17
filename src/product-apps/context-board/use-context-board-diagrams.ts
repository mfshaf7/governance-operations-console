"use client";

import { useState } from "react";
import { assertContextBoardDiagrams, captureContextBoardDiagrams, contextBoardCanvasSnapshot,
  contextBoardDiagrams, legacyContextDiagramId } from "./context-board-diagrams.ts";
import type { ContextBoardCanvasSnapshot, ContextBoardDiagram, ContextBoardDiagramType, ContextBoardSnapshot } from "./context-board-model.ts";

export type ContextDiagramDetails = Pick<ContextBoardDiagram, "name" | "description" | "diagramType">;

export function useContextBoardDiagrams(options: {
  enabled: boolean;
  getCanvas: () => ContextBoardCanvasSnapshot;
  restoreCanvas: (snapshot: ContextBoardCanvasSnapshot) => void;
  isReadOnly: () => boolean;
  markDirty: () => void;
  commitHistory: (snapshot: ContextBoardSnapshot) => void;
  setType: (type: ContextBoardDiagramType) => void;
  center: () => void;
  coreIds: string[];
}) {
  const [retained, setRetained] = useState<ContextBoardDiagram[] | null>(null);
  const [activeId, setActiveId] = useState(legacyContextDiagramId);
  const capture = () => captureContextBoardDiagrams(options.getCanvas(), retained, activeId);
  const entries = contextBoardDiagrams(capture());

  function restore(snapshot: ContextBoardSnapshot) {
    assertContextBoardDiagrams(snapshot);
    setRetained(snapshot.diagrams ? contextBoardDiagrams(snapshot) : null);
    setActiveId(snapshot.activeDiagramId ?? legacyContextDiagramId);
    const selected = snapshot.diagrams?.find(view => view.id === snapshot.activeDiagramId);
    options.restoreCanvas(contextBoardCanvasSnapshot(selected?.snapshot ?? snapshot));
    options.setType(selected?.diagramType ?? "freeform");
  }

  function select(id: string) {
    if (id === activeId) return;
    const current = contextBoardDiagrams(capture());
    const next = current.find(view => view.id === id);
    if (!next) throw Error("The selected diagram is not in this brief.");
    setRetained(current); setActiveId(id);
    options.restoreCanvas(next.snapshot); options.setType(next.diagramType); options.center();
  }

  function change(action: "create" | "edit" | "duplicate", details: ContextDiagramDetails, position?: number) {
    if (!options.enabled || options.isReadOnly()) return;
    const document = capture(), current = contextBoardDiagrams(document);
    const selected = current.find(view => view.id === activeId)!;
    const id = action === "edit" ? activeId : `diagram-${crypto.randomUUID()}`;
    const next: ContextBoardDiagram = { id, ...details, name: details.name.trim(),
      snapshot: action === "create" ? { connections: [], customItems: [], positions: {},
        removedCoreIds: [...options.coreIds], sketchStrokes: [], style: "architecture", templateTrays: [] }
        : contextBoardCanvasSnapshot(selected.snapshot) };
    const views = action === "edit" ? current.map(view => view.id === id ? next : view) : [...current, next];
    if (action === "edit" && position !== undefined && position >= 0 && position < views.length) {
      views.splice(views.findIndex(view => view.id === id), 1); views.splice(position, 0, next);
    }
    const result = { ...next.snapshot, diagrams: views, activeDiagramId: id };
    assertContextBoardDiagrams(result);
    options.commitHistory(document); restore(result); options.markDirty(); options.center();
  }

  function remove() {
    if (!options.enabled || options.isReadOnly()) return;
    const document = capture(), views = contextBoardDiagrams(document);
    if (views.length < 2) return;
    const index = views.findIndex(view => view.id === activeId);
    const remaining = views.filter(view => view.id !== activeId);
    const next = remaining[Math.min(index, remaining.length - 1)];
    options.commitHistory(document);
    restore({ ...next.snapshot, diagrams: remaining, activeDiagramId: next.id });
    options.markDirty(); options.center();
  }

  return { enabled: options.enabled, retained, activeId, entries, capture, restore, select, change, remove };
}
