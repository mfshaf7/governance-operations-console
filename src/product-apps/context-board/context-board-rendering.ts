import {
  CONTEXT_BOARD_CORE_CARD_HEIGHT,
  CONTEXT_BOARD_CORE_CARD_WIDTH,
  CONTEXT_BOARD_HEIGHT,
  CONTEXT_BOARD_WIDTH,
  contextBoardConnectorPath,
  contextBoardEndpointIsFree,
  contextBoardPortPoint,
  contextBoardSurfaceBounds,
} from "./context-board-core";
import {
  contextBoardConnectionTone,
  contextBoardCustomItemResolvedSize,
  contextBoardCustomKindCopy,
  contextBoardDiagramCopy,
  contextBoardSketchPath,
  contextBoardSnapshotToneColors,
} from "./context-board-template-helpers";
import type {
  ContextBoardConnection,
  ContextBoardConnectionEndpoint,
  ContextBoardConnectorTip,
  ContextBoardConnectorTone,
  ContextBoardCoreNode,
  ContextBoardCustomItem,
  ContextBoardSketchStroke,
  ContextBoardSketchTone,
  ContextBoardSnapshot,
  ContextBoardSurfaceBounds,
  ContextBoardSurfaceBox,
  ContextBoardTemplateTray,
} from "./context-board-model";

export type ContextBoardSnapshotCaptureBounds = {
  height: number;
  minX: number;
  minY: number;
  width: number;
};

export type ContextBoardSnapshotExportAttachment = {
  dataUrl: string;
  fileName: string;
  height: number;
  svg?: string | null;
  width: number;
};

export function contextBoardWaitForFrame() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

export function contextBoardSnapshotCaptureBounds(
  snapshot: ContextBoardSnapshot,
): ContextBoardSnapshotCaptureBounds {
  const surfaceBounds = contextBoardSnapshotSurfaceBoxes(snapshot);
  const boardBounds =
    surfaceBounds.length > 0 ? contextBoardSurfaceBounds(surfaceBounds) : null;
  const sketchBounds = contextBoardSketchStrokeBounds(snapshot.sketchStrokes);
  const mergedBounds =
    boardBounds || sketchBounds
      ? contextBoardMergeBoardBounds(boardBounds, sketchBounds)
      : {
          maxX: 960,
          maxY: 560,
          minX: 0,
          minY: 0,
        };
  const padding = 96;
  const minimumWidth = Math.min(1120, CONTEXT_BOARD_WIDTH);
  const minimumHeight = Math.min(680, CONTEXT_BOARD_HEIGHT);
  let minX = Math.max(0, Math.floor(mergedBounds.minX - padding));
  let minY = Math.max(0, Math.floor(mergedBounds.minY - padding));
  let maxX = Math.min(CONTEXT_BOARD_WIDTH, Math.ceil(mergedBounds.maxX + padding));
  let maxY = Math.min(CONTEXT_BOARD_HEIGHT, Math.ceil(mergedBounds.maxY + padding));

  if (maxX - minX < minimumWidth) {
    const extra = minimumWidth - (maxX - minX);
    minX = Math.max(0, Math.floor(minX - extra / 2));
    maxX = Math.min(CONTEXT_BOARD_WIDTH, minX + minimumWidth);
    minX = Math.max(0, maxX - minimumWidth);
  }

  if (maxY - minY < minimumHeight) {
    const extra = minimumHeight - (maxY - minY);
    minY = Math.max(0, Math.floor(minY - extra / 2));
    maxY = Math.min(CONTEXT_BOARD_HEIGHT, minY + minimumHeight);
    minY = Math.max(0, maxY - minimumHeight);
  }

  return {
    height: Math.max(1, Math.ceil(maxY - minY)),
    minX,
    minY,
    width: Math.max(1, Math.ceil(maxX - minX)),
  };
}

export function contextBoardSketchStrokeBounds(
  strokes: ContextBoardSketchStroke[],
): ContextBoardSurfaceBounds | null {
  const points = strokes.flatMap((stroke) => stroke.points);

  if (points.length === 0) {
    return null;
  }

  return points.reduce(
    (accumulator, point) => ({
      maxX: Math.max(accumulator.maxX, point.x),
      maxY: Math.max(accumulator.maxY, point.y),
      minX: Math.min(accumulator.minX, point.x),
      minY: Math.min(accumulator.minY, point.y),
    }),
    {
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
    },
  );
}

export function contextBoardMergeBoardBounds(
  first: ContextBoardSurfaceBounds | null,
  second: ContextBoardSurfaceBounds | null,
): ContextBoardSurfaceBounds {
  if (!first && !second) {
    return {
      maxX: 960,
      maxY: 560,
      minX: 0,
      minY: 0,
    };
  }

  if (!first) {
    return second as ContextBoardSurfaceBounds;
  }

  if (!second) {
    return first;
  }

  return {
    maxX: Math.max(first.maxX, second.maxX),
    maxY: Math.max(first.maxY, second.maxY),
    minX: Math.min(first.minX, second.minX),
    minY: Math.min(first.minY, second.minY),
  };
}

export function contextBoardSnapshotSurfaceBoxes(
  snapshot: ContextBoardSnapshot,
): ContextBoardSurfaceBox[] {
  return [
    ...snapshot.templateTrays.map((tray) => ({
      height: tray.height,
      id: tray.id,
      itemType: "template" as const,
      width: tray.width,
      x: tray.x,
      y: tray.y,
    })),
    ...snapshot.customItems.map((item) => {
      const size = contextBoardCustomItemResolvedSize(item);

      return {
        height: size.height,
        id: item.id,
        itemType: "custom" as const,
        width: size.width,
        x: item.x,
        y: item.y,
      };
    }),
    ...Object.entries(snapshot.positions)
      .filter(([id]) => !snapshot.removedCoreIds.includes(id))
      .map(([id, position]) => ({
        height: CONTEXT_BOARD_CORE_CARD_HEIGHT,
        id,
        itemType: "core" as const,
        width: CONTEXT_BOARD_CORE_CARD_WIDTH,
        x: position.x,
        y: position.y,
      })),
  ];
}

export function contextBoardTemplateTraySvg(
  tray: ContextBoardTemplateTray,
  offsetX: number,
  offsetY: number,
) {
  const tone = contextBoardSnapshotToneColors(tray.tone ?? "amber");
  const x = tray.x + offsetX;
  const y = tray.y + offsetY;

  return [
    `<rect x="${x}" y="${y}" width="${tray.width}" height="${tray.height}" rx="18" fill="${tone.fill}" stroke="${tone.border}" stroke-width="1.5"/>`,
    `<text x="${x + 22}" y="${y + 28}" fill="${tone.text}" font-family="IBM Plex Mono, monospace" font-size="10" font-weight="800" letter-spacing="1.4">${contextBoardEscapeXml(contextBoardDiagramCopy(tray.diagramType).label.toUpperCase())}</text>`,
    `<text x="${x + 22}" y="${y + 50}" fill="#fff7e7" font-family="Space Grotesk, Arial, sans-serif" font-size="13" font-weight="720">${contextBoardEscapeXml(tray.label)}</text>`,
  ].join("");
}

export function contextBoardSnapshotCoreNodeSvg(
  node: ContextBoardCoreNode,
  snapshot: ContextBoardSnapshot,
  offsetX: number,
  offsetY: number,
) {
  const position = snapshot.positions[node.id];

  if (!position || snapshot.removedCoreIds.includes(node.id)) {
    return null;
  }

  const tone = contextBoardSnapshotToneColors(node.tone);
  const x = position.x + offsetX;
  const y = position.y + offsetY;
  const titleLines = contextBoardSvgTextLines(node.label, 28, 2);
  const detailLines = contextBoardSvgTextLines(node.detail, 42, 2);
  const titleStartY = y + 46;
  const detailStartY = titleStartY + titleLines.length * 17 + 8;

  return [
    `<rect x="${x}" y="${y}" width="${CONTEXT_BOARD_CORE_CARD_WIDTH}" height="${CONTEXT_BOARD_CORE_CARD_HEIGHT}" rx="10" fill="#091018" stroke="${tone.border}" stroke-width="1.5"/>`,
    `<rect x="${x}" y="${y}" width="4" height="${CONTEXT_BOARD_CORE_CARD_HEIGHT}" rx="2" fill="${tone.text}"/>`,
    `<text x="${x + 18}" y="${y + 23}" fill="${tone.text}" font-family="IBM Plex Mono, monospace" font-size="9" font-weight="800" letter-spacing="1.2">${contextBoardEscapeXml(node.kicker)}</text>`,
    ...titleLines.map(
      (line, index) =>
        `<text x="${x + 18}" y="${titleStartY + index * 17}" fill="#fff7e7" font-family="Space Grotesk, Arial, sans-serif" font-size="15" font-weight="760">${contextBoardEscapeXml(line)}</text>`,
    ),
    ...detailLines.map(
      (line, index) =>
        `<text x="${x + 18}" y="${detailStartY + index * 13}" fill="rgba(245,239,226,0.62)" font-family="Space Grotesk, Arial, sans-serif" font-size="11">${contextBoardEscapeXml(line)}</text>`,
    ),
  ].join("");
}

export function contextBoardSnapshotItemSvg(
  item: ContextBoardCustomItem,
  offsetX: number,
  offsetY: number,
) {
  const size = contextBoardCustomItemResolvedSize(item);
  const tone = contextBoardSnapshotToneColors(item.tone ?? "blue");
  const x = item.x + offsetX;
  const y = item.y + offsetY;
  const copy = contextBoardCustomKindCopy(item.kind);
  const titleLines = contextBoardSvgTextLines(item.label, Math.floor(size.width / 10), 2);
  const detailLines = contextBoardSvgTextLines(item.detail, Math.floor(size.width / 7.8), 3);
  const titleStartY = y + 42;
  const detailStartY = titleStartY + titleLines.length * 16 + 8;

  return [
    `<rect x="${x}" y="${y}" width="${size.width}" height="${size.height}" rx="8" fill="#091018" stroke="${tone.border}" stroke-width="1.5"/>`,
    `<rect x="${x}" y="${y}" width="4" height="${size.height}" rx="2" fill="${tone.text}"/>`,
    `<text x="${x + 18}" y="${y + 22}" fill="${tone.text}" font-family="IBM Plex Mono, monospace" font-size="9" font-weight="800" letter-spacing="1.2">${contextBoardEscapeXml(copy.kicker || copy.label)}</text>`,
    ...titleLines.map(
      (line, index) =>
        `<text x="${x + 18}" y="${titleStartY + index * 16}" fill="#fff7e7" font-family="Space Grotesk, Arial, sans-serif" font-size="14" font-weight="760">${contextBoardEscapeXml(line)}</text>`,
    ),
    ...detailLines.map(
      (line, index) =>
        `<text x="${x + 18}" y="${detailStartY + index * 13}" fill="rgba(245,239,226,0.62)" font-family="Space Grotesk, Arial, sans-serif" font-size="11">${contextBoardEscapeXml(line)}</text>`,
    ),
  ].join("");
}

export function contextBoardSnapshotSketchStrokeSvg(
  stroke: ContextBoardSketchStroke,
  offsetX: number,
  offsetY: number,
) {
  if (stroke.points.length < 2) {
    return null;
  }

  const points = stroke.points.map((point) => ({
    x: point.x + offsetX,
    y: point.y + offsetY,
  }));
  const color = contextBoardSnapshotSketchToneColor(stroke.tone);
  const width = stroke.tool === "highlighter" ? stroke.width * 1.6 : stroke.width;

  return `<path d="${contextBoardSketchPath(points)}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" opacity="${stroke.opacity}"/>`;
}

export function contextBoardSnapshotConnectionSvg(
  connection: ContextBoardConnection,
  snapshot: ContextBoardSnapshot,
  offsetX: number,
  offsetY: number,
) {
  const from = contextBoardSnapshotConnectionPoint(connection.from, snapshot);
  const to = contextBoardSnapshotConnectionPoint(connection.to, snapshot);

  if (!from || !to) {
    return null;
  }

  const tone = contextBoardSnapshotToneColors(
    contextBoardConnectionTone(connection.tone),
  );
  const connectorTone = contextBoardConnectionTone(connection.tone);
  const path = contextBoardConnectorPath(
    { x: from.x + offsetX, y: from.y + offsetY },
    { x: to.x + offsetX, y: to.y + offsetY },
    connection.from.side,
    connection.to.side,
    connection.shape,
  );
  const markerStart =
    connection.startTip && connection.startTip !== "plain"
      ? ` marker-start="url(#${contextBoardSnapshotMarkerId(connectorTone, connection.startTip)})"`
      : "";
  const markerEnd =
    connection.tip !== "plain"
      ? ` marker-end="url(#${contextBoardSnapshotMarkerId(connectorTone, connection.tip)})"`
      : "";
  const dash = connection.stroke === "dashed" ? ' stroke-dasharray="10 8"' : "";

  return `<path d="${path}" fill="none" stroke="${tone.text}" stroke-width="2.6" stroke-linecap="round"${dash}${markerStart}${markerEnd} opacity="0.78"/>`;
}

export function contextBoardSnapshotConnectionPoint(
  endpoint: ContextBoardConnectionEndpoint,
  snapshot: ContextBoardSnapshot,
) {
  if (contextBoardEndpointIsFree(endpoint)) {
    return { x: endpoint.x, y: endpoint.y };
  }

  if (endpoint.itemType === "custom") {
    const item = snapshot.customItems.find((candidate) => candidate.id === endpoint.itemId);
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

  if (endpoint.itemType === "core") {
    const position = snapshot.positions[endpoint.itemId];
    if (!position || snapshot.removedCoreIds.includes(endpoint.itemId)) {
      return null;
    }
    return contextBoardPortPoint(
      {
        height: CONTEXT_BOARD_CORE_CARD_HEIGHT,
        width: CONTEXT_BOARD_CORE_CARD_WIDTH,
        x: position.x,
        y: position.y,
      },
      endpoint.side,
    );
  }

  const tray = snapshot.templateTrays.find(
    (candidate) => candidate.id === endpoint.itemId,
  );

  if (!tray) {
    return null;
  }

  return contextBoardPortPoint(
    {
      height: tray.height,
      width: tray.width,
      x: tray.x,
      y: tray.y,
    },
    endpoint.side,
  );
}

const contextBoardSnapshotConnectorTones: ContextBoardConnectorTone[] = [
  "amber",
  "blue",
  "green",
  "neutral",
  "purple",
  "red",
];

export function contextBoardSnapshotMarkerDefs() {
  const markerTips: ContextBoardConnectorTip[] = [
    "arrow",
    "triangle",
    "diamond",
    "filled-diamond",
  ];

  return contextBoardSnapshotConnectorTones.flatMap((connectorTone) => {
    const tone = contextBoardSnapshotToneColors(connectorTone);

    return markerTips.map((tip) => {
      const marker =
        tip === "diamond" || tip === "filled-diamond"
          ? {
              height: 10,
              refX: 2,
              refY: 5,
              viewBox: "0 0 14 10",
              width: 14,
            }
          : tip === "triangle"
            ? {
                height: 11,
                refX: 10,
                refY: 5.5,
                viewBox: "0 0 12 11",
                width: 12,
              }
            : {
                height: 8,
                refX: 8,
                refY: 4,
                viewBox: "0 0 10 8",
                width: 10,
              };

      return [
        `<marker id="${contextBoardSnapshotMarkerId(connectorTone, tip)}" markerWidth="${marker.width}" markerHeight="${marker.height}" refX="${marker.refX}" refY="${marker.refY}" orient="auto" viewBox="${marker.viewBox}">`,
        `<path d="${contextBoardSnapshotConnectorMarkerPath(tip)}" fill="${tip === "diamond" ? "none" : tone.text}" stroke="${tone.text}" stroke-width="1.6"/>`,
        "</marker>",
      ].join("");
    });
  });
}

export function contextBoardSnapshotMarkerId(
  tone: ContextBoardConnectorTone,
  tip: ContextBoardConnectorTip,
) {
  return `snapshot-${tone}-${tip}`;
}

export function contextBoardSnapshotConnectorMarkerPath(tip: ContextBoardConnectorTip) {
  switch (tip) {
    case "diamond":
    case "filled-diamond":
      return "M 2 5 L 7 1 L 12 5 L 7 9 z";
    case "triangle":
      return "M 1 1 L 11 5.5 L 1 10 z";
    case "arrow":
    default:
      return "M 0 0 L 10 4 L 0 8 z";
  }
}

export function contextBoardSnapshotSketchToneColor(tone: ContextBoardSketchTone) {
  switch (tone) {
    case "black":
      return "#111827";
    case "white":
      return "#f8f4eb";
    case "charcoal":
      return "#2d3440";
    case "navy":
      return "#1e3a8a";
    case "forest":
      return "#166534";
    case "burgundy":
      return "#8a1f35";
    default:
      return contextBoardSnapshotToneColors(tone).text;
  }
}

export function contextBoardSvgTextLines(
  value: string,
  charactersPerLine: number,
  maxLines: number,
) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];

  for (const word of words) {
    const lastLine = lines.at(-1);
    if (!lastLine || `${lastLine} ${word}`.length > charactersPerLine) {
      lines.push(word);
    } else {
      lines[lines.length - 1] = `${lastLine} ${word}`;
    }

    if (lines.length > maxLines) {
      break;
    }
  }

  if (lines.length === 0) {
    return [""];
  }

  if (lines.length > maxLines) {
    const clipped = lines.slice(0, maxLines);
    clipped[maxLines - 1] = `${clipped[maxLines - 1].replace(/\.+$/, "")}...`;
    return clipped;
  }

  return lines;
}

export function contextBoardEscapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function contextBoardExportSnapshotAttachment(
  attachment: ContextBoardSnapshotExportAttachment,
) {
  if (!attachment.svg) {
    contextBoardDownloadDataUrl(attachment.dataUrl, attachment.fileName);
    return;
  }

  const svgBlob = new Blob([attachment.svg], {
    type: "image/svg+xml;charset=utf-8",
  });
  const svgUrl = URL.createObjectURL(svgBlob);
  const image = new window.Image();

  image.onload = () => {
    const scale = Math.max(
      1,
      Math.min(2, 4200 / Math.max(attachment.width, attachment.height)),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(attachment.width * scale);
    canvas.height = Math.round(attachment.height * scale);
    const context = canvas.getContext("2d");

    if (!context) {
      URL.revokeObjectURL(svgUrl);
      contextBoardDownloadBlob(svgBlob, attachment.fileName.replace(/\.png$/, ".svg"));
      return;
    }

    context.fillStyle = "#06090f";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      URL.revokeObjectURL(svgUrl);

      if (!blob) {
        contextBoardDownloadBlob(svgBlob, attachment.fileName.replace(/\.png$/, ".svg"));
        return;
      }

      contextBoardDownloadBlob(blob, attachment.fileName);
    }, "image/png");
  };
  image.onerror = () => {
    URL.revokeObjectURL(svgUrl);
    contextBoardDownloadBlob(svgBlob, attachment.fileName.replace(/\.png$/, ".svg"));
  };
  image.src = svgUrl;
}

export function contextBoardDownloadDataUrl(dataUrl: string, fileName: string) {
  const [header, payload] = dataUrl.split(",");

  if (!header || !payload) {
    return;
  }

  const byteString = header.includes(";base64")
    ? window.atob(payload)
    : decodeURIComponent(payload);
  const bytes = new Uint8Array(byteString.length);

  for (let index = 0; index < byteString.length; index += 1) {
    bytes[index] = byteString.charCodeAt(index);
  }

  const contentType =
    header.match(/^data:([^;]+)/)?.[1] ?? "application/octet-stream";
  contextBoardDownloadBlob(new Blob([bytes], { type: contentType }), fileName);
}

export function contextBoardDownloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
