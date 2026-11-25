export type ContextBoardSequenceNode = { id: string; title: string; reference?: string; detail: string; kind: "change" | "work" | "approval"; facts: Record<string, unknown> };
export type ContextBoardSequenceEdge = { from: string; to: string; label: string };
export type ContextBoardSequence = { nodes: ContextBoardSequenceNode[]; edges: ContextBoardSequenceEdge[]; issues: string[] };
type SequencePosition = { x: number; y: number };
type SequenceRelation = "change" | "start" | "closeout" | "approval";

export const contextBoardSequenceCanvasColor = "#383a3d";
export const contextBoardSequenceGridColor = "#2c2e31";
export const contextBoardSequenceStrokeWidth = 2.4;

export const contextBoardSequenceRelationStyles: Record<SequenceRelation, {
  stroke: string;
  dashArray?: string;
}> = {
  change: { stroke: "#64d1c3" },
  start: { stroke: "#9bc4fa" },
  closeout: { stroke: "#9bc4fa", dashArray: "6 5" },
  approval: { stroke: "#f5a867", dashArray: "6 3 1 3" },
};

export function contextBoardSequenceRelation(edge: ContextBoardSequenceEdge, source?: ContextBoardSequenceNode): SequenceRelation {
  if (source?.kind === "approval") return "approval";
  if (edge.label === "complete before closeout") return "closeout";
  return edge.label === "complete before start" ? "start" : "change";
}

export function contextBoardSequenceLabel(title: string, maxLine = 34) {
  const lines: string[] = [];
  for (const word of title.trim().split(/\s+/)) {
    if (!word) continue;
    const last = lines.at(-1);
    if (last && last.length + word.length < maxLine) lines[lines.length - 1] = `${last} ${word}`;
    else for (let index = 0; index < word.length; index += maxLine) lines.push(word.slice(index, index + maxLine));
  }
  return lines.slice(0, 3).map((line, index) => index === 2 && lines.length > 3 ? `${line.slice(0, maxLine - 2)}…` : line);
}

export function contextBoardSequenceLayout(plan: ContextBoardSequence, compact = false) {
  const nodeWidth = compact ? 204 : 270;
  const nodeHeight = compact ? 104 : 115;
  const columnStep = compact ? 260 : 345;
  const rowStep = compact ? 131 : 149;
  const margin = compact ? 16 : 29;
  const ids = new Set(plan.nodes.map(node => node.id));
  const incoming = new Map<string, string[]>();
  const outgoing = new Map<string, string[]>();
  for (const edge of plan.edges) {
    if (!ids.has(edge.from) || !ids.has(edge.to)) continue;
    incoming.set(edge.to, [...(incoming.get(edge.to) ?? []), edge.from]);
    outgoing.set(edge.from, [...(outgoing.get(edge.from) ?? []), edge.to]);
  }
  const connected = plan.nodes.filter(node => incoming.has(node.id) || outgoing.has(node.id));
  const unlinked = plan.nodes.filter(node => !incoming.has(node.id) && !outgoing.has(node.id));
  const pending = new Set(connected.map(node => node.id));
  const ranks = new Map<string, number>();
  while (pending.size) {
    const ready = [...pending].filter(id => (incoming.get(id) ?? []).every(from => ranks.has(from)));
    if (!ready.length) break;
    for (const id of ready) {
      ranks.set(id, Math.max(0, ...(incoming.get(id) ?? []).map(from => (ranks.get(from) ?? 0) + 1)));
      pending.delete(id);
    }
  }
  const columns: string[][] = [];
  for (const node of connected) {
    const index = ranks.get(node.id) ?? 0;
    (columns[index] ??= []).push(node.id);
  }
  // Order the rows against neighboring ranks to reduce crossings without changing dependencies.
  const order = new Map<string, number>();
  for (const column of columns) column.forEach((id, row) => order.set(id, row / Math.max(1, column.length - 1)));
  function orient(column: string[], links: Map<string, string[]>) {
    const positions = new Map(column.map(id => {
      const related = links.get(id) ?? [];
      return [id, related.length ? related.reduce((sum, key) => sum + (order.get(key) ?? 0), 0) / related.length : order.get(id) ?? 0];
    }));
    column.sort((left, right) => positions.get(left)! - positions.get(right)!);
    column.forEach((id, row) => order.set(id, row / Math.max(1, column.length - 1)));
  }
  for (const column of columns) orient(column, incoming);
  for (const column of [...columns].reverse()) orient(column, outgoing);

  const positions = new Map<string, SequencePosition>();
  const tall = Math.max(0, ...columns.map(column => column.length));
  for (const [index, column] of columns.entries()) {
    const offset = Math.min(rowStep / 2, (tall - column.length) * rowStep / 2);
    const top = margin + Math.round(offset);
    column.forEach((id, row) => positions.set(id, { x: margin + index * columnStep, y: top + row * rowStep }));
  }
  const independentColumns = Math.min(unlinked.length, Math.max(1, Math.min(4, columns.length || 3)));
  const unlinkedY = connected.length && unlinked.length ? 30 + tall * rowStep : null;
  for (const [index, node] of unlinked.entries()) {
    positions.set(node.id, {
      x: margin + index % independentColumns * columnStep,
      y: (unlinkedY === null ? margin : unlinkedY + 25) + Math.floor(index / independentColumns) * rowStep,
    });
  }
  return {
    positions, unlinkedY, nodeWidth, nodeHeight, cyclic: pending.size > 0,
    width: Math.max(nodeWidth + margin * 2, ...[...positions.values()].map(point => point.x + nodeWidth + margin)),
    height: Math.max(nodeHeight + margin * 2, ...[...positions.values()].map(point => point.y + nodeHeight + margin)),
  };
}

export function contextBoardSequencePaths(plan: ContextBoardSequence, layout: ReturnType<typeof contextBoardSequenceLayout>) {
  const { positions, nodeWidth, nodeHeight } = layout;
  const entries = plan.edges.flatMap((edge, index) => {
    const from = positions.get(edge.from), to = positions.get(edge.to);
    return from && to ? [{ edge, index, from, to }] : [];
  });
  const departure = new Map<number, number>(), arrival = new Map<number, number>();
  for (const [port, other, offsets] of [["from", "to", departure], ["to", "from", arrival]] as const) {
    const byNode = new Map<string, typeof entries>();
    for (const entry of entries) {
      const key = entry.edge[port];
      if (!byNode.has(key)) byNode.set(key, []);
      byNode.get(key)!.push(entry);
    }
    for (const group of byNode.values()) {
      group.sort((a, b) => a[other].y - b[other].y || a[other].x - b[other].x || a.index - b.index);
      const pitch = Math.min(12, (nodeHeight - 34) / Math.max(1, group.length - 1));
      group.forEach((entry, index) => offsets.set(entry.index, (index - (group.length - 1) / 2) * pitch));
    }
  }
  return entries.map(({ edge, index, from, to }) => {
    const startY = from.y + nodeHeight / 2 + (departure.get(index) ?? 0);
    const endY = to.y + nodeHeight / 2 + (arrival.get(index) ?? 0);
    return {
      edge, index,
      d: `M ${from.x + nodeWidth} ${startY} C ${from.x + nodeWidth + 36} ${startY}, ${to.x - 36} ${endY}, ${to.x} ${endY}`,
    };
  });
}

export function contextBoardSequenceSvg(plan: ContextBoardSequence, { compact = false, selectedId }: {
  compact?: boolean;
  selectedId?: string;
} = {}) {
  const layout = contextBoardSequenceLayout(plan, compact);
  const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };
  const escape = (value: string) => value.replace(/[&<>"']/g, character => entities[character]);
  const byId = new Map(plan.nodes.map(node => [node.id, node]));
  const markers = Object.entries(contextBoardSequenceRelationStyles).map(([relation, { stroke }]) =>
    `<marker id="arrow-${relation}" markerWidth="9" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="userSpaceOnUse"><path d="M 1 1 L 8 5 L 1 9" fill="none" stroke="${stroke}" stroke-width="1.5"/></marker>`
  ).join("");
  const grid = `<pattern id="board-grid" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M 0 .5 H 22 M .5 0 V 22" stroke="${contextBoardSequenceGridColor}"/></pattern>`;
  const edges = contextBoardSequencePaths(plan, layout).map(({ edge, d }) => {
    const relation = contextBoardSequenceRelation(edge, byId.get(edge.from));
    const { stroke, dashArray } = contextBoardSequenceRelationStyles[relation];
    return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${contextBoardSequenceStrokeWidth}"${dashArray ? ` stroke-dasharray="${dashArray}"` : ""} marker-end="url(#arrow-${relation})"><title>${escape(edge.label)}</title></path>`;
  }).join("");
  const nodes = plan.nodes.map(node => {
    const { x, y } = layout.positions.get(node.id)!;
    const selected = node.id === selectedId;
    const border = selected ? "#ffd17c" : node.kind === "approval" ? "#e5b351" : "#8197b5";
    const kind = node.kind === "approval" ? "REQUIRED APPROVAL" : node.kind === "change" ? "CHANGE GROUP" : "WORK ITEM";
    const label = contextBoardSequenceLabel(node.title, compact ? 25 : 34).map((line, index) => {
      const content = index === 0 && node.reference && line.startsWith(node.reference)
        ? `<tspan fill="#ffcc74" font-weight="700">${escape(node.reference)}</tspan>${escape(line.slice(node.reference.length))}`
        : escape(line);
      return `<text x="${x + 14}" y="${y + 49 + index * 17}" fill="#f4eee2" font-size="13">${content}</text>`;
    }).join("");
    return `<g><title>${escape(node.title)} — ${escape(node.detail)}</title><rect x="${x}" y="${y}" width="${layout.nodeWidth}" height="${layout.nodeHeight}" rx="10" fill="#17202c" stroke="${border}" stroke-width="${selected ? 3 : 1.5}"/><text x="${x + 14}" y="${y + 24}" fill="#ffcc74" font-size="11" font-weight="700">${kind}</text>${label}</g>`;
  }).join("");
  const unlinked = layout.unlinkedY === null ? "" : `<line x1="29" y1="${layout.unlinkedY - 22}" x2="${layout.width - 29}" y2="${layout.unlinkedY - 22}" stroke="#8996a5" stroke-dasharray="5 5"/><text x="29" y="${layout.unlinkedY}" fill="#dddfe2" font-size="11" font-weight="700">Items with no recorded links</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}" font-family="sans-serif"><title>Implementation sequence from the selected plan</title><defs>${markers}${grid}</defs><rect width="100%" height="100%" fill="${contextBoardSequenceCanvasColor}"/><rect width="100%" height="100%" fill="url(#board-grid)"/>${unlinked}${edges}${nodes}</svg>`;
}
