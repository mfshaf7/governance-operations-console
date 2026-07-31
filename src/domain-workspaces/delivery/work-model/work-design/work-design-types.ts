import type { DeliveryTone } from "../../domain/delivery-types.ts";
import type {
  ContextBoardConnection,
  ContextBoardConnectorShape,
  ContextBoardConnectorStroke,
  ContextBoardConnectorTone,
  ContextBoardCustomItem,
  ContextBoardCustomKind,
  ContextBoardDiagramType,
  ContextBoardDisposition,
  ContextBoardPortSide,
  ContextBoardSketchStroke,
  ContextBoardSketchTone,
  ContextBoardSnapshot,
  ContextBoardTone,
  ContextBoardUmlRelationship,
} from "../../../../product-apps/context-board/index.ts";

export type WorkDesignStep =
  "apply" | "build" | "context" | "history" | "hub" | "review";

export type WorkDesignContextDecision = ContextBoardDisposition;
export type WorkDesignBoardColorTone = ContextBoardTone;
export type WorkDesignBoardConnectorTone = ContextBoardConnectorTone;
export type WorkDesignDiagramType = ContextBoardDiagramType;
export type WorkDesignBoardCustomKind = ContextBoardCustomKind;
export type WorkDesignBoardConnectorShape = ContextBoardConnectorShape;
export type WorkDesignBoardConnectorStroke = ContextBoardConnectorStroke;
export type WorkDesignBoardUmlRelationship = ContextBoardUmlRelationship;
export type WorkDesignBoardPortSide = ContextBoardPortSide;
export type WorkDesignBoardCustomItem = ContextBoardCustomItem;
export type WorkDesignBoardSketchTone = ContextBoardSketchTone;
export type WorkDesignBoardSketchStroke = ContextBoardSketchStroke;
export type WorkDesignBoardConnection = ContextBoardConnection;
export type WorkDesignBoardSnapshot = ContextBoardSnapshot;

export type WorkDesignNodeKind = "Epic" | "Feature" | "Risk" | "User story";

export type WorkDesignBuildTreeViewMode = "inline" | "structured";

export type WorkDesignNode = {
  children?: WorkDesignNode[];
  description: string;
  draftBody: string;
  id: string;
  kind: WorkDesignNodeKind;
  remark: string;
  title: string;
  tone: DeliveryTone;
};

export type WorkDesignApplyReceipt = {
  appliedAt: string;
  appliedBy: string;
  receiptId: string;
  targetTree: WorkDesignNode;
};

export type WorkDesignBlockerDisposition =
  "accept-risk" | "defer" | "remove" | "workaround";

export type WorkDesignBlockerIssueKind =
  | "context_snapshot_attach_failed"
  | "partial_apply_inconsistent"
  | "receipt_persist_failed"
  | "tree_snapshot_persist_failed";

export type WorkDesignBlockerRecoveryActionId =
  | "accept-risk"
  | "attach-snapshot"
  | "complete-missing-step"
  | "inspect-apply-state"
  | "keep-blocked"
  | "link-existing-receipt"
  | "rebuild-tree-snapshot"
  | "rerun-apply"
  | "rollback-apply";

export type WorkDesignBlockerIssue = {
  canRepairLocally: boolean;
  checkLocations?: string[];
  id: string;
  kind: WorkDesignBlockerIssueKind;
  possibleCauses?: string[];
  recoveryAction: string;
  source: "apply" | "package";
  summary: string;
  title: string;
};

export type WorkDesignBlockerDispositionReceipt = {
  clearsBlocker?: boolean;
  disposition: WorkDesignBlockerDisposition;
  evidenceLines?: string[];
  issueId: string;
  issueKind: WorkDesignBlockerIssueKind;
  justification: string;
  outcome?: "cleared" | "risk-accepted" | "still-blocked";
  packageId: string;
  recordedAt: string;
  receiptId: string;
  recoveryAction: string;
  recoveryActionId?: WorkDesignBlockerRecoveryActionId;
  sourceRef: string;
};

export type WorkDesignContextSavedSession = {
  decision: WorkDesignContextDecision;
  fingerprint: string;
  id: string;
  name: string;
  note: string;
  savedAt: string;
  sequence: number;
  snapshot: WorkDesignBoardSnapshot;
};

export type WorkDesignBriefVersion = {
  boardSnapshotRef: string;
  briefVersionId: string;
  decision: WorkDesignContextDecision;
  finalizedAt: string;
  finalizedFingerprint: string;
  metadataPacketRef: string;
  name: string;
  savedSessionId: string | null;
  snapshot: WorkDesignBoardSnapshot;
  versionLabel: string;
};

export type WorkDesignTreeDraftSnapshot = {
  activeBriefVersionId: string | null;
  hasUnsavedSessionChanges: boolean;
  expandedNodeIds: string[];
  openDetailNodeId: string | null;
  reviewHandoffNote: string;
  savedAt: string;
  selectedNodeId: string;
  stale: boolean;
  structuredStoryGroupIds: string[];
  tree: WorkDesignNode;
  viewMode: WorkDesignBuildTreeViewMode;
};

export type WorkDesignSessionApplyReceipt = {
  applyReceiptRecorded: boolean;
  applyRunStartedAt: string | null;
  applyViewOpenedAt: string | null;
  draftRef: string | null;
  receiptId: string | null;
  snapshotStatus: string | null;
  targetRecordRef: string | null;
};

export type WorkDesignPersistedSession = {
  activeBriefVersionId: string | null;
  apply: WorkDesignSessionApplyReceipt;
  blocker: WorkDesignBlockerDispositionReceipt | null;
  briefVersions: WorkDesignBriefVersion[];
  context: {
    current: WorkDesignContextSavedSession | null;
    finalizedFingerprint: string | null;
    loadedSessionId: string | null;
    sessions: WorkDesignContextSavedSession[];
  };
  lastSavedAt: string;
  packageId: string;
  review: {
    draftReviewAccepted: boolean;
    draftValidationAccepted: boolean;
  };
  schemaVersion: 2;
  treeDraft: WorkDesignTreeDraftSnapshot | null;
  workDesignSessionId: string;
};

export type WorkDesignSessionProjectionState = {
  apply: {
    applyReceiptRecorded: boolean;
    receiptId: string | null;
  };
  review: {
    draftReviewAccepted: boolean;
  };
};
