import type { DeliveryPackageSummary } from "../../../../../read-model/index.ts";
import {
  workDesignBoardInventory,
  workDesignContextBoardCoreNodes,
  workDesignSnapshotAttachment,
} from "../../../../../product-adapters/context-board/index.ts";
import {
  workDesignGeneratedSeedSummary,
  workDesignGeneratedTreeSeedMetrics,
} from "../../../../../product-adapters/build-tree/index.ts";
import { workDesignSnapshotAttachmentStatusLabel } from "../../view-model/work-design-display-formatters.ts";

import {
  workDesignFinalizedContextBoardSnapshot,
  workDesignSnapshotAttachmentSourceLabel,
} from "./work-design-context-brief-model.ts";
import type {
  WorkDesignFinalizedBrief,
  WorkDesignSnapshotAttachment,
} from "./work-design-context-brief-model.ts";
import type { WorkDesignInitialContextSession } from "./work-design-context-artifact-types.ts";
import type { WorkDesignContextSavedSession } from "../../model/work-design-model.ts";

export function workDesignContextSnapshotEvidenceProjection({
  contextBriefReady,
  contextCanvasScreenshotAttachment,
  contextCurrentSavedSession,
  contextFinalizeDialogOpen,
  contextFinalizeRunning,
  contextFinalizedBrief,
  contextFinalizedFingerprint,
  deliveryPackage,
  initialContextSession,
}: {
  contextBriefReady: boolean;
  contextCanvasScreenshotAttachment: WorkDesignSnapshotAttachment | null;
  contextCurrentSavedSession: WorkDesignContextSavedSession | null;
  contextFinalizeDialogOpen: boolean;
  contextFinalizeRunning: boolean;
  contextFinalizedBrief: WorkDesignFinalizedBrief;
  contextFinalizedFingerprint: string | null;
  deliveryPackage: DeliveryPackageSummary;
  initialContextSession: WorkDesignInitialContextSession;
}) {
  const contextFinalizedBoardSnapshot =
    contextCurrentSavedSession?.snapshot ??
    workDesignFinalizedContextBoardSnapshot({
      deliveryPackage,
    });
  const contextSnapshotCoreNodes = workDesignContextBoardCoreNodes(
    deliveryPackage,
    contextFinalizedBrief.decision,
  );
  const contextBoardInventory = workDesignBoardInventory(
    contextFinalizedBoardSnapshot,
    contextSnapshotCoreNodes,
  );
  const contextBuildSeedMetrics = workDesignGeneratedTreeSeedMetrics(
    initialContextSession?.generated_tree,
  );
  const contextBuildSeedSummary = workDesignGeneratedSeedSummary(
    contextBuildSeedMetrics,
  );
  const contextGeneratedSnapshotAttachment = workDesignSnapshotAttachment({
    coreNodes: contextSnapshotCoreNodes,
    artifact: contextFinalizedBrief.snapshotArtifact,
    ref: contextFinalizedBrief.boardSnapshotRef,
    snapshot: contextFinalizedBoardSnapshot,
    summary: contextFinalizedBrief.diagramSummary,
    title: contextFinalizedBrief.diagramTitle,
  });
  const contextSnapshotAttachment =
    contextCanvasScreenshotAttachment?.fingerprint ===
    contextFinalizedFingerprint
      ? contextCanvasScreenshotAttachment
      : contextGeneratedSnapshotAttachment;
  const contextCanCaptureLiveCanvas =
    contextBriefReady &&
    Boolean(contextCurrentSavedSession) &&
    !initialContextSession?.accepted;
  const contextNeedsSnapshotCapture =
    contextFinalizeDialogOpen &&
    !contextFinalizeRunning &&
    Boolean(contextFinalizedFingerprint) &&
    contextCanvasScreenshotAttachment?.fingerprint !==
      contextFinalizedFingerprint &&
    contextCanCaptureLiveCanvas;
  const contextSnapshotAttachmentSourceLabel =
    workDesignSnapshotAttachmentSourceLabel(contextSnapshotAttachment.source);
  const contextSnapshotAttachmentExportLabel =
    contextSnapshotAttachment.source === "canvas_screenshot"
      ? "Export Screenshot"
      : "Export Preview";
  const contextSnapshotAttachmentStatusLabel =
    workDesignSnapshotAttachmentStatusLabel(
      contextSnapshotAttachment.attachmentStatus,
    );

  return {
    contextBoardInventory,
    contextBuildSeedMetrics,
    contextBuildSeedSummary,
    contextCanCaptureLiveCanvas,
    contextFinalizedBoardSnapshot,
    contextGeneratedSnapshotAttachment,
    contextNeedsSnapshotCapture,
    contextSnapshotAttachment,
    contextSnapshotAttachmentExportLabel,
    contextSnapshotAttachmentSourceLabel,
    contextSnapshotAttachmentStatusLabel,
    contextSnapshotCoreNodes,
  };
}
