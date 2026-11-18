import type { ContextBoardArchitectureView, ContextBoardCanvasSnapshot, ContextBoardDiagram, ContextBoardSnapshot } from "./context-board-model.ts";

export const legacyContextDiagramId = "diagram-main";
/** Additional views carry knowledge only; they are never added to editable fields. */
export function contextBoardSupportingDiagrams(snapshot: ContextBoardSnapshot, ids: readonly string[]) {
  return contextBoardDiagrams(snapshot).filter(view => view.id !== (snapshot.activeDiagramId ?? legacyContextDiagramId) && ids.includes(view.id));
}
const types = new Set(["c4", "dependency", "flowchart", "freeform", "mindmap", "sequence", "swimlane", "uml"]);

/** A canvas cannot recursively contain a second document. */
export function contextBoardCanvasSnapshot(snapshot: ContextBoardCanvasSnapshot): ContextBoardCanvasSnapshot {
  return structuredClone({ connections: snapshot.connections, customItems: snapshot.customItems,
    positions: snapshot.positions, removedCoreIds: snapshot.removedCoreIds,
    sketchStrokes: snapshot.sketchStrokes, style: snapshot.style, templateTrays: snapshot.templateTrays });
}

export function contextBoardDiagrams(snapshot: ContextBoardSnapshot): ContextBoardDiagram[] {
  if (snapshot.diagrams !== undefined) {
    assertContextBoardDiagrams(snapshot);
    return structuredClone(snapshot.diagrams);
  }
  return [{ id: legacyContextDiagramId, name: "Diagram 1", description: "", diagramType: "freeform",
    snapshot: contextBoardCanvasSnapshot(snapshot) }];
}

export function captureContextBoardDiagrams(canvas: ContextBoardCanvasSnapshot,
  diagrams: ContextBoardDiagram[] | null, activeDiagramId: string): ContextBoardSnapshot {
  const current = contextBoardCanvasSnapshot(canvas);
  if (!diagrams) return current;
  if (!diagrams.some(view => view.id === activeDiagramId)) throw Error("The selected diagram is not in this brief.");
  return { ...current, activeDiagramId,
    diagrams: diagrams.map(view => ({ ...structuredClone(view),
      snapshot: view.id === activeDiagramId ? contextBoardCanvasSnapshot(current) : contextBoardCanvasSnapshot(view.snapshot) })) };
}

function canvas(value: unknown): value is ContextBoardCanvasSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return v.diagrams === undefined && v.activeDiagramId === undefined &&
    ["connections", "customItems", "removedCoreIds", "sketchStrokes", "templateTrays"].every(key => Array.isArray(v[key])) &&
    Boolean(v.positions) && typeof v.positions === "object" && !Array.isArray(v.positions) &&
    ["architecture", "flow", "map", "plain"].includes(String(v.style));
}

export function assertContextBoardDiagrams(snapshot: ContextBoardSnapshot): void {
  if (snapshot.diagrams === undefined) {
    if (snapshot.activeDiagramId !== undefined) throw Error("A selected diagram requires its retained document.");
    return;
  }
  const ids = new Set<string>();
  if (!Array.isArray(snapshot.diagrams) || !snapshot.diagrams.length) throw Error("A brief requires at least one diagram.");
  for (const view of snapshot.diagrams) {
    if (!view || typeof view.id !== "string" || !/^[A-Za-z0-9_.:-]{1,256}$/.test(view.id) || ids.has(view.id) ||
      typeof view.name !== "string" || !view.name.trim() || view.name.length > 200 ||
      typeof view.description !== "string" || view.description.length > 8000 ||
      !types.has(view.diagramType) || !canvas(view.snapshot)) throw Error("The retained diagram document is invalid; its original content must be preserved.");
    ids.add(view.id);
  }
  if (typeof snapshot.activeDiagramId !== "string" || !ids.has(snapshot.activeDiagramId)) throw Error("The retained selected diagram is missing.");
}

/** Navigation and the compatibility canvas do not change the architectural content. */
export function contextBoardDiagramContent(snapshot: ContextBoardSnapshot): ContextBoardDiagram[] | null {
  if (snapshot.diagrams === undefined) return null;
  assertContextBoardDiagrams(snapshot);
  return contextBoardDiagrams(snapshot);
}

/** Carry the architectural information into planning without canvas layout/style noise. */
export function contextBoardArchitectureContext(snapshot: ContextBoardSnapshot): ContextBoardArchitectureView[] {
  return contextBoardDiagrams(snapshot).map(view => ({ id: view.id, name: view.name,
    description: view.description, diagramType: view.diagramType,
    cards: view.snapshot.customItems.map(({ id, kind, label, detail }) => ({ id, kind, label, detail })),
    connections: view.snapshot.connections.map(({ id, from, to, label, relationship }) => ({ id, from, to, label, relationship })),
    groups: view.snapshot.templateTrays.map(({ id, label, itemIds }) => ({ id, label, itemIds: [...itemIds] })) }));
}

/** Drop an advisor-created legacy wrapper only when no later metadata needs it. */
export function restoreLegacyContextBoardCanvas(snapshot: ContextBoardSnapshot, wasLegacyCanvas: boolean): ContextBoardSnapshot {
  const view = snapshot.diagrams?.[0];
  return wasLegacyCanvas && snapshot.diagrams?.length === 1 && snapshot.activeDiagramId === legacyContextDiagramId &&
    view?.id === legacyContextDiagramId && view.name === "Diagram 1" && view.description === "" && view.diagramType === "freeform"
    ? contextBoardCanvasSnapshot(snapshot) : snapshot;
}
