import { contextBoardSelectionKey, contextBoardSurfaceBounds } from "./context-board-core.ts";
import type { ContextBoardAlignAction, ContextBoardDistributeAction, ContextBoardPosition, ContextBoardSurfaceBox } from "./context-board-model.ts";

export const contextBoardArrangementActions = ["align-left", "align-right", "align-top", "align-bottom", "align-center-x", "align-center-y", "distribute-horizontal", "distribute-vertical"] as const;

/** One geometry implementation for the manual controls and bounded advisor. */
export function contextBoardArrangementTargets(surfaces: ContextBoardSurfaceBox[], action: ContextBoardAlignAction | ContextBoardDistributeAction) {
  const positions = new Map<string, ContextBoardPosition>();
  if (surfaces.length < (action.startsWith("distribute") ? 3 : 2)) return positions;
  const bounds = contextBoardSurfaceBounds(surfaces);
  if (action.startsWith("distribute")) {
    const horizontal = action === "distribute-horizontal";
    const sorted = [...surfaces].sort((a, b) => horizontal ? a.x - b.x : a.y - b.y);
    const total = sorted.reduce((sum, item) => sum + (horizontal ? item.width : item.height), 0);
    const gap = ((horizontal ? bounds.maxX - bounds.minX : bounds.maxY - bounds.minY) - total) / (sorted.length - 1);
    let cursor = horizontal ? bounds.minX : bounds.minY;
    for (const item of sorted) {
      positions.set(contextBoardSelectionKey(item), horizontal ? { x: cursor, y: item.y } : { x: item.x, y: cursor });
      cursor += (horizontal ? item.width : item.height) + gap;
    }
  } else for (const item of surfaces) {
    positions.set(contextBoardSelectionKey(item), {
      x: action === "align-left" ? bounds.minX : action === "align-right" ? bounds.maxX - item.width : action === "align-center-x" ? (bounds.minX + bounds.maxX - item.width) / 2 : item.x,
      y: action === "align-top" ? bounds.minY : action === "align-bottom" ? bounds.maxY - item.height : action === "align-center-y" ? (bounds.minY + bounds.maxY - item.height) / 2 : item.y,
    });
  }
  return positions;
}
