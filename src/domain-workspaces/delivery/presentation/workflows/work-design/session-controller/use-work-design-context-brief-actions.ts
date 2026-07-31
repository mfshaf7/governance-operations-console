"use client";

import type { Dispatch, SetStateAction } from "react";

import type { DeliveryPackageSummary } from "../../../../read-model/index.ts";

import type {
  WorkDesignBoardSelectionItem,
  WorkDesignBoardStyleTarget,
  WorkDesignBoardTool,
} from "../../../../product-adapters/context-board/index.ts";
import type { WorkDesignSnapshotAttachment } from "../artifacts/context-brief/index.ts";
import { workDesignBriefVersionFromContextSession } from "../artifacts/context-brief/index.ts";
import {
  initialWorkDesignTree,
  workDesignInitialExpandedNodeIds,
} from "../../../../product-adapters/build-tree/index.ts";
import type {
  WorkDesignBriefVersion,
  WorkDesignBuildTreeViewMode,
  WorkDesignContextDecision,
  WorkDesignContextSavedSession,
  WorkDesignNode,
  WorkDesignStep,
} from "../model/work-design-model.ts";

type UseWorkDesignContextBriefActionsParams = {
  applyCompleted: boolean;
  briefVersions: WorkDesignBriefVersion[];
  contextBriefFingerprint: string;
  contextCurrentSavedSession: WorkDesignContextSavedSession | null;
  contextDecision: WorkDesignContextDecision;
  deliveryPackage: DeliveryPackageSummary;
  setActiveBriefVersionId: Dispatch<SetStateAction<string | null>>;
  setActiveStep: Dispatch<SetStateAction<WorkDesignStep>>;
  setApplyReceiptRecorded: Dispatch<SetStateAction<boolean>>;
  setApplyRunStartedAt: Dispatch<SetStateAction<string | null>>;
  setBriefVersions: Dispatch<SetStateAction<WorkDesignBriefVersion[]>>;
  setBuildTreeViewMode: Dispatch<SetStateAction<WorkDesignBuildTreeViewMode>>;
  setContextBoardSelectedItems: Dispatch<
    SetStateAction<WorkDesignBoardSelectionItem[]>
  >;
  setContextBoardStyleTarget: Dispatch<
    SetStateAction<WorkDesignBoardStyleTarget | null>
  >;
  setContextBoardTool: Dispatch<SetStateAction<WorkDesignBoardTool>>;
  setContextBoardToolsCollapsed: Dispatch<SetStateAction<boolean>>;
  setContextBriefAccepted: Dispatch<SetStateAction<boolean>>;
  setContextCanvasScreenshotAttachment: Dispatch<
    SetStateAction<WorkDesignSnapshotAttachment | null>
  >;
  setContextBriefLockedFingerprint: Dispatch<SetStateAction<string | null>>;
  setContextBriefMetadataFingerprint: Dispatch<SetStateAction<string | null>>;
  setContextBriefSavedFingerprint: Dispatch<SetStateAction<string | null>>;
  setContextBriefSnapshotFingerprint: Dispatch<SetStateAction<string | null>>;
  setContextFinalizeDialogOpen: Dispatch<SetStateAction<boolean>>;
  setContextFinalizedDetailsDialogOpen: Dispatch<SetStateAction<boolean>>;
  setContextFinalizeRunning: Dispatch<SetStateAction<boolean>>;
  setContextSnapshotDialogOpen: Dispatch<SetStateAction<boolean>>;
  setHasUnsavedSessionChanges: Dispatch<SetStateAction<boolean>>;
  setExpandedNodeIds: Dispatch<SetStateAction<string[]>>;
  setOpenDetailNodeId: Dispatch<SetStateAction<string | null>>;
  setDraftReviewAccepted: Dispatch<SetStateAction<boolean>>;
  setSelectedNodeId: Dispatch<SetStateAction<string>>;
  setStructuredStoryGroupIds: Dispatch<SetStateAction<string[]>>;
  setTree: Dispatch<SetStateAction<WorkDesignNode>>;
  setTreeDraftStale: Dispatch<SetStateAction<boolean>>;
  setTreeReconciliationDialogOpen: Dispatch<SetStateAction<boolean>>;
  setDraftValidationAccepted: Dispatch<SetStateAction<boolean>>;
  treeDraftStale: boolean;
};

export function useWorkDesignContextBriefActions({
  applyCompleted,
  briefVersions,
  contextBriefFingerprint,
  contextCurrentSavedSession,
  contextDecision,
  deliveryPackage,
  setActiveBriefVersionId,
  setActiveStep,
  setApplyReceiptRecorded,
  setApplyRunStartedAt,
  setBriefVersions,
  setBuildTreeViewMode,
  setContextBoardSelectedItems,
  setContextBoardStyleTarget,
  setContextBoardTool,
  setContextBoardToolsCollapsed,
  setContextBriefAccepted,
  setContextCanvasScreenshotAttachment,
  setContextBriefLockedFingerprint,
  setContextBriefMetadataFingerprint,
  setContextBriefSavedFingerprint,
  setContextBriefSnapshotFingerprint,
  setContextFinalizeDialogOpen,
  setContextFinalizedDetailsDialogOpen,
  setContextFinalizeRunning,
  setContextSnapshotDialogOpen,
  setHasUnsavedSessionChanges,
  setExpandedNodeIds,
  setOpenDetailNodeId,
  setDraftReviewAccepted,
  setSelectedNodeId,
  setStructuredStoryGroupIds,
  setTree,
  setTreeDraftStale,
  setTreeReconciliationDialogOpen,
  setDraftValidationAccepted,
  treeDraftStale,
}: UseWorkDesignContextBriefActionsParams) {
  const deliveryPackageId = deliveryPackage.delivery_package_id;

  async function finalizeContextBrief() {
    if (!contextCurrentSavedSession) {
      setContextFinalizeDialogOpen(true);
      return;
    }

    const finalizedAt = new Date().toISOString();
    const briefVersion: WorkDesignBriefVersion = {
      ...workDesignBriefVersionFromContextSession({
        deliveryPackage,
        fingerprint: contextBriefFingerprint,
        savedSession: contextCurrentSavedSession,
        session: null,
      }),
      briefVersionId: `${deliveryPackageId}:brief-${Date.now()}`,
      finalizedAt,
      versionLabel: `local v${briefVersions.length + 1} locked`,
    };

    setContextFinalizeRunning(true);
    setContextBoardTool("move");
    setContextBoardToolsCollapsed(true);
    setContextBoardStyleTarget(null);
    setContextBoardSelectedItems([]);

    window.setTimeout(() => {
      setContextCanvasScreenshotAttachment(null);
      setContextBriefSavedFingerprint(contextBriefFingerprint);
      setContextBriefLockedFingerprint(contextBriefFingerprint);
      setContextBriefMetadataFingerprint(contextBriefFingerprint);
      setContextBriefSnapshotFingerprint(contextBriefFingerprint);
      setContextBriefAccepted(true);
      setBriefVersions((versions) => [
        briefVersion,
        ...versions.filter(
          (version) => version.briefVersionId !== briefVersion.briefVersionId,
        ),
      ]);
      setActiveBriefVersionId(briefVersion.briefVersionId);
      setContextBoardSelectedItems([]);
      setContextFinalizeRunning(false);
      setHasUnsavedSessionChanges(false);
      if (treeDraftStale && contextDecision === "proceed") {
        setContextFinalizeDialogOpen(false);
        setTreeReconciliationDialogOpen(true);
      } else {
        setTreeDraftStale(false);
      }
    }, 850);
  }

  function reopenContextBrief() {
    if (applyCompleted) {
      return;
    }

    setContextBriefSavedFingerprint(null);
    setContextBriefLockedFingerprint(null);
    setContextBriefMetadataFingerprint(null);
    setContextBriefSnapshotFingerprint(null);
    setContextCanvasScreenshotAttachment(null);
    setContextBriefAccepted(false);
    setContextFinalizeRunning(false);
    setContextFinalizedDetailsDialogOpen(false);
    setContextBoardToolsCollapsed(true);
    setTreeDraftStale(true);
    setDraftReviewAccepted(false);
    setDraftValidationAccepted(false);
    setApplyReceiptRecorded(false);
    setApplyRunStartedAt(null);
    setHasUnsavedSessionChanges(false);
  }

  function reopenContextBriefFromFinalize() {
    reopenContextBrief();
    setContextSnapshotDialogOpen(false);
    setContextFinalizeDialogOpen(false);
    setActiveStep("context");
  }

  function closeContextFinalizeDialog() {
    setContextSnapshotDialogOpen(false);
    setContextFinalizedDetailsDialogOpen(false);
    setContextFinalizeDialogOpen(false);
  }

  function keepCurrentTreeAfterBriefRefinalize() {
    setTreeDraftStale(false);
    setDraftReviewAccepted(false);
    setDraftValidationAccepted(false);
    setApplyReceiptRecorded(false);
    setApplyRunStartedAt(null);
    setHasUnsavedSessionChanges(true);
    setTreeReconciliationDialogOpen(false);

    if (contextDecision === "proceed") {
      setActiveStep("build");
    }
  }

  function regenerateTreeFromBrief() {
    const regeneratedTree = initialWorkDesignTree(deliveryPackage);

    setTree(regeneratedTree);
    setSelectedNodeId(regeneratedTree.id);
    setOpenDetailNodeId(regeneratedTree.id);
    setExpandedNodeIds(workDesignInitialExpandedNodeIds(regeneratedTree));
    setStructuredStoryGroupIds([]);
    setBuildTreeViewMode("inline");
    setTreeDraftStale(false);
    setDraftReviewAccepted(false);
    setDraftValidationAccepted(false);
    setApplyReceiptRecorded(false);
    setApplyRunStartedAt(null);
    setHasUnsavedSessionChanges(true);
    setTreeReconciliationDialogOpen(false);

    if (contextDecision === "proceed") {
      setActiveStep("build");
    }
  }

  return {
    closeContextFinalizeDialog,
    finalizeContextBrief,
    keepCurrentTreeAfterBriefRefinalize,
    regenerateTreeFromBrief,
    reopenContextBrief,
    reopenContextBriefFromFinalize,
  };
}
