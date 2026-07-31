import {
  CONTEXT_BOARD_HEIGHT,
  CONTEXT_BOARD_WIDTH,
  contextBoardConnectorMidpoint,
  contextBoardEndpointIsFree,
  contextBoardPortPoint,
} from "./context-board-core";
import {
  contextBoardCustomItemResolvedSize,
  contextBoardCustomItemSize,
  contextBoardDiagramCopy,
} from "./context-board-template-helpers";
import type {
  ContextBoardConnection,
  ContextBoardConnectionEndpoint,
  ContextBoardConnectorShape,
  ContextBoardConnectorTone,
  ContextBoardCustomItem,
  ContextBoardDiagramType,
  ContextBoardPortSide,
  ContextBoardPosition,
  ContextBoardTemplateTray,
  ContextBoardTone,
} from "./context-board-model";

export function contextBoardDiagramStarterUsesIntrinsicCanvas(
  type: ContextBoardDiagramType,
) {
  return [
    "c4",
    "dependency",
    "flowchart",
    "freeform",
    "mindmap",
    "sequence",
    "swimlane",
    "uml",
  ].includes(type);
}

export function contextBoardDiagramStarterViewportFocus(type: ContextBoardDiagramType) {
  switch (type) {
    case "c4":
      return { leftClearance: 300, topClearance: 132, zoom: 0.62 };
    case "dependency":
      return { leftClearance: 280, topClearance: 112, zoom: 0.6 };
    case "flowchart":
      return { leftClearance: 320, topClearance: 96, zoom: 0.82 };
    case "freeform":
      return { leftClearance: 340, topClearance: 118, zoom: 0.9 };
    case "mindmap":
      return { leftClearance: 320, topClearance: 116, zoom: 0.44 };
    case "sequence":
      return { leftClearance: 270, topClearance: 104, zoom: 0.58 };
    case "swimlane":
      return { leftClearance: 300, topClearance: 112, zoom: 0.54 };
    case "uml":
      return { leftClearance: 300, topClearance: 110, zoom: 0.74 };
    default:
      return null;
  }
}

export function contextBoardDiagramStarterTone(
  type: ContextBoardDiagramType,
  index: number,
): ContextBoardTone | undefined {
  if (type === "mindmap") {
    return (
      [
        "amber",
        "green",
        "blue",
        "purple",
        "amber",
        "red",
        "amber",
        "green",
        "neutral",
        "blue",
        "blue",
        "purple",
        "purple",
        "amber",
        "amber",
        "red",
        "green",
        "amber",
        "neutral",
      ] satisfies ContextBoardTone[]
    )[index];
  }

  if (type !== "dependency") {
    return undefined;
  }

  return (
    [
      "amber",
      "blue",
      "purple",
      "red",
      "amber",
    ] satisfies ContextBoardTone[]
  )[index];
}

export function contextBoardDiagramStarterItemSize(
  type: ContextBoardDiagramType,
  index: number,
): Partial<Pick<ContextBoardCustomItem, "height" | "width">> {
  if (type !== "mindmap") {
    return {};
  }

  if (index === 0) {
    return { width: 300 };
  }

  if (index >= 1 && index <= 6) {
    return { width: 275 };
  }

  if (index === 18) {
    return { width: 300 };
  }

  if (index === 17) {
    return { width: 315 };
  }

  return { width: 245 };
}

export function contextBoardDiagramStarterLabelItems(
  type: ContextBoardDiagramType,
  items: ContextBoardCustomItem[],
  connections: ContextBoardConnection[],
  timestamp: number,
): ContextBoardCustomItem[] {
  return connections.flatMap((connection, index) => {
    const label = connection.label?.trim();
    const from = contextBoardStarterConnectionPoint(connection.from, items);
    const to = contextBoardStarterConnectionPoint(connection.to, items);

    if (!label || !from || !to) {
      return [];
    }

    return [
      contextBoardConnectorLabelItem({
        diagramType: type,
        from,
        fromSide: connection.from.side,
        id: `${type}-${timestamp}-label-${index}`,
        label,
        shape: connection.shape,
        to,
        tone: connection.tone,
        toSide: connection.to.side,
      }),
    ];
  });
}

export function contextBoardStarterConnectionPoint(
  endpoint: ContextBoardConnectionEndpoint,
  items: ContextBoardCustomItem[],
) {
  if (contextBoardEndpointIsFree(endpoint)) {
    return { x: endpoint.x, y: endpoint.y };
  }

  if (endpoint.itemType !== "custom") {
    return null;
  }

  const item = items.find((candidate) => candidate.id === endpoint.itemId);

  if (!item) {
    return null;
  }

  const size = contextBoardCustomItemResolvedSize(item);

  return contextBoardPortPoint(
    {
      height: size.height,
      width: size.width,
      x: item.x,
      y: item.y,
    },
    endpoint.side,
  );
}

export function contextBoardConnectorLabelItem({
  diagramType,
  from,
  fromSide,
  id,
  label,
  shape,
  to,
  tone = "amber",
  toSide,
}: {
  diagramType?: ContextBoardDiagramType;
  from: ContextBoardPosition;
  fromSide: ContextBoardPortSide;
  id: string;
  label: string;
  shape: ContextBoardConnectorShape;
  to: ContextBoardPosition;
  tone?: ContextBoardConnectorTone;
  toSide: ContextBoardPortSide;
}): ContextBoardCustomItem {
  const baseSize = contextBoardCustomItemSize("label-tag", diagramType);
  const width = Math.min(210, Math.max(baseSize.width, label.length * 7.2 + 42));
  const height = baseSize.height;
  const midpoint = contextBoardConnectorMidpoint(
    from,
    to,
    fromSide,
    toSide,
    shape,
  );

  return {
    detail: "",
    diagramType,
    height,
    id,
    kind: "label-tag",
    label,
    tone,
    width,
    x: Math.max(
      16,
      Math.min(CONTEXT_BOARD_WIDTH - width - 16, midpoint.x - width / 2),
    ),
    y: Math.max(
      16,
      Math.min(CONTEXT_BOARD_HEIGHT - height - 16, midpoint.y - height / 2),
    ),
  };
}

export function contextBoardTemplateTrayMetrics(type: ContextBoardDiagramType) {
  switch (type) {
    case "c4":
      return {
        minHeight: 1030,
        minWidth: 1580,
        padBottom: 86,
        padRight: 132,
        padTop: 116,
        padX: 118,
      };
    case "dependency":
      return {
        minHeight: 860,
        minWidth: 1360,
        padBottom: 104,
        padRight: 138,
        padTop: 122,
        padX: 122,
      };
    case "flowchart":
      return {
        minHeight: 940,
        minWidth: 1080,
        padBottom: 82,
        padRight: 110,
        padTop: 132,
        padX: 96,
      };
    case "freeform":
      return {
        minHeight: 460,
        minWidth: 880,
        padBottom: 82,
        padRight: 92,
        padTop: 118,
        padX: 92,
      };
    case "mindmap":
      return {
        minHeight: 1120,
        minWidth: 1840,
        padBottom: 120,
        padRight: 138,
        padTop: 128,
        padX: 132,
      };
    case "sequence":
      return {
        minHeight: 820,
        minWidth: 1220,
        padBottom: 92,
        padRight: 122,
        padTop: 124,
        padX: 116,
      };
    case "swimlane":
      return {
        minHeight: 820,
        minWidth: 1240,
        padBottom: 92,
        padRight: 96,
        padTop: 120,
        padX: 96,
      };
    case "uml":
      return {
        minHeight: 1040,
        minWidth: 1160,
        padBottom: 104,
        padRight: 122,
        padTop: 116,
        padX: 110,
      };
    default:
      return {
        minHeight: 240,
        minWidth: 360,
        padBottom: 36,
        padRight: 42,
        padTop: 72,
        padX: 42,
      };
  }
}

export function contextBoardTemplateTrayFromItems(
  type: ContextBoardDiagramType,
  items: ContextBoardCustomItem[],
  timestamp: number,
): ContextBoardTemplateTray {
  const bounds = items.reduce(
    (accumulator, item) => {
      const size = contextBoardCustomItemResolvedSize(item);
      return {
        maxX: Math.max(accumulator.maxX, item.x + size.width),
        maxY: Math.max(accumulator.maxY, item.y + size.height),
        minX: Math.min(accumulator.minX, item.x),
        minY: Math.min(accumulator.minY, item.y),
      };
    },
    {
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
    },
  );
  const trayMetrics = contextBoardTemplateTrayMetrics(type);
  const x = Math.max(16, bounds.minX - trayMetrics.padX);
  const y = Math.max(16, bounds.minY - trayMetrics.padTop);
  const width = Math.min(
    CONTEXT_BOARD_WIDTH - x - 16,
    Math.max(
      trayMetrics.minWidth,
      bounds.maxX - bounds.minX + trayMetrics.padX + trayMetrics.padRight,
    ),
  );
  const height = Math.min(
    CONTEXT_BOARD_HEIGHT - y - 16,
    Math.max(
      trayMetrics.minHeight,
      bounds.maxY - bounds.minY + trayMetrics.padTop + trayMetrics.padBottom,
    ),
  );

  return {
    diagramType: type,
    height,
    id: `template-${type}-${timestamp}`,
    itemIds: items.map((item) => item.id),
    label: `${contextBoardDiagramCopy(type).label} Template`,
    width,
    x,
    y,
  };
}

export function contextBoardEndpointFromPortElement(
  element: HTMLElement,
): ContextBoardConnectionEndpoint | null {
  const itemId = element.dataset.boardItemId;
  const itemType = element.dataset.boardItemType;
  const side = element.dataset.boardSide;

  if (
    !itemId ||
    (itemType !== "core" && itemType !== "custom") ||
    (side !== "bottom" && side !== "left" && side !== "right" && side !== "top")
  ) {
    return null;
  }

  return { itemId, itemType, side };
}
