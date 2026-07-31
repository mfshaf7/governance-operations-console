import type { DeliveryTone } from "./delivery-common.ts";

export type DeliveryWorkDesignContextDecision = "attach" | "proceed" | "retire";

export type DeliveryWorkDesignInitialStep =
  "apply" | "build" | "context" | "history" | "hub" | "review";

export type DeliveryWorkDesignBlockerIssueKind =
  | "context_snapshot_attach_failed"
  | "partial_apply_inconsistent"
  | "receipt_persist_failed"
  | "tree_snapshot_persist_failed";

export type DeliveryWorkDesignBlockerMetadata = {
  can_repair_locally: boolean;
  check_locations?: string[];
  issue_kind: DeliveryWorkDesignBlockerIssueKind;
  possible_causes?: string[];
  recovery_action: string;
  source: "apply" | "package";
  summary: string;
  title: string;
};

export type DeliveryWorkDesignDraftNode = {
  children?: DeliveryWorkDesignDraftNode[];
  description: string;
  draft_body: string;
  id: string;
  kind: DeliveryWorkDesignDraftNodeKind;
  remark: string;
  title: string;
  tone: DeliveryTone;
};

export type DeliveryWorkDesignDraftNodeKind =
  "Epic" | "Feature" | "Risk" | "User story";

export type DeliveryWorkDesignSnapshotAttachmentStatus =
  "attached" | "failed" | "pending_apply" | "skipped" | "superseded";

export type DeliveryWorkDesignSnapshotAttachmentDisplayStatus =
  DeliveryWorkDesignSnapshotAttachmentStatus | "local_preview";

export type DeliveryWorkDesignSnapshotArtifact = {
  artifact_id: string;
  attachment_ref?: string | null;
  attachment_status: DeliveryWorkDesignSnapshotAttachmentStatus;
  board_snapshot_ref: string;
  checksum?: string | null;
  content_type: "image/png" | "image/svg+xml";
  description: string;
  file_name: string;
  rendered_content_base64_ref: string;
  target_record_ref: string;
};

export type DeliveryWorkDesignBoardSketchStroke = {
  id: string;
  opacity: number;
  points: Array<{
    x: number;
    y: number;
  }>;
  tone:
    | "amber"
    | "black"
    | "blue"
    | "burgundy"
    | "charcoal"
    | "forest"
    | "green"
    | "navy"
    | "red"
    | "white";
  tool: "highlighter" | "marker" | "pen";
  width: number;
};

export type DeliveryWorkDesignBoardLooseItem = {
  detail: string;
  height?: number;
  id: string;
  kind: DeliveryWorkDesignBoardLooseItemKind;
  label: string;
  tone?: "amber" | "blue" | "green" | "neutral" | "purple" | "red";
  width?: number;
  x: number;
  y: number;
};

export type DeliveryWorkDesignBoardLooseItemKind =
  "label-field" | "note" | "shape-circle" | "shape-diamond" | "shape-rounded";
