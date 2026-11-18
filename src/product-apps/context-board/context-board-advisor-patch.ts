import { contextBoardCustomKinds, type ContextBoardConnection, type ContextBoardCustomItem, type ContextBoardSnapshot, type ContextBoardTemplateTray, type ContextBoardDiagramType } from "./context-board-model.ts";
import { captureContextBoardDiagrams } from "./context-board-diagrams.ts";
import { contextBoardReorderBySelection, contextBoardSelectionKey } from "./context-board-core.ts";
import { contextBoardCustomItemSize, contextBoardCustomKindAutoSizesText } from "./context-board-template-helpers.ts";
import { contextBoardTemplateTrayFromItems } from "./context-board-starter-helpers.ts";
import { contextBoardArrangementActions, contextBoardArrangementTargets } from "./context-board-arrangement.ts";
import { centerNewContextBoardAdvisorContent, contextBoardAdvisorSelection, contextBoardAdvisorSurfaces, moveContextBoardAdvisorSurfaces, type ContextBoardAdvisorViewport } from "./context-board-advisor-layout.ts";

const kinds = new Set<string>(contextBoardCustomKinds);
const tones = new Set(["amber", "blue", "default", "green", "neutral", "purple", "red"]);
const sides = new Set(["bottom", "left", "right", "top"]);
const tips = new Set(["arrow", "diamond", "filled-diamond", "plain", "triangle"]);
function object(value: unknown): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("Malformed board draft patch.");
}
function exact(value: Record<string, unknown>, keys: string[]) {
  if (Object.keys(value).some((key) => !keys.includes(key))) throw Error("Unsupported board patch field.");
}
function id(value: unknown): asserts value is string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_.:-]{1,256}$/.test(value)) throw Error("Invalid board item identity.");
}
function finite(value: unknown, positive = false) {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= 100_000 && (!positive || value >= 20);
}
function list(value: unknown): unknown[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 150) throw Error("Board edit batch exceeds its bound.");
  return value;
}
function item(value: unknown, adding = false, diagramType?: ContextBoardDiagramType): ContextBoardCustomItem {
  object(value); exact(value, ["id", "kind", "label", "detail", "x", "y", "width", "height", "tone", "diagramType", "autoSize"]);
  const { autoSize, ...ordinary } = value;
  if (autoSize !== undefined && typeof autoSize !== "boolean") throw Error("Invalid automatic card sizing setting.");
  value = { ...(adding && diagramType ? { diagramType } : {}), ...ordinary };
  object(value);
  id(value.id);
  if (!kinds.has(String(value.kind)) || typeof value.label !== "string" || !value.label.trim() || value.label.length > 500 ||
    typeof value.detail !== "string" || value.detail.length > 4000 || !finite(value.x) || !finite(value.y) ||
    (value.width !== undefined && !finite(value.width, true)) || (value.height !== undefined && !finite(value.height, true)) ||
    (value.tone !== undefined && !tones.has(String(value.tone))) ||
    (value.diagramType !== undefined && !["c4", "dependency", "flowchart", "freeform", "mindmap", "sequence", "swimlane", "uml"].includes(String(value.diagramType)))) {
    throw Error("Invalid board card geometry, content or style.");
  }
  const result = value as ContextBoardCustomItem;
  if (adding && result.width === undefined) result.width = contextBoardCustomItemSize(result.kind, result.diagramType).width;
  if (autoSize === true || adding && autoSize !== false && contextBoardCustomKindAutoSizesText(result.kind, result.diagramType)) delete result.height;
  if (autoSize === false && result.height === undefined) throw Error("Fixed-size cards need an explicit height.");
  return result;
}

function tray(input: unknown, ids: Set<string>, board: ContextBoardSnapshot, options: { viewport?: ContextBoardAdvisorViewport | null; diagramType?: ContextBoardDiagramType }, adding = false): ContextBoardTemplateTray {
  object(input); exact(input, ["id", "label", "diagramType", "x", "y", "width", "height", "itemIds", "manual", "tone", "autoFit"]); id(input.id);
  const { autoFit, ...raw } = input;
  if (autoFit !== undefined && typeof autoFit !== "boolean") throw Error("Invalid automatic tray fitting setting.");
  if (!Array.isArray(raw.itemIds) || raw.itemIds.some(key => !ids.has(String(key)))) throw Error("Tray members must exist in this diagram.");
  const diagramType = (raw.diagramType ?? options.diagramType ?? "freeform") as ContextBoardDiagramType;
  const fit = (autoFit === true || adding && autoFit !== false) && raw.itemIds.length > 0;
  const geometry = fit ? contextBoardTemplateTrayFromItems(diagramType, board.customItems.filter(card => (raw.itemIds as unknown[]).includes(card.id)), 0, { constrainToCanvas: false, fitContents: true }) : null;
  const value: Record<string, unknown> = { ...(adding ? { x: (options.viewport ? options.viewport.x + options.viewport.width / 2 : 2800) - 260,
    y: (options.viewport ? options.viewport.y + options.viewport.height / 2 : 1800) - 130, width: 520, height: 260 } : {}),
    ...raw, diagramType, ...(geometry ? { x: geometry.x, y: geometry.y, width: geometry.width, height: geometry.height } : {}) };
  if (typeof value.label !== "string" || !value.label.trim() || value.label.length > 500 || !finite(value.x) || !finite(value.y) || !finite(value.width, true) || !finite(value.height, true) ||
    !["c4", "dependency", "flowchart", "freeform", "mindmap", "sequence", "swimlane", "uml"].includes(String(value.diagramType)) ||
    !Array.isArray(value.itemIds) || value.itemIds.length > 250 || new Set(value.itemIds).size !== value.itemIds.length || value.itemIds.some(key => !ids.has(String(key))) ||
    value.manual !== undefined && typeof value.manual !== "boolean" || value.tone !== undefined && !tones.has(String(value.tone))) throw Error("Invalid tray or member selection. Members must exist in this diagram.");
  return { manual: value.itemIds.length === 0, ...value } as ContextBoardTemplateTray;
}

function connection(raw: unknown, endpoints: Map<string, Set<string>>): ContextBoardConnection {
  object(raw); exact(raw, ["id", "from", "to", "label", "shape", "stroke", "tone", "tip", "startTip", "relationship"]); id(raw.id);
  endpoint(raw.from, endpoints); endpoint(raw.to, endpoints);
  const entry: Record<string, unknown> = { shape: "straight", stroke: "solid", tip: "arrow", ...raw };
  if (entry.relationship === "none") delete entry.relationship;
  if (!["straight", "curve"].includes(String(entry.shape)) || !["solid", "dashed"].includes(String(entry.stroke)) || !tips.has(String(entry.tip)) ||
    entry.startTip !== undefined && !tips.has(String(entry.startTip)) || entry.tone !== undefined && (!tones.has(String(entry.tone)) || entry.tone === "default") ||
    entry.label !== undefined && (typeof entry.label !== "string" || entry.label.length > 1000) ||
    entry.relationship !== undefined && !["aggregation", "association", "composition", "dependency", "directed-association", "generalization", "realization"].includes(String(entry.relationship))) throw Error("Invalid connector style or content.");
  return entry as unknown as ContextBoardConnection;
}
function endpoint(value: unknown, ids: Map<string, Set<string>>) {
  object(value);
  if (value.endpointType === "free") {
    exact(value, ["endpointType", "x", "y", "side"]);
    if (!finite(value.x) || !finite(value.y) || !sides.has(String(value.side))) throw Error("Invalid free connector endpoint.");
  } else {
    exact(value, ["endpointType", "itemId", "itemType", "side"]);
    if ((value.endpointType !== undefined && value.endpointType !== "port") ||
      !ids.get(String(value.itemType))?.has(String(value.itemId)) || !sides.has(String(value.side))) throw Error("Connector points outside the current board.");
  }
}

/** Validate and materialize the entire transaction before touching React state. */
export function applyContextBoardAdvisorPatch(base: ContextBoardSnapshot, value: unknown, coreIds: readonly string[] = [], options: { viewport?: ContextBoardAdvisorViewport | null; diagramType?: ContextBoardDiagramType } = {}): ContextBoardSnapshot {
  object(value); exact(value, ["addItems", "updateItems", "removeItemIds", "addConnections", "removeConnectionIds", "updateConnections", "addTrays", "updateTrays", "removeTrayIds", "arrangements", "layers", "placement"]);
  if (value.placement !== undefined && !["center-new", "as-authored"].includes(String(value.placement))) throw Error("Unknown new-diagram placement.");
  const next = structuredClone(base);
  const removed = new Set<string>();
  for (const key of list(value.removeItemIds)) {
    id(key); if (removed.has(key) || !next.customItems.some((entry) => entry.id === key)) throw Error("Cannot remove an absent or duplicate board card.");
    removed.add(key);
  }
  next.customItems = next.customItems.filter((entry) => !removed.has(entry.id));
  if (removed.size) next.templateTrays = next.templateTrays.map(group => ({ ...group, itemIds: group.itemIds.filter(key => !removed.has(key)) })).filter(group => group.manual || group.itemIds.length > 0);
  for (const key of removed) delete next.positions[key];
  next.connections = next.connections.filter((entry) => !("itemId" in entry.from && removed.has(entry.from.itemId)) && !("itemId" in entry.to && removed.has(entry.to.itemId)));
  const ids = new Set(next.customItems.map((entry) => entry.id));
  const allIds = new Set([...ids, ...coreIds, ...Object.keys(next.positions), ...next.templateTrays.map((tray) => tray.id)]);
  for (const raw of list(value.addItems)) {
    const entry = item(raw, true, options.diagramType);
    if (allIds.has(entry.id) || removed.has(entry.id)) throw Error("New board card identity conflicts with existing content.");
    ids.add(entry.id); allIds.add(entry.id); next.customItems.push(structuredClone(entry));
  }
  const updated = new Set<string>(), explicitlyMoved = new Set<string>();
  for (const update of list(value.updateItems)) {
    object(update); id(update.id);
    if (updated.has(update.id)) throw Error("Duplicate board card update.");
    updated.add(update.id);
    const index = next.customItems.findIndex((entry) => entry.id === update.id);
    if (index < 0) throw Error("Cannot update a card outside this board.");
    next.customItems[index] = item({ ...next.customItems[index], ...update });
    if (update.x !== undefined || update.y !== undefined) { delete next.positions[update.id]; explicitlyMoved.add(update.id); }
  }
  const removedTrays = new Set(base.templateTrays.filter(group => !next.templateTrays.some(retained => retained.id === group.id)).map(group => group.id));
  const explicitlyRemovedTrays = new Set<string>();
  for (const key of list(value.removeTrayIds)) {
    id(key); if (explicitlyRemovedTrays.has(key) || !base.templateTrays.some(group => group.id === key)) throw Error("Cannot remove an absent or duplicate tray.");
    explicitlyRemovedTrays.add(key); removedTrays.add(key);
  }
  // Removing a frame is not permission to delete its architectural contents.
  next.templateTrays = next.templateTrays.filter(group => !removedTrays.has(group.id));
  next.connections = next.connections.filter(edge => !("itemId" in edge.from && removedTrays.has(edge.from.itemId)) && !("itemId" in edge.to && removedTrays.has(edge.to.itemId)));
  const fittedTrays = new Set<string>();
  for (const raw of list(value.addTrays)) {
    const entry = tray(raw, ids, next, options, true);
    if (allIds.has(entry.id) || removedTrays.has(entry.id)) throw Error("Tray identity conflicts with existing content.");
    allIds.add(entry.id); next.templateTrays.push(entry);
    if ((raw as Record<string, unknown>).autoFit !== false && entry.itemIds.length) fittedTrays.add(entry.id);
  }
  const updatedTrays = new Set<string>();
  for (const raw of list(value.updateTrays)) {
    object(raw); id(raw.id);
    const index = next.templateTrays.findIndex(group => group.id === raw.id);
    if (index < 0 || updatedTrays.has(raw.id)) throw Error("Cannot update an absent or duplicate tray.");
    updatedTrays.add(raw.id);
    const previous = next.templateTrays[index], entry = tray({ ...previous, ...raw }, ids, next, options);
    const dx = entry.x - previous.x, dy = entry.y - previous.y;
    if (raw.autoFit !== true && (dx || dy)) next.customItems = next.customItems.map(card => previous.itemIds.includes(card.id) && !explicitlyMoved.has(card.id) ? { ...card, x: card.x + dx, y: card.y + dy } : card);
    next.templateTrays[index] = entry;
    if (raw.autoFit === true && entry.itemIds.length) fittedTrays.add(entry.id);
  }
  const removedConnections = new Set<string>();
  for (const key of list(value.removeConnectionIds)) {
    id(key);
    if (removedConnections.has(key) || !base.connections.some((entry) => entry.id === key)) throw Error("Cannot remove an absent or duplicate connector.");
    removedConnections.add(key);
  }
  next.connections = next.connections.filter((entry) => !removedConnections.has(entry.id));
  const connectionIds = new Set(next.connections.map((entry) => entry.id));
  const endpoints = new Map([
    ["custom", ids], ["core", new Set(coreIds.filter((key) => !next.removedCoreIds.includes(key)))],
    ["template", new Set(next.templateTrays.map((tray) => tray.id))],
  ]);
  for (const raw of list(value.addConnections)) {
    const entry = connection(raw, endpoints);
    if (connectionIds.has(entry.id) || removedConnections.has(entry.id)) throw Error("Connector identity conflicts with existing content.");
    connectionIds.add(entry.id); next.connections.push(entry);
  }
  const updatedConnections = new Set<string>();
  for (const raw of list(value.updateConnections)) {
    object(raw); id(raw.id); const index = next.connections.findIndex(edge => edge.id === raw.id);
    if (index < 0 || updatedConnections.has(raw.id)) throw Error("Cannot update an absent or duplicate connector.");
    updatedConnections.add(raw.id); next.connections[index] = connection({ ...next.connections[index], ...raw }, endpoints);
  }
  for (const raw of list(value.arrangements)) {
    object(raw); exact(raw, ["action", "items"]);
    if (!(contextBoardArrangementActions as readonly unknown[]).includes(raw.action)) throw Error("Unknown diagram arrangement.");
    const selected = contextBoardAdvisorSelection(raw.items, next, coreIds), keys = new Set(selected.map(contextBoardSelectionKey));
    const surfaces = contextBoardAdvisorSurfaces(next, coreIds).filter(surface => keys.has(contextBoardSelectionKey(surface)));
    if (surfaces.length < (String(raw.action).startsWith("distribute") ? 3 : 2)) throw Error("Alignment needs two objects; distribution needs three.");
    moveContextBoardAdvisorSurfaces(next, contextBoardArrangementTargets(surfaces, raw.action as typeof contextBoardArrangementActions[number]), coreIds);
  }
  for (const raw of list(value.layers)) {
    object(raw); exact(raw, ["action", "items"]);
    if (raw.action !== "bring-front" && raw.action !== "send-back") throw Error("Unknown diagram layer action.");
    const selected = contextBoardAdvisorSelection(raw.items, next, coreIds);
    if (selected.some(item => item.itemType === "core")) throw Error("Layer changes apply to custom cards and trays.");
    next.customItems = contextBoardReorderBySelection(next.customItems, new Set(selected.filter(item => item.itemType === "custom").map(item => item.id)), raw.action);
    next.templateTrays = contextBoardReorderBySelection(next.templateTrays, new Set(selected.filter(item => item.itemType === "template").map(item => item.id)), raw.action);
  }
  // Fit against final positions, including arrangement operations in this batch.
  next.templateTrays = next.templateTrays.map(entry => fittedTrays.has(entry.id)
    ? tray({ ...entry, autoFit: true }, ids, next, options) : entry);
  if (value.placement !== "as-authored") centerNewContextBoardAdvisorContent(base, next, coreIds, options.viewport);
  if (next.customItems.length > 250 || next.templateTrays.length > 250 || next.connections.length > 400) throw Error("Resulting board exceeds its draft bound.");
  return next.diagrams ? captureContextBoardDiagrams(next, next.diagrams, next.activeDiagramId!) : next;
}
