import type { ContextBoardConnection, ContextBoardCustomItem, ContextBoardSnapshot } from "./context-board-model.ts";

const kinds = new Set(["actor", "branch", "c4-component", "c4-container", "c4-external-system", "c4-person", "c4-relationship", "c4-software-system", "c4-system-boundary", "component", "container", "decision", "diagram", "end", "lane", "label-area", "label-field", "label-pill", "label-tag", "lifeline", "note", "process", "sequence-activation", "sequence-fragment", "sequence-message", "sequence-return", "shape-circle", "shape-diamond", "shape-rect", "shape-rounded", "start", "text", "topic", "uml-class", "uml-interface", "uml-package", "uml-state", "uml-usecase"]);
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
function item(value: unknown): ContextBoardCustomItem {
  object(value); exact(value, ["id", "kind", "label", "detail", "x", "y", "width", "height", "tone", "diagramType"]);
  id(value.id);
  if (!kinds.has(String(value.kind)) || typeof value.label !== "string" || !value.label.trim() || value.label.length > 500 ||
    typeof value.detail !== "string" || value.detail.length > 4000 || !finite(value.x) || !finite(value.y) ||
    (value.width !== undefined && !finite(value.width, true)) || (value.height !== undefined && !finite(value.height, true)) ||
    (value.tone !== undefined && !tones.has(String(value.tone))) ||
    (value.diagramType !== undefined && !["c4", "dependency", "flowchart", "freeform", "mindmap", "sequence", "swimlane", "uml"].includes(String(value.diagramType)))) {
    throw Error("Invalid board card geometry, content or style.");
  }
  return value as ContextBoardCustomItem;
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
export function applyContextBoardAdvisorPatch(base: ContextBoardSnapshot, value: unknown, coreIds: readonly string[] = []): ContextBoardSnapshot {
  object(value); exact(value, ["addItems", "updateItems", "removeItemIds", "addConnections", "removeConnectionIds"]);
  const next = structuredClone(base);
  const removed = new Set<string>();
  for (const key of list(value.removeItemIds)) {
    id(key); if (removed.has(key) || !next.customItems.some((entry) => entry.id === key)) throw Error("Cannot remove an absent or duplicate board card.");
    removed.add(key);
  }
  next.customItems = next.customItems.filter((entry) => !removed.has(entry.id));
  for (const key of removed) delete next.positions[key];
  next.connections = next.connections.filter((entry) => !("itemId" in entry.from && removed.has(entry.from.itemId)) && !("itemId" in entry.to && removed.has(entry.to.itemId)));
  const ids = new Set(next.customItems.map((entry) => entry.id));
  const allIds = new Set([...ids, ...coreIds, ...Object.keys(next.positions), ...next.templateTrays.map((tray) => tray.id)]);
  for (const raw of list(value.addItems)) {
    const entry = item(raw);
    if (allIds.has(entry.id) || removed.has(entry.id)) throw Error("New board card identity conflicts with existing content.");
    ids.add(entry.id); allIds.add(entry.id); next.customItems.push(structuredClone(entry));
  }
  const updated = new Set<string>();
  for (const update of list(value.updateItems)) {
    object(update); id(update.id);
    if (updated.has(update.id)) throw Error("Duplicate board card update.");
    updated.add(update.id);
    const index = next.customItems.findIndex((entry) => entry.id === update.id);
    if (index < 0) throw Error("Cannot update a card outside this board.");
    next.customItems[index] = item({ ...next.customItems[index], ...update });
    if (update.x !== undefined || update.y !== undefined) delete next.positions[update.id];
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
    object(raw); exact(raw, ["id", "from", "to", "label", "shape", "stroke", "tone", "tip", "startTip", "relationship"]); id(raw.id);
    if (connectionIds.has(raw.id) || removedConnections.has(raw.id)) throw Error("Connector identity conflicts with existing content.");
    endpoint(raw.from, endpoints); endpoint(raw.to, endpoints);
    const entry: Record<string, unknown> = { shape: "straight", stroke: "solid", tip: "arrow", ...raw };
    if (!["straight", "curve"].includes(String(entry.shape)) || !["solid", "dashed"].includes(String(entry.stroke)) || !tips.has(String(entry.tip)) ||
      (entry.startTip !== undefined && !tips.has(String(entry.startTip))) ||
      (entry.tone !== undefined && (!tones.has(String(entry.tone)) || entry.tone === "default")) ||
      (entry.label !== undefined && (typeof entry.label !== "string" || entry.label.length > 1000)) ||
      (entry.relationship !== undefined && !["aggregation", "association", "composition", "dependency", "directed-association", "generalization", "realization"].includes(String(entry.relationship)))) {
      throw Error("Invalid connector style or content.");
    }
    connectionIds.add(raw.id); next.connections.push(entry as unknown as ContextBoardConnection);
  }
  if (next.customItems.length > 250 || next.connections.length > 400) throw Error("Resulting board exceeds its draft bound.");
  return next;
}
