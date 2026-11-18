import { CONTEXT_BOARD_WIDTH, CONTEXT_BOARD_HEIGHT, CONTEXT_BOARD_CUSTOM_DIAGRAM_WIDTH, CONTEXT_BOARD_CUSTOM_DIAGRAM_HEIGHT } from "./context-board-core.ts";
import { contextBoardCustomKinds, type ContextBoardDiagramType } from "./context-board-model.ts";
import { contextBoardCustomItemSize, contextBoardCustomKindCopy, contextBoardCustomKindHasDetail, contextBoardCustomKindHasPorts, contextBoardCustomKindAutoSizesText, contextBoardDiagramTypes, contextBoardDiagramComponentKinds, contextBoardDiagramCopy } from "./context-board-template-helpers.ts";
import { contextBoardArrangementActions } from "./context-board-arrangement.ts";
import type { ContextBoardAdvisorViewport } from "./context-board-advisor-layout.ts";

/** Editor facts come from the renderer's own predicates, not a second kind list. */
export function contextBoardAdvisorEditorFacts(diagramType: ContextBoardDiagramType,
  visibleArea: ({ width: number; height: number } & Partial<ContextBoardAdvisorViewport>) | null, starterExample?: unknown) {
  const rendering = (kind: typeof contextBoardCustomKinds[number], type: ContextBoardDiagramType) => ({
    displaysDetail: contextBoardCustomKindHasDetail(kind, type), automaticHeight: contextBoardCustomKindAutoSizesText(kind, type), defaultSize: contextBoardCustomItemSize(kind, type),
  });
  return {
    units: "CSS pixels",
    canvas: { width: CONTEXT_BOARD_WIDTH, height: CONTEXT_BOARD_HEIGHT, meaning: "Scrollable drawing extent, not the visible area" },
    initialVisibleArea: visibleArea,
    viewport: visibleArea && typeof visibleArea.x === "number" && typeof visibleArea.y === "number" && typeof visibleArea.zoom === "number" ? visibleArea : null,
    visibleAreaCoverage: "Captured for this request in board coordinates before zoom. Pan/zoom are view state, not changes to the architecture.",
    defaultComponentSize: { width: CONTEXT_BOARD_CUSTOM_DIAGRAM_WIDTH, height: CONTEXT_BOARD_CUSTOM_DIAGRAM_HEIGHT },
    diagramType,
    cardKinds: contextBoardCustomKinds.map(kind => {
      const current = rendering(kind, diagramType);
      return { kind, purpose: contextBoardCustomKindCopy(kind).detail, ...current, hasPorts: contextBoardCustomKindHasPorts(kind),
        diagramOverrides: Object.fromEntries((["freeform", ...contextBoardDiagramTypes] as ContextBoardDiagramType[])
          .map(type => [type, rendering(kind, type)] as const).filter(([, facts]) => JSON.stringify(facts) !== JSON.stringify(current))) };
    }),
    diagramFamilies: contextBoardDiagramTypes.map(type => ({ type, label: contextBoardDiagramCopy(type).label, kinds: contextBoardDiagramComponentKinds(type) })),
    starterExample: starterExample ?? null,
    operations: { cards: "addItems/updateItems/removeItemIds; autoSize=true restores automatic text height, false requires fixed height. New text cards default to automatic height.",
      trays: "addTrays/updateTrays/removeTrayIds. A tray has id,label,diagramType,x,y,width,height,itemIds,manual,tone and an autoFit operation setting. itemIds are existing custom card IDs in this view; an empty manual frame is decorative. New populated trays automatically fit their actual member sizes with a compact labelled frame, without the large starter-template minimum size; leave geometry null instead of guessing it. autoFit=true refits an existing frame around its members without moving them; false retains explicitly requested geometry. Moving a tray moves members unless their coordinates are explicitly updated. removeTrayIds removes only the frame; only explicit removeItemIds deletes cards. Membership is pruned when a card is removed.",
      connectors: "addConnections/updateConnections/removeConnectionIds. Updates preserve existing IDs; label='' clears text and relationship='none' clears a relationship. Port endpoints attach to current objects; free endpoints use board coordinates. Duplicate-style free connectors do not automatically attach to cards.",
      arrangements: { actions: contextBoardArrangementActions, format: "{action,items:[{id,itemType:custom|template|core}]}; alignment needs 2 objects, distribution 3. Distribution preserves the current extent, so it does not resolve overlap automatically." },
      layers: "{action:bring-front|send-back,items:[{id,itemType:custom|template}]}; reuses the manual layer order.",
      placement: "Default center-new centers first content in the actual viewport without changing its relative geometry. Use as-authored only for an explicit operator positioning request. Existing diagrams are never automatically recentered.",
      boundaries: "Edit only this selected view. Other supplied views are read-only knowledge. Sketch strokes and final decisions are not editable. Diagram name/type/explanation and the brief note are separate admitted fields. If changing type, use the card's diagramOverrides for that family's rendering and dimensions." },
    guidance: "Choose a diagram family that explains the actual system concern. Use named trays for meaningful groups and boundaries without hiding member detail. The starter is a tool example, never project evidence: replace generic example roles with the actual supplied architecture. Plain shapes and several sequence/boundary kinds do not show detail; do not store essential explanation there. Use automatic height for text cards and sensible spacing, not canvas-sized cards. New empty diagrams are centered by the editor in the captured viewport; a large diagram may extend and remain navigable. Existing manual positions stay put unless rearrangement was requested. Preserve full architectural content, identities and relationships. No fixed card count, one-screen rule or template establishes completeness.",
  };
}
