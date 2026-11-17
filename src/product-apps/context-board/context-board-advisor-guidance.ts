import { CONTEXT_BOARD_WIDTH, CONTEXT_BOARD_HEIGHT, CONTEXT_BOARD_CUSTOM_DIAGRAM_WIDTH, CONTEXT_BOARD_CUSTOM_DIAGRAM_HEIGHT } from "./context-board-core.ts";
import { contextBoardCustomKinds, type ContextBoardDiagramType } from "./context-board-model.ts";
import { contextBoardCustomKindHasDetail } from "./context-board-template-helpers.ts";

/** Editor facts come from the renderer's own predicates, not a second kind list. */
export function contextBoardAdvisorEditorFacts(diagramType: ContextBoardDiagramType,
  visibleArea: { width: number; height: number } | null) {
  return {
    units: "CSS pixels",
    canvas: { width: CONTEXT_BOARD_WIDTH, height: CONTEXT_BOARD_HEIGHT, meaning: "Scrollable drawing extent, not the visible area" },
    initialVisibleArea: visibleArea,
    visibleAreaCoverage: "Sampled when this diagram opened; the operator may later resize, pan or zoom",
    defaultComponentSize: { width: CONTEXT_BOARD_CUSTOM_DIAGRAM_WIDTH, height: CONTEXT_BOARD_CUSTOM_DIAGRAM_HEIGHT },
    cardKinds: contextBoardCustomKinds.map(kind => ({ kind, displaysDetail: contextBoardCustomKindHasDetail(kind, diagramType) })),
    guidance: "Use a detail-displaying card for responsibilities. Keep text readable, expand a card for its text and space connectors around bodies. Use named views for different concerns; do not expand every card to fill the entire scrollable canvas.",
  };
}
