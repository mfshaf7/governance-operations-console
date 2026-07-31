import type {
  DeliveryPackageSummary,
  DeliveryWorkDesignBoardLooseItemKind,
} from "../../../../../read-model/index.ts";

import {
  cloneWorkDesignBoardSnapshot,
  initialWorkDesignBoardPositions,
  initialWorkDesignBoardRemovedCoreIds,
} from "../../../../../product-adapters/context-board/index.ts";
import { workDesignBoardToneFromDeliveryTone } from "../../../../../work-model/work-design/work-design-artifact-types.ts";
import type {
  WorkDesignBoardColorTone,
  WorkDesignBoardConnection,
  WorkDesignBoardCustomItem,
  WorkDesignBoardCustomKind,
  WorkDesignBoardSketchStroke,
  WorkDesignBoardSketchTone,
  WorkDesignBoardSnapshot,
} from "../../model/work-design-model.ts";
import { workDesignFinalizedBriefView } from "./work-design-brief-projection.ts";

export function workDesignFinalizedContextBoardSnapshot({
  deliveryPackage,
}: {
  deliveryPackage: DeliveryPackageSummary;
}): WorkDesignBoardSnapshot {
  const session = deliveryPackage.work_design_context_session ?? null;
  const sessionSketchStrokes = workDesignFinalizedSketchStrokes(
    session?.board_snapshot?.sketch_strokes,
  );
  const sessionLooseItems = workDesignFinalizedLooseItems(
    session?.board_snapshot?.loose_items,
  );
  const brief = workDesignFinalizedBriefView({
    decision: session?.decision ?? "proceed",
    deliveryPackage,
    note:
      session?.note ??
      "Finalized context brief carried forward for tree building.",
    savedSession: null,
    session,
  });

  if (
    brief.diagramNodes.length === 0 &&
    (sessionSketchStrokes.length > 0 || sessionLooseItems.length > 0)
  ) {
    return cloneWorkDesignBoardSnapshot({
      connections: [],
      customItems: sessionLooseItems,
      positions: initialWorkDesignBoardPositions(),
      removedCoreIds: initialWorkDesignBoardRemovedCoreIds(),
      sketchStrokes: sessionSketchStrokes,
      style: "plain",
      templateTrays: [],
    });
  }

  const itemWidth = 278;
  const itemHeight = 124;
  const horizontalGap = 128;
  const verticalGap = 172;
  const startX = 980;
  const startY = brief.diagramNodes.length > 6 ? 820 : 915;
  const complexLayout = brief.diagramNodes.length > 6;
  const columnCount = complexLayout
    ? Math.min(4, Math.max(3, Math.ceil(Math.sqrt(brief.diagramNodes.length))))
    : Math.max(1, brief.diagramNodes.length);
  const customItems: WorkDesignBoardCustomItem[] = brief.diagramNodes.map(
    (node, index) => {
      const row = complexLayout ? Math.floor(index / columnCount) : 0;
      const column = complexLayout ? index % columnCount : index;
      const rowOffset = complexLayout && row % 2 === 1 ? 54 : 0;

      return {
        detail: node.summary,
        diagramType: "dependency",
        height: itemHeight,
        id: `finalized-context-node-${index + 1}`,
        kind: "component",
        label: node.title,
        tone: workDesignBoardToneFromDeliveryTone(node.tone),
        width: itemWidth,
        x: startX + column * (itemWidth + horizontalGap) + rowOffset,
        y: startY + row * (itemHeight + verticalGap),
      };
    },
  );
  const allCustomItems = [...customItems, ...sessionLooseItems];
  const sequentialConnections: WorkDesignBoardConnection[] = customItems
    .slice(0, -1)
    .map((item, index) => {
      const nextItem = customItems[index + 1];
      const row = complexLayout ? Math.floor(index / columnCount) : 0;
      const nextRow = complexLayout ? Math.floor((index + 1) / columnCount) : 0;
      const sameRow = row === nextRow;

      return {
        from: {
          itemId: item.id,
          itemType: "custom",
          side: sameRow ? "right" : "bottom",
        },
        id: `finalized-context-connector-${index + 1}`,
        shape: sameRow ? "straight" : "curve",
        startTip: "plain",
        stroke: "solid",
        to: {
          itemId: nextItem.id,
          itemType: "custom",
          side: sameRow ? "left" : "top",
        },
        tone: "amber",
        tip: "arrow",
      };
    });
  const verticalConnections: WorkDesignBoardConnection[] = complexLayout
    ? customItems.flatMap((item, index) => {
        const target = customItems[index + columnCount];

        if (!target) {
          return [];
        }

        return [
          {
            from: {
              itemId: item.id,
              itemType: "custom" as const,
              side: "bottom" as const,
            },
            id: `finalized-context-vertical-${index + 1}`,
            shape: "straight" as const,
            startTip: "plain" as const,
            stroke: "dashed" as const,
            to: {
              itemId: target.id,
              itemType: "custom" as const,
              side: "top" as const,
            },
            tone: "blue" as const,
            tip: "arrow" as const,
          },
        ];
      })
    : [];
  const connections = [...sequentialConnections, ...verticalConnections];
  const trayX = Math.max(40, startX - 70);
  const trayY = Math.max(40, startY - 116);
  const maxItemX = Math.max(
    startX + itemWidth,
    ...customItems.map((item) => item.x + (item.width ?? itemWidth)),
  );
  const maxItemY = Math.max(
    startY + itemHeight,
    ...customItems.map((item) => item.y + (item.height ?? itemHeight)),
  );
  const trayWidth = Math.max(920, maxItemX - trayX + 70);
  const trayHeight = complexLayout
    ? Math.max(640, maxItemY - trayY + 116)
    : 320;

  return cloneWorkDesignBoardSnapshot({
    connections,
    customItems: allCustomItems,
    positions: initialWorkDesignBoardPositions(),
    removedCoreIds: initialWorkDesignBoardRemovedCoreIds(),
    sketchStrokes: sessionSketchStrokes,
    style: "architecture",
    templateTrays: [
      {
        diagramType: "dependency",
        height: trayHeight,
        id: "finalized-context-tray",
        itemIds: customItems.map((item) => item.id),
        label: brief.diagramTitle,
        tone: "amber",
        width: trayWidth,
        x: trayX,
        y: trayY,
      },
    ],
  });
}

function workDesignFinalizedSketchStrokes(
  strokes:
    | NonNullable<
        NonNullable<
          DeliveryPackageSummary["work_design_context_session"]
        >["board_snapshot"]
      >["sketch_strokes"]
    | undefined,
): WorkDesignBoardSketchStroke[] {
  if (!Array.isArray(strokes)) {
    return [];
  }

  return strokes
    .map((stroke): WorkDesignBoardSketchStroke | null => {
      const points = Array.isArray(stroke.points)
        ? stroke.points.filter(
            (point) => Number.isFinite(point.x) && Number.isFinite(point.y),
          )
        : [];

      if (points.length < 2) {
        return null;
      }

      return {
        id: stroke.id,
        opacity: Number.isFinite(stroke.opacity) ? stroke.opacity : 0.9,
        points: points.map((point) => ({ x: point.x, y: point.y })),
        tone: workDesignFinalizedSketchTone(stroke.tone),
        tool:
          stroke.tool === "highlighter" || stroke.tool === "marker"
            ? stroke.tool
            : "pen",
        width: Number.isFinite(stroke.width) ? stroke.width : 4,
      };
    })
    .filter((stroke): stroke is WorkDesignBoardSketchStroke => Boolean(stroke));
}

function workDesignFinalizedSketchTone(
  tone: string,
): WorkDesignBoardSketchTone {
  switch (tone) {
    case "amber":
    case "black":
    case "blue":
    case "burgundy":
    case "charcoal":
    case "forest":
    case "green":
    case "navy":
    case "neutral":
    case "purple":
    case "red":
    case "white":
      return tone;
    default:
      return "charcoal";
  }
}

function workDesignFinalizedLooseItems(
  items:
    | NonNullable<
        NonNullable<
          DeliveryPackageSummary["work_design_context_session"]
        >["board_snapshot"]
      >["loose_items"]
    | undefined,
): WorkDesignBoardCustomItem[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .filter((item) => Number.isFinite(item.x) && Number.isFinite(item.y))
    .map((item): WorkDesignBoardCustomItem => ({
      detail: item.detail,
      height: Number.isFinite(item.height) ? item.height : undefined,
      id: item.id,
      kind: workDesignFinalizedLooseItemKind(item.kind),
      label: item.label,
      tone: workDesignFinalizedLooseItemTone(item.tone),
      width: Number.isFinite(item.width) ? item.width : undefined,
      x: item.x,
      y: item.y,
    }));
}

function workDesignFinalizedLooseItemKind(
  kind: DeliveryWorkDesignBoardLooseItemKind,
): WorkDesignBoardCustomKind {
  return kind;
}

function workDesignFinalizedLooseItemTone(
  tone: string | undefined,
): WorkDesignBoardColorTone | undefined {
  switch (tone) {
    case "amber":
    case "blue":
    case "green":
    case "neutral":
    case "purple":
    case "red":
      return tone;
    default:
      return undefined;
  }
}
