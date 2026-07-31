import type {
  ContextBoardConnection,
  ContextBoardConnectionEndpoint,
  ContextBoardConnectorShape,
  ContextBoardFreeConnectionEndpoint,
  ContextBoardItemType,
  ContextBoardLayerAction,
  ContextBoardPortSide,
  ContextBoardPosition,
  ContextBoardSelectionBox,
  ContextBoardSelectionItem,
  ContextBoardSketchStroke,
  ContextBoardSnapshot,
  ContextBoardSurfaceBounds,
  ContextBoardSurfaceBox,
} from "./context-board-model";

export const CONTEXT_BOARD_WIDTH = 5600;
export const CONTEXT_BOARD_HEIGHT = 3600;
export const CONTEXT_BOARD_MIN_ZOOM = 0.3;
export const CONTEXT_BOARD_MAX_ZOOM = 1.8;
export const CONTEXT_BOARD_ZOOM_STEP = 0.1;
export const CONTEXT_BOARD_CORE_CARD_WIDTH = 320;
export const CONTEXT_BOARD_CORE_CARD_HEIGHT = 116;
export const CONTEXT_BOARD_CUSTOM_NOTE_WIDTH = 264;
export const CONTEXT_BOARD_CUSTOM_NOTE_HEIGHT = 102;
export const CONTEXT_BOARD_CUSTOM_DIAGRAM_WIDTH = 304;
export const CONTEXT_BOARD_CUSTOM_DIAGRAM_HEIGHT = 132;

const CONTEXT_BOARD_CONNECTOR_TANGENT = 132;

type ContextBoardInventory = {
  connectorCount: number;
  isEmpty: boolean;
  looseCardCount: number;
  sketchStrokeCount: number;
  summary: string;
  templateCardCount: number;
  trayCount: number;
  visibleCoreCount: number;
};

export function cloneContextBoardSnapshot(
  snapshot: ContextBoardSnapshot,
): ContextBoardSnapshot {
  return {
    connections: snapshot.connections.map((connection) => ({
      ...connection,
      from: { ...connection.from },
      to: { ...connection.to },
    })),
    customItems: snapshot.customItems.map((item) => ({ ...item })),
    positions: Object.fromEntries(
      Object.entries(snapshot.positions).map(([id, position]) => [
        id,
        { ...position },
      ]),
    ),
    removedCoreIds: [...snapshot.removedCoreIds],
    sketchStrokes: snapshot.sketchStrokes.map((stroke) => ({
      ...stroke,
      points: stroke.points.map((point) => ({ ...point })),
    })),
    style: snapshot.style,
  templateTrays: snapshot.templateTrays.map((tray) => ({
      ...tray,
      itemIds: [...tray.itemIds],
    })),
  };
}

export function initialContextBoardPositions(): Record<
  string,
  ContextBoardPosition
> {
  return {
    context: { x: 1300, y: 760 },
    decision: { x: 1080, y: 990 },
    output: { x: 1450, y: 990 },
    source: { x: 995, y: 710 },
  };
}

export function initialContextBoardRemovedCoreIds() {
  return ["context", "decision", "output", "source"];
}

export function initialContextBoardConnections(): ContextBoardConnection[] {
  return [];
}

export function contextBoardSnapshotKey(snapshot: ContextBoardSnapshot) {
  return JSON.stringify(snapshot);
}

export function contextBoardSnapshotsEqual(
  first: ContextBoardSnapshot,
  second: ContextBoardSnapshot,
) {
  return contextBoardSnapshotKey(first) === contextBoardSnapshotKey(second);
}

export function contextBoardInventory(
  snapshot: ContextBoardSnapshot,
  coreNodes: Array<{
    id: string;
  }> = [],
): ContextBoardInventory {
  const visibleCoreCount = coreNodes.filter(
    (node) => !snapshot.removedCoreIds.includes(node.id) && snapshot.positions[node.id],
  ).length;
  const trayItemIds = new Set(
    snapshot.templateTrays.flatMap((tray) => tray.itemIds),
  );
  const templateCardCount = snapshot.customItems.filter((item) =>
    trayItemIds.has(item.id),
  ).length;
  const looseCardCount = snapshot.customItems.length - templateCardCount;
  const trayCount = snapshot.templateTrays.length;
  const sketchStrokeCount = snapshot.sketchStrokes.length;
  const connectorCount = snapshot.connections.length;
  const visualItemCount =
    visibleCoreCount +
    trayCount +
    templateCardCount +
    looseCardCount +
    sketchStrokeCount;
  const parts = [
    contextBoardCountLabel(trayCount, "tray"),
    contextBoardCountLabel(templateCardCount, "template card"),
    contextBoardCountLabel(looseCardCount, "loose card"),
    contextBoardCountLabel(visibleCoreCount, "system card"),
    contextBoardCountLabel(sketchStrokeCount, "sketch stroke"),
  ].filter((part): part is string => Boolean(part));

  return {
    connectorCount,
    isEmpty: visualItemCount === 0 && connectorCount === 0,
    looseCardCount,
    sketchStrokeCount,
    summary: [
      ...(parts.length > 0 ? parts : ["empty board"]),
      contextBoardCountLabel(connectorCount, "connector", true),
    ].join(", "),
    templateCardCount,
    trayCount,
    visibleCoreCount,
  };
}

export function contextBoardSelectionKey(
  item: ContextBoardSelectionItem,
) {
  return `${item.itemType}:${item.id}`;
}

export function contextBoardSelectionFromKey(
  key: string,
): ContextBoardSelectionItem | null {
  const [itemType, id] = key.split(":");

  if (
    !id ||
    (itemType !== "core" && itemType !== "custom" && itemType !== "template")
  ) {
    return null;
  }

  return { id, itemType };
}

export function contextBoardToggleSelection(
  items: ContextBoardSelectionItem[],
  item: ContextBoardSelectionItem,
) {
  const key = contextBoardSelectionKey(item);
  const exists = items.some(
    (selectedItem) => contextBoardSelectionKey(selectedItem) === key,
  );

  return exists
    ? items.filter(
        (selectedItem) => contextBoardSelectionKey(selectedItem) !== key,
      )
    : [...items, item];
}

export function contextBoardSurfaceBounds(
  items: ContextBoardSurfaceBox[],
): ContextBoardSurfaceBounds {
  return items.reduce(
    (accumulator, item) => ({
      maxX: Math.max(accumulator.maxX, item.x + item.width),
      maxY: Math.max(accumulator.maxY, item.y + item.height),
      minX: Math.min(accumulator.minX, item.x),
      minY: Math.min(accumulator.minY, item.y),
    }),
    {
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
    },
  );
}

export function contextBoardReorderBySelection<T extends { id: string }>(
  items: T[],
  selectedIds: Set<string>,
  action: ContextBoardLayerAction,
) {
  if (selectedIds.size === 0) {
    return items;
  }

  const selectedItems = items.filter((item) => selectedIds.has(item.id));
  const remainingItems = items.filter((item) => !selectedIds.has(item.id));

  return action === "bring-front"
    ? [...remainingItems, ...selectedItems]
    : [...selectedItems, ...remainingItems];
}

export function contextBoardSelectionRect(
  selectionBox: ContextBoardSelectionBox,
) {
  const x = Math.min(selectionBox.start.x, selectionBox.current.x);
  const y = Math.min(selectionBox.start.y, selectionBox.current.y);

  return {
    height: Math.abs(selectionBox.current.y - selectionBox.start.y),
    width: Math.abs(selectionBox.current.x - selectionBox.start.x),
    x,
    y,
  };
}

export function contextBoardRectsIntersect(
  left: ContextBoardPosition & { height: number; width: number },
  right: ContextBoardPosition & { height: number; width: number },
) {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
}

export function contextBoardPointDistance(
  first: ContextBoardPosition,
  second: ContextBoardPosition,
) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

export function contextBoardStrokeIntersectsPoint(
  stroke: ContextBoardSketchStroke,
  point: ContextBoardPosition,
  radius: number,
) {
  if (stroke.points.length === 0) {
    return false;
  }

  if (stroke.points.length === 1) {
    return (
      contextBoardPointDistance(stroke.points[0], point) <=
      radius + stroke.width / 2
    );
  }

  return stroke.points.some((strokePoint, index) => {
    const nextPoint = stroke.points[index + 1];

    if (!nextPoint) {
      return false;
    }

    return (
      contextBoardPointSegmentDistance(point, strokePoint, nextPoint) <=
      radius + stroke.width / 2
    );
  });
}

export function contextBoardPortPoint(
  box: ContextBoardPosition & { height: number; width: number },
  side: ContextBoardPortSide,
): ContextBoardPosition {
  switch (side) {
    case "bottom":
      return { x: box.x + box.width / 2, y: box.y + box.height };
    case "left":
      return { x: box.x, y: box.y + box.height / 2 };
    case "right":
      return { x: box.x + box.width, y: box.y + box.height / 2 };
    case "top":
      return { x: box.x + box.width / 2, y: box.y };
  }
}

export function contextBoardConnectorPath(
  from: ContextBoardPosition,
  to: ContextBoardPosition,
  fromSide: ContextBoardPortSide,
  toSide: ContextBoardPortSide,
  shape: ContextBoardConnectorShape,
) {
  if (shape === "straight") {
    return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  }

  const { c1, c2 } = contextBoardConnectorControls(
    from,
    to,
    fromSide,
    toSide,
  );

  return `M ${from.x} ${from.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${to.x} ${to.y}`;
}

export function contextBoardConnectorMidpoint(
  from: ContextBoardPosition,
  to: ContextBoardPosition,
  fromSide: ContextBoardPortSide,
  toSide: ContextBoardPortSide,
  shape: ContextBoardConnectorShape,
) {
  return contextBoardConnectorPointAt(from, to, fromSide, toSide, shape, 0.5);
}

export function contextBoardConnectorPointAt(
  from: ContextBoardPosition,
  to: ContextBoardPosition,
  fromSide: ContextBoardPortSide,
  toSide: ContextBoardPortSide,
  shape: ContextBoardConnectorShape,
  t: number,
) {
  if (shape === "straight") {
    return {
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
    };
  }

  const { c1, c2 } = contextBoardConnectorControls(
    from,
    to,
    fromSide,
    toSide,
  );
  const inverse = 1 - t;

  return {
    x:
      inverse ** 3 * from.x +
      3 * inverse ** 2 * t * c1.x +
      3 * inverse * t ** 2 * c2.x +
      t ** 3 * to.x,
    y:
      inverse ** 3 * from.y +
      3 * inverse ** 2 * t * c1.y +
      3 * inverse * t ** 2 * c2.y +
      t ** 3 * to.y,
  };
}

export function contextBoardConnectorControls(
  from: ContextBoardPosition,
  to: ContextBoardPosition,
  fromSide: ContextBoardPortSide,
  toSide: ContextBoardPortSide,
) {
  const fromVector = contextBoardSideVector(fromSide);
  const toVector = contextBoardSideVector(toSide);

  return {
    c1: {
      x: from.x + fromVector.x * CONTEXT_BOARD_CONNECTOR_TANGENT,
      y: from.y + fromVector.y * CONTEXT_BOARD_CONNECTOR_TANGENT,
    },
    c2: {
      x: to.x + toVector.x * CONTEXT_BOARD_CONNECTOR_TANGENT,
      y: to.y + toVector.y * CONTEXT_BOARD_CONNECTOR_TANGENT,
    },
  };
}

export function contextBoardSideVector(side: ContextBoardPortSide) {
  switch (side) {
    case "bottom":
      return { x: 0, y: 1 };
    case "left":
      return { x: -1, y: 0 };
    case "right":
      return { x: 1, y: 0 };
    case "top":
      return { x: 0, y: -1 };
  }
}

export function contextBoardOppositeSide(
  side: ContextBoardPortSide,
): ContextBoardPortSide {
  switch (side) {
    case "bottom":
      return "top";
    case "left":
      return "right";
    case "right":
      return "left";
    case "top":
      return "bottom";
  }
}

export function contextBoardEndpointMatches(
  endpoint: ContextBoardConnectionEndpoint,
  itemType: ContextBoardItemType,
  itemId: string,
) {
  if (contextBoardEndpointIsFree(endpoint)) {
    return false;
  }

  return endpoint.itemType === itemType && endpoint.itemId === itemId;
}

export function contextBoardEndpointInItemSet(
  endpoint: ContextBoardConnectionEndpoint,
  itemIds: Set<string>,
) {
  return !contextBoardEndpointIsFree(endpoint) && itemIds.has(endpoint.itemId);
}

export function contextBoardEndpointHitsSelection(
  endpoint: ContextBoardConnectionEndpoint,
  coreIds: Set<string>,
  customIds: Set<string>,
) {
  if (contextBoardEndpointIsFree(endpoint)) {
    return false;
  }

  return endpoint.itemType === "core"
    ? coreIds.has(endpoint.itemId)
    : endpoint.itemType === "custom" && customIds.has(endpoint.itemId);
}

export function contextBoardEndpointIsFree(
  endpoint: ContextBoardConnectionEndpoint,
): endpoint is ContextBoardFreeConnectionEndpoint {
  return endpoint.endpointType === "free";
}

export function contextBoardFreeEndpoint(
  point: ContextBoardPosition,
  side: ContextBoardPortSide,
): ContextBoardFreeConnectionEndpoint {
  return {
    endpointType: "free",
    side,
    x: Math.max(16, Math.min(CONTEXT_BOARD_WIDTH - 16, point.x)),
    y: Math.max(16, Math.min(CONTEXT_BOARD_HEIGHT - 16, point.y)),
  };
}

export function contextBoardConnectorDuplicateOffset(
  from: ContextBoardPosition,
  to: ContextBoardPosition,
) {
  const distanceX = to.x - from.x;
  const distanceY = to.y - from.y;
  const length = Math.hypot(distanceX, distanceY);
  const offset = 38;

  if (length < 1) {
    return { x: offset, y: offset };
  }

  return {
    x: (-distanceY / length) * offset,
    y: (distanceX / length) * offset,
  };
}

export function contextBoardEndpointsSharePort(
  left: ContextBoardConnectionEndpoint,
  right: ContextBoardConnectionEndpoint,
) {
  return (
    !contextBoardEndpointIsFree(left) &&
    !contextBoardEndpointIsFree(right) &&
    left.itemId === right.itemId &&
    left.itemType === right.itemType
  );
}

export function contextBoardHasConnection(
  connections: ContextBoardConnection[],
  nextConnection: ContextBoardConnection,
) {
  return connections.some(
    (connection) =>
      contextBoardEndpointEqual(connection.from, nextConnection.from) &&
      contextBoardEndpointEqual(connection.to, nextConnection.to),
  );
}

export function contextBoardEndpointEqual(
  left: ContextBoardConnectionEndpoint,
  right: ContextBoardConnectionEndpoint,
) {
  if (contextBoardEndpointIsFree(left) || contextBoardEndpointIsFree(right)) {
    return (
      contextBoardEndpointIsFree(left) &&
      contextBoardEndpointIsFree(right) &&
      left.side === right.side &&
      left.x === right.x &&
      left.y === right.y
    );
  }

  return (
    left.itemId === right.itemId &&
    left.itemType === right.itemType &&
    left.side === right.side
  );
}

export function clampContextBoardZoom(value: number) {
  return Math.min(
    CONTEXT_BOARD_MAX_ZOOM,
    Math.max(CONTEXT_BOARD_MIN_ZOOM, Number(value.toFixed(2))),
  );
}

function contextBoardCountLabel(
  count: number,
  label: string,
  includeZero = false,
) {
  if (count === 0 && !includeZero) {
    return null;
  }

  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

function contextBoardPointSegmentDistance(
  point: ContextBoardPosition,
  start: ContextBoardPosition,
  end: ContextBoardPosition,
) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (dx === 0 && dy === 0) {
    return contextBoardPointDistance(point, start);
  }

  const segmentPosition = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)),
  );
  const projection = {
    x: start.x + segmentPosition * dx,
    y: start.y + segmentPosition * dy,
  };

  return contextBoardPointDistance(point, projection);
}
