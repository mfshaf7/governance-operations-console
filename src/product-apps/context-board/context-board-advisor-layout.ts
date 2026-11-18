import { CONTEXT_BOARD_CORE_CARD_HEIGHT, CONTEXT_BOARD_CORE_CARD_WIDTH, CONTEXT_BOARD_HEIGHT, CONTEXT_BOARD_WIDTH, contextBoardSelectionKey, contextBoardSurfaceBounds } from "./context-board-core.ts";
import { contextBoardCustomItemResolvedSize } from "./context-board-template-helpers.ts";
import type { ContextBoardPosition, ContextBoardSelectionItem, ContextBoardSnapshot, ContextBoardSurfaceBox } from "./context-board-model.ts";

export type ContextBoardAdvisorViewport = { x: number; y: number; width: number; height: number; zoom: number };

export function contextBoardAdvisorSurfaces(board: ContextBoardSnapshot, coreIds: readonly string[]): ContextBoardSurfaceBox[] {
  return [...board.customItems.map(item => ({ ...item, ...contextBoardCustomItemResolvedSize(item), itemType: "custom" as const })),
    ...board.templateTrays.map(tray => ({ ...tray, itemType: "template" as const })),
    ...coreIds.filter(id => !board.removedCoreIds.includes(id) && board.positions[id]).map(id => ({ id, ...board.positions[id], itemType: "core" as const, width: CONTEXT_BOARD_CORE_CARD_WIDTH, height: CONTEXT_BOARD_CORE_CARD_HEIGHT }))];
}

/** Explicit member moves win over parent moves, matching the manual controls. */
export function moveContextBoardAdvisorSurfaces(board: ContextBoardSnapshot, targets: Map<string, ContextBoardPosition>, coreIds: readonly string[]) {
  const surfaces = contextBoardAdvisorSurfaces(board, coreIds), deltas = new Map<string, ContextBoardPosition>();
  for (const surface of surfaces) {
    const target = targets.get(contextBoardSelectionKey(surface)); if (!target) continue;
    deltas.set(contextBoardSelectionKey(surface), {
      x: Math.max(16, Math.min(CONTEXT_BOARD_WIDTH - surface.width - 16, target.x)) - surface.x,
      y: Math.max(16, Math.min(CONTEXT_BOARD_HEIGHT - surface.height - 16, target.y)) - surface.y,
    });
  }
  const children = new Map<string, ContextBoardPosition>();
  for (const tray of board.templateTrays) {
    const delta = deltas.get(`template:${tray.id}`); if (delta) for (const id of tray.itemIds) if (!deltas.has(`custom:${id}`)) children.set(id, delta);
  }
  board.customItems = board.customItems.map(item => { const delta = deltas.get(`custom:${item.id}`) ?? children.get(item.id); return delta ? { ...item, x: item.x + delta.x, y: item.y + delta.y } : item; });
  board.templateTrays = board.templateTrays.map(tray => { const delta = deltas.get(`template:${tray.id}`); return delta ? { ...tray, x: tray.x + delta.x, y: tray.y + delta.y } : tray; });
  for (const id of coreIds) { const delta = deltas.get(`core:${id}`); if (delta && board.positions[id]) board.positions[id] = { x: board.positions[id].x + delta.x, y: board.positions[id].y + delta.y }; }
}

export function contextBoardAdvisorSelection(value: unknown, board: ContextBoardSnapshot, coreIds: readonly string[]): ContextBoardSelectionItem[] {
  if (!Array.isArray(value) || value.length > 150) throw Error("Choose a bounded set of diagram objects.");
  const surfaces = contextBoardAdvisorSurfaces(board, coreIds), seen = new Set<string>();
  return value.map(item => {
    if (!item || typeof item !== "object" || Object.keys(item).some(key => !["id", "itemType"].includes(key))) throw Error("Invalid diagram selection.");
    const key = contextBoardSelectionKey(item);
    if (seen.has(key) || !surfaces.some(surface => contextBoardSelectionKey(surface) === key)) throw Error("Diagram selection names an absent or duplicate object.");
    seen.add(key); return { id: item.id, itemType: item.itemType };
  });
}

/** Center first content only. Existing diagrams and manual placement stay intact. */
export function centerNewContextBoardAdvisorContent(base: ContextBoardSnapshot, next: ContextBoardSnapshot, coreIds: readonly string[], viewport?: ContextBoardAdvisorViewport | null) {
  if (contextBoardAdvisorSurfaces(base, coreIds).length || base.sketchStrokes.length || base.connections.length) return;
  const surfaces = contextBoardAdvisorSurfaces(next, coreIds); if (!surfaces.length) return;
  const bounds = contextBoardSurfaceBounds(surfaces), width = bounds.maxX - bounds.minX, height = bounds.maxY - bounds.minY;
  if (width > CONTEXT_BOARD_WIDTH - 32 || height > CONTEXT_BOARD_HEIGHT - 32) throw Error("The new diagram exceeds the drawing area. Use another named view; no content was removed.");
  const center = viewport ? { x: viewport.x + viewport.width / 2, y: viewport.y + viewport.height / 2 } : { x: CONTEXT_BOARD_WIDTH / 2, y: CONTEXT_BOARD_HEIGHT / 2 };
  const dx = Math.max(16, Math.min(CONTEXT_BOARD_WIDTH - width - 16, center.x - width / 2)) - bounds.minX;
  const dy = Math.max(16, Math.min(CONTEXT_BOARD_HEIGHT - height - 16, center.y - height / 2)) - bounds.minY;
  next.customItems = next.customItems.map(item => ({ ...item, x: item.x + dx, y: item.y + dy }));
  next.templateTrays = next.templateTrays.map(tray => ({ ...tray, x: tray.x + dx, y: tray.y + dy }));
  next.connections = next.connections.map(edge => ({ ...edge,
    from: edge.from.endpointType === "free" ? { ...edge.from, x: edge.from.x + dx, y: edge.from.y + dy } : edge.from,
    to: edge.to.endpointType === "free" ? { ...edge.to, x: edge.to.x + dx, y: edge.to.y + dy } : edge.to }));
}
