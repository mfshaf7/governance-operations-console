import type {
  DeliveryTone,
  DeliveryWorkDesignSnapshotArtifact,
  DeliveryWorkDesignSnapshotAttachmentDisplayStatus,
} from "../../domain/delivery-types.ts";

import type {
  WorkDesignBoardColorTone,
  WorkDesignContextDecision,
} from "./work-design-types.ts";

export type WorkDesignFinalizedBrief = {
  boardSnapshotRef: string;
  carriedMetadata: Array<{
    label: string;
    tone: DeliveryTone;
    value: string;
  }>;
  decision: WorkDesignContextDecision;
  diagramNodes: Array<{
    label: string;
    summary: string;
    title: string;
    tone: DeliveryTone;
  }>;
  diagramSummary: string;
  diagramTitle: string;
  finalizedAt: string | null;
  finalizedBy: string;
  metadataPacketRef: string;
  name: string;
  note: string;
  systemChecks: Array<{
    detail: string;
    label: string;
    status: string;
    tone: DeliveryTone;
  }>;
  snapshotArtifact: DeliveryWorkDesignSnapshotArtifact | null;
  version: string;
};

export type WorkDesignSnapshotAttachment = {
  artifactId: string | null;
  attachmentStatus: DeliveryWorkDesignSnapshotAttachmentDisplayStatus;
  boardSnapshotRef: string;
  capturedAt: string | null;
  checksum: string | null;
  connectorCount: number;
  contentType: string;
  dataUrl: string;
  description: string;
  fileName: string;
  fingerprint: string | null;
  height: number;
  itemCount: number;
  ref: string;
  renderedContentBase64Ref: string | null;
  source: "board_state_preview" | "canvas_screenshot";
  summary: string;
  targetRecordRef: string | null;
  svg: string | null;
  title: string;
  width: number;
};

export type WorkDesignSnapshotCaptureBounds = {
  height: number;
  minX: number;
  minY: number;
  width: number;
};

export function workDesignBoardToneFromDeliveryTone(
  tone: DeliveryTone,
): WorkDesignBoardColorTone {
  switch (tone) {
    case "danger":
      return "red";
    case "ok":
      return "green";
    case "warn":
      return "amber";
    case "info":
      return "blue";
    case "muted":
    case "stale":
    default:
      return "neutral";
  }
}

export function workDesignFileSlug(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "context-snapshot"
  );
}
