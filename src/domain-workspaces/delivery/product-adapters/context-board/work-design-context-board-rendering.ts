import type { DeliveryPackageSummary, DeliveryTone } from "../../read-model/index.ts";
import {
  contextBoardEscapeXml,
  contextBoardExportSnapshotAttachment,
  contextBoardMergeBoardBounds,
  contextBoardSketchStrokeBounds,
  contextBoardSnapshotConnectionSvg,
  contextBoardSnapshotCoreNodeSvg,
  contextBoardSnapshotItemSvg,
  contextBoardSnapshotMarkerDefs,
  contextBoardSnapshotSketchStrokeSvg,
  contextBoardSnapshotSurfaceBoxes,
  contextBoardSurfaceBounds,
  contextBoardTemplateTraySvg,
} from "../../../../product-apps/context-board/index.ts";
import type { ContextBoardCoreNode } from "../../../../product-apps/context-board/index.ts";

import {
  workDesignBoardToneFromDeliveryTone,
  workDesignFileSlug,
} from "../../work-model/work-design/work-design-artifact-types.ts";
import type {
  WorkDesignFinalizedBrief,
  WorkDesignSnapshotAttachment,
} from "../../work-model/work-design/work-design-artifact-types.ts";
import type {
  WorkDesignBoardSnapshot,
  WorkDesignContextDecision,
} from "../../work-model/work-design/work-design-types.ts";

type WorkDesignLegacyCoreNode = {
  detail: string;
  id: string;
  kicker: string;
  label: string;
  tone: DeliveryTone;
};

function workDesignContextBoardDecisionNodeCopy(
  decision: WorkDesignContextDecision,
): {
  label: string;
  title: string;
  tone: DeliveryTone;
} {
  switch (decision) {
    case "attach":
      return {
        label: "Link Existing Work",
        title: "Link To Existing Work",
        tone: "warn",
      };
    case "retire":
      return {
        label: "Retire Duplicate",
        title: "Retire Duplicate Source",
        tone: "danger",
      };
    case "proceed":
    default:
      return {
        label: "Proceed",
        title: "Proceed With Work Design",
        tone: "ok",
      };
  }
}

export function workDesignContextBoardCoreNodes(
  deliveryPackage: DeliveryPackageSummary,
  decision: WorkDesignContextDecision,
): ContextBoardCoreNode[] {
  const decisionCopy = workDesignContextBoardDecisionNodeCopy(decision);

  return workDesignLegacyCoreNodesToContextBoard([
    {
      detail: deliveryPackage.source_ref,
      id: "source",
      kicker: "Source",
      label: deliveryPackage.display_name,
      tone: "warn",
    },
    {
      detail: "Session, quality, planning, and source identity packets.",
      id: "context",
      kicker: "Context",
      label: "Context Pack",
      tone: "ok",
    },
    {
      detail: decisionCopy.label,
      id: "decision",
      kicker: "Decision",
      label: decisionCopy.title,
      tone: decisionCopy.tone,
    },
    {
      detail:
        decision === "proceed"
          ? "Feature, User story, and Risk draft tree can be prepared next."
          : "Tree building stays locked for this Work Design session.",
      id: "output",
      kicker: "Output",
      label: decision === "proceed" ? "Draft Tree Builder" : "Decision Record",
      tone: decision === "proceed" ? "info" : decisionCopy.tone,
    },
  ]);
}

function workDesignLegacyCoreNodesToContextBoard(
  coreNodes: WorkDesignLegacyCoreNode[],
): ContextBoardCoreNode[] {
  return coreNodes.map((node) => ({
    ...node,
    tone: workDesignBoardToneFromDeliveryTone(node.tone),
  }));
}

export function workDesignSnapshotAttachment({
  artifact,
  coreNodes,
  ref,
  snapshot,
  summary,
  title,
}: {
  artifact: WorkDesignFinalizedBrief["snapshotArtifact"];
  coreNodes: ContextBoardCoreNode[];
  ref: string;
  snapshot: WorkDesignBoardSnapshot;
  summary: string;
  title: string;
}): WorkDesignSnapshotAttachment {
  const surfaces = contextBoardSnapshotSurfaceBoxes(snapshot);
  const surfaceBounds =
    surfaces.length > 0 ? contextBoardSurfaceBounds(surfaces) : null;
  const sketchBounds = contextBoardSketchStrokeBounds(snapshot.sketchStrokes);
  const bounds =
    surfaceBounds || sketchBounds
      ? contextBoardMergeBoardBounds(surfaceBounds, sketchBounds)
      : {
          maxX: 960,
          maxY: 560,
          minX: 0,
          minY: 0,
        };
  const padding = 82;
  const contentWidth = bounds.maxX - bounds.minX;
  const contentHeight = bounds.maxY - bounds.minY;
  const width = Math.ceil(Math.max(980, contentWidth + padding * 2));
  const height = Math.ceil(Math.max(520, contentHeight + padding * 2));
  const offsetX = Math.max(padding, (width - contentWidth) / 2) - bounds.minX;
  const offsetY = Math.max(padding, (height - contentHeight) / 2) - bounds.minY;
  const customItems = snapshot.customItems;
  const templateTrays = snapshot.templateTrays;
  const visibleCoreNodes = coreNodes.filter(
    (node) =>
      !snapshot.removedCoreIds.includes(node.id) && snapshot.positions[node.id],
  );
  const itemCount =
    customItems.length +
    templateTrays.length +
    visibleCoreNodes.length +
    snapshot.sketchStrokes.length;
  const connectorCount = snapshot.connections.length;
  const slug = workDesignFileSlug(title || "context-snapshot");
  const fileName = artifact?.file_name ?? `${slug}-context-snapshot.png`;
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${contextBoardEscapeXml(title)}">`,
    "<defs>",
    '<pattern id="grid" width="44" height="44" patternUnits="userSpaceOnUse">',
    '<path d="M 44 0 L 0 0 0 44" fill="none" stroke="rgba(139,181,255,0.10)" stroke-width="1"/>',
    "</pattern>",
    ...contextBoardSnapshotMarkerDefs(),
    "</defs>",
    `<rect width="${width}" height="${height}" rx="24" fill="#06090f"/>`,
    `<rect width="${width}" height="${height}" rx="24" fill="url(#grid)"/>`,
    `<rect x="18" y="18" width="${width - 36}" height="${height - 36}" rx="20" fill="none" stroke="rgba(255,193,90,0.22)" stroke-width="1"/>`,
    `<text x="34" y="44" fill="#ffc15a" font-family="IBM Plex Mono, monospace" font-size="11" font-weight="800" letter-spacing="2">${contextBoardEscapeXml("CONTEXT SNAPSHOT")}</text>`,
    `<text x="34" y="70" fill="#fff7e7" font-family="Space Grotesk, Arial, sans-serif" font-size="22" font-weight="760">${contextBoardEscapeXml(title)}</text>`,
    `<text x="34" y="${height - 28}" fill="rgba(245,239,226,0.54)" font-family="IBM Plex Mono, monospace" font-size="10">${contextBoardEscapeXml(ref)}</text>`,
    ...templateTrays.map((tray) =>
      contextBoardTemplateTraySvg(tray, offsetX, offsetY),
    ),
    ...snapshot.sketchStrokes
      .map((stroke) =>
        contextBoardSnapshotSketchStrokeSvg(stroke, offsetX, offsetY),
      )
      .filter((item): item is string => Boolean(item)),
    ...snapshot.connections
      .map((connection) =>
        contextBoardSnapshotConnectionSvg(
          connection,
          snapshot,
          offsetX,
          offsetY,
        ),
      )
      .filter((item): item is string => Boolean(item)),
    ...visibleCoreNodes
      .map((node) =>
        contextBoardSnapshotCoreNodeSvg(node, snapshot, offsetX, offsetY),
      )
      .filter((item): item is string => Boolean(item)),
    ...customItems.map((item) =>
      contextBoardSnapshotItemSvg(item, offsetX, offsetY),
    ),
    "</svg>",
  ].join("");

  return {
    artifactId: artifact?.artifact_id ?? null,
    attachmentStatus: artifact?.attachment_status ?? "local_preview",
    boardSnapshotRef: artifact?.board_snapshot_ref ?? ref,
    capturedAt: null,
    checksum: artifact?.checksum ?? null,
    connectorCount,
    contentType: artifact?.content_type ?? "image/png",
    dataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    description:
      artifact?.description ??
      "Stored Work Design board-state preview. Use Canvas Screenshot only when a live canvas capture is available.",
    fileName,
    fingerprint: null,
    height,
    itemCount,
    ref,
    renderedContentBase64Ref: artifact?.rendered_content_base64_ref ?? null,
    source: "board_state_preview",
    summary,
    targetRecordRef: artifact?.target_record_ref ?? null,
    svg,
    title,
    width,
  };
}

export function workDesignSnapshotCoreNodeSvg(
  node: ContextBoardCoreNode,
  snapshot: WorkDesignBoardSnapshot,
  offsetX: number,
  offsetY: number,
) {
  return contextBoardSnapshotCoreNodeSvg(node, snapshot, offsetX, offsetY);
}

export function exportWorkDesignSnapshotAttachment(
  attachment: WorkDesignSnapshotAttachment,
) {
  contextBoardExportSnapshotAttachment(attachment);
}

export {
  contextBoardDownloadBlob as downloadWorkDesignBlob,
  contextBoardDownloadDataUrl as downloadWorkDesignDataUrl,
  contextBoardEscapeXml as workDesignEscapeXml,
  contextBoardMergeBoardBounds as workDesignMergeBoardBounds,
  contextBoardSketchStrokeBounds as workDesignSketchStrokeBounds,
  contextBoardSnapshotCaptureBounds as workDesignSnapshotCaptureBounds,
  contextBoardSnapshotConnectionPoint as workDesignSnapshotConnectionPoint,
  contextBoardSnapshotConnectionSvg as workDesignSnapshotConnectionSvg,
  contextBoardSnapshotConnectorMarkerPath as workDesignSnapshotConnectorMarkerPath,
  contextBoardSnapshotItemSvg as workDesignSnapshotItemSvg,
  contextBoardSnapshotMarkerDefs as workDesignSnapshotMarkerDefs,
  contextBoardSnapshotMarkerId as workDesignSnapshotMarkerId,
  contextBoardSnapshotSketchStrokeSvg as workDesignSnapshotSketchStrokeSvg,
  contextBoardSnapshotSketchToneColor as workDesignSnapshotSketchToneColor,
  contextBoardSnapshotSurfaceBoxes as workDesignSnapshotSurfaceBoxes,
  contextBoardSvgTextLines as workDesignSvgTextLines,
  contextBoardTemplateTraySvg as workDesignTemplateTraySvg,
  contextBoardWaitForFrame as workDesignWaitForFrame,
} from "../../../../product-apps/context-board/index.ts";
