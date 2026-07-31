"use client";

import { useEffect } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";

import type { DeliveryPackageSummary } from "../../../../read-model/index.ts";

import { workDesignWaitForFrame } from "../../../../product-adapters/context-board/index.ts";
import type { useWorkDesignApplyWorkflow } from "../steps/apply-draft/use-work-design-apply-workflow.ts";
import type { useWorkDesignBuildTree } from "../embedded-products/build-tree/index.ts";
import type { useWorkDesignContextArtifacts } from "../artifacts/context-brief/index.ts";
import type { useWorkDesignContextBoard } from "../embedded-products/context-board/index.ts";
import type {
  WorkDesignBriefVersion,
  WorkDesignContextDecision,
  WorkDesignContextSavedSession,
  WorkDesignStep,
} from "../model/work-design-model.ts";
import type {
  WorkDesignSnapshotAttachment,
  workDesignContextSources,
} from "../artifacts/context-brief/index.ts";
import { useWorkDesignContextBriefActions } from "./use-work-design-context-brief-actions.ts";
import { useWorkDesignContextSessionActions } from "./use-work-design-context-session-actions.ts";
import { useWorkDesignExportActions } from "./use-work-design-export-actions.ts";
import { useWorkDesignSessionPersistence } from "./use-work-design-session-persistence.ts";

type InitialWorkDesignContextSession = NonNullable<
  DeliveryPackageSummary["work_design_context_session"]
>;

type WorkDesignSessionLifecycleParams = {
  activeBriefVersionId: string | null;
  applyReceiptId: string | null;
  applyCompleted: boolean;
  applyReceiptRecorded: boolean;
  applyWorkflow: ReturnType<typeof useWorkDesignApplyWorkflow>;
  briefVersions: WorkDesignBriefVersion[];
  buildTree: ReturnType<typeof useWorkDesignBuildTree>;
  contextArtifacts: ReturnType<typeof useWorkDesignContextArtifacts>;
  contextBoard: ReturnType<typeof useWorkDesignContextBoard>;
  contextBriefAccepted: boolean;
  contextBriefLockedFingerprint: string | null;
  contextBriefMetadataFingerprint: string | null;
  contextBriefSavedFingerprint: string | null;
  contextBriefSnapshotFingerprint: string | null;
  contextDecision: WorkDesignContextDecision;
  contextLoadedSessionId: string | null;
  contextOperatorNote: string;
  contextSaveSessionName: string;
  contextSavedSessions: WorkDesignContextSavedSession[];
  contextSnapshotCapturePlaneRef: RefObject<HTMLDivElement | null>;
  contextSources: ReturnType<typeof workDesignContextSources>;
  deliveryPackage: DeliveryPackageSummary;
  hasUnsavedSessionChanges: boolean;
  initialContextSession: InitialWorkDesignContextSession | null;
  reviewHandoffNote: string;
  draftReviewAccepted: boolean;
  setActiveBriefVersionId: Dispatch<SetStateAction<string | null>>;
  setActiveStep: Dispatch<SetStateAction<WorkDesignStep>>;
  setApplyReceiptId: Dispatch<SetStateAction<string | null>>;
  setApplyReceiptRecorded: Dispatch<SetStateAction<boolean>>;
  setBriefVersions: Dispatch<SetStateAction<WorkDesignBriefVersion[]>>;
  setContextBriefAccepted: Dispatch<SetStateAction<boolean>>;
  setContextCanvasScreenshotAttachment: Dispatch<
    SetStateAction<WorkDesignSnapshotAttachment | null>
  >;
  setContextBriefLockedFingerprint: Dispatch<SetStateAction<string | null>>;
  setContextBriefMetadataFingerprint: Dispatch<SetStateAction<string | null>>;
  setContextBriefSavedFingerprint: Dispatch<SetStateAction<string | null>>;
  setContextBriefSnapshotFingerprint: Dispatch<SetStateAction<string | null>>;
  setContextDecision: Dispatch<SetStateAction<WorkDesignContextDecision>>;
  setContextFinalizeDialogOpen: Dispatch<SetStateAction<boolean>>;
  setContextFinalizedDetailsDialogOpen: Dispatch<SetStateAction<boolean>>;
  setContextFinalizeRunning: Dispatch<SetStateAction<boolean>>;
  setContextLoadedSessionId: Dispatch<SetStateAction<string | null>>;
  setContextOperatorNote: Dispatch<SetStateAction<string>>;
  setContextSaveDialogOpen: Dispatch<SetStateAction<boolean>>;
  setContextSaveSessionName: Dispatch<SetStateAction<string>>;
  setContextSavedSessions: Dispatch<
    SetStateAction<WorkDesignContextSavedSession[]>
  >;
  setContextSavedSessionsModalOpen: Dispatch<SetStateAction<boolean>>;
  setContextSnapshotDialogOpen: Dispatch<SetStateAction<boolean>>;
  setHasUnsavedSessionChanges: Dispatch<SetStateAction<boolean>>;
  setHasUnsavedSessionChangesFromUser: Dispatch<SetStateAction<boolean>>;
  setReviewHandoffNote: Dispatch<SetStateAction<string>>;
  setDraftReviewAccepted: Dispatch<SetStateAction<boolean>>;
  setTreeDraftStale: Dispatch<SetStateAction<boolean>>;
  setTreeReconciliationDialogOpen: Dispatch<SetStateAction<boolean>>;
  setDraftValidationAccepted: Dispatch<SetStateAction<boolean>>;
  treeDraftStale: boolean;
  draftValidationAccepted: boolean;
};

export function useWorkDesignSessionLifecycle({
  activeBriefVersionId,
  applyReceiptId,
  applyReceiptRecorded,
  applyCompleted,
  applyWorkflow,
  briefVersions,
  buildTree,
  contextArtifacts,
  contextBoard,
  contextBriefAccepted,
  contextBriefLockedFingerprint,
  contextBriefMetadataFingerprint,
  contextBriefSavedFingerprint,
  contextBriefSnapshotFingerprint,
  contextDecision,
  contextLoadedSessionId,
  contextOperatorNote,
  contextSaveSessionName,
  contextSavedSessions,
  contextSnapshotCapturePlaneRef,
  contextSources,
  deliveryPackage,
  hasUnsavedSessionChanges,
  initialContextSession,
  reviewHandoffNote,
  draftReviewAccepted,
  setActiveBriefVersionId,
  setActiveStep,
  setApplyReceiptId,
  setApplyReceiptRecorded,
  setBriefVersions,
  setContextBriefAccepted,
  setContextCanvasScreenshotAttachment,
  setContextBriefLockedFingerprint,
  setContextBriefMetadataFingerprint,
  setContextBriefSavedFingerprint,
  setContextBriefSnapshotFingerprint,
  setContextDecision,
  setContextFinalizeDialogOpen,
  setContextFinalizedDetailsDialogOpen,
  setContextFinalizeRunning,
  setContextLoadedSessionId,
  setContextOperatorNote,
  setContextSaveDialogOpen,
  setContextSaveSessionName,
  setContextSavedSessions,
  setContextSavedSessionsModalOpen,
  setContextSnapshotDialogOpen,
  setHasUnsavedSessionChanges,
  setHasUnsavedSessionChangesFromUser,
  setReviewHandoffNote,
  setDraftReviewAccepted,
  setTreeDraftStale,
  setTreeReconciliationDialogOpen,
  setDraftValidationAccepted,
  treeDraftStale,
  draftValidationAccepted,
}: WorkDesignSessionLifecycleParams) {
  const {
    applyDraftRef,
    applyExecutionLogLines,
    applyLogRecordedAt,
    applyRunStartedAt,
    applyTargetRecordRef,
    applyViewOpenedAt,
    blockerDispositionReceipt,
    historyReceiptRows,
    historyTimelineRows,
    setApplyRunStartedAt,
    setApplyViewOpenedAt,
    setBlockerDispositionJustification,
    setBlockerDispositionReceipt,
    setBlockerRecoveryActionId,
  } = applyWorkflow;
  const {
    buildTreeViewMode,
    expandedNodeIds,
    openDetailNodeId,
    selectedNodeId,
    setBuildTreeViewMode,
    setExpandedNodeIds,
    setOpenDetailNodeId,
    setSelectedNodeId,
    setStructuredStoryGroupIds,
    setTree,
    structuredStoryGroupIds,
    tree,
  } = buildTree;
  const {
    captureContextBoardSnapshot,
    contextBoardConnections,
    contextBoardCustomItems,
    contextBoardPositions,
    contextBoardRemovedCoreIds,
    contextBoardSketchStrokes,
    contextBoardStyle,
    contextBoardTemplateTrays,
    contextBriefReadOnly,
    contextBriefFingerprint,
    restoreContextBoardSnapshot,
    setContextBoardCenterRequest,
    setContextBoardRedoStack,
    setContextBoardSelectedItems,
    setContextBoardStyleTarget,
    setContextBoardTool,
    setContextBoardToolsCollapsed,
    setContextBoardUndoStack,
  } = contextBoard;
  const {
    contextCurrentSavedSession,
    contextFinalizedBoardSnapshot,
    contextFinalizedFingerprint,
    contextGeneratedSnapshotAttachment,
    contextNeedsSnapshotCapture,
    contextSnapshotAttachment,
  } = contextArtifacts;
  const {
    captureRenderedBoardScreenshotAttachment,
    exportApplyLog,
    exportContextSnapshotAttachment,
    exportWorkDesignReceipt,
  } = useWorkDesignExportActions({
    applyDraftRef,
    applyExecutionLogLines,
    applyLogRecordedAt,
    applyReceiptRecorded,
    applyTargetRecordRef,
    contextDecision,
    contextGeneratedSnapshotAttachment,
    contextSnapshotAttachment,
    deliveryPackage,
    historyReceiptRows,
    historyTimelineRows,
  });

  useWorkDesignSessionPersistence({
    activeBriefVersionId,
    applyReceiptId,
    applyReceiptRecorded,
    applyDraftRef,
    applyRunStartedAt,
    applyTargetRecordRef,
    applyViewOpenedAt,
    blockerDispositionReceipt,
    briefVersions,
    buildTreeViewMode,
    captureContextBoardSnapshot,
    contextBoardAutosaveDependencies: [
      contextBoardConnections,
      contextBoardCustomItems,
      contextBoardPositions,
      contextBoardRemovedCoreIds,
      contextBoardSketchStrokes,
      contextBoardStyle,
      contextBoardTemplateTrays,
    ],
    contextBriefAccepted,
    contextBriefFingerprint,
    contextDecision,
    contextFinalizedFingerprint,
    contextLoadedSessionId,
    contextOperatorNote,
    contextSavedSessions,
    contextSnapshotAttachment,
    contextSources,
    deliveryPackage,
    hasUnsavedSessionChanges,
    expandedNodeIds,
    initialContextSession,
    openDetailNodeId,
    reviewHandoffNote,
    restoreContextBoardSnapshot,
    draftReviewAccepted,
    selectedNodeId,
    setActiveBriefVersionId,
    setApplyReceiptId,
    setApplyReceiptRecorded,
    setApplyRunStartedAt,
    setApplyViewOpenedAt,
    setBlockerDispositionJustification,
    setBlockerDispositionReceipt,
    setBlockerRecoveryActionId,
    setBriefVersions,
    setBuildTreeViewMode,
    setContextBriefAccepted,
    setContextBriefLockedFingerprint,
    setContextBriefMetadataFingerprint,
    setContextBriefSavedFingerprint,
    setContextBriefSnapshotFingerprint,
    setContextDecision,
    setContextLoadedSessionId,
    setContextOperatorNote,
    setContextSavedSessions,
    setHasUnsavedSessionChanges,
    setExpandedNodeIds,
    setOpenDetailNodeId,
    setReviewHandoffNote,
    setDraftReviewAccepted,
    setSelectedNodeId,
    setStructuredStoryGroupIds,
    setTree,
    setTreeDraftStale,
    setDraftValidationAccepted,
    structuredStoryGroupIds,
    tree,
    treeDraftStale,
    draftValidationAccepted,
  });

  const {
    confirmSaveContextSession,
    deleteContextSavedSession,
    loadContextSavedSession,
    saveContextSession,
  } = useWorkDesignContextSessionActions({
    captureContextBoardSnapshot,
    contextBriefReadOnly,
    contextBriefFingerprint,
    contextBriefLockedFingerprint,
    contextBriefMetadataFingerprint,
    contextBriefSavedFingerprint,
    contextBriefSnapshotFingerprint,
    contextDecision,
    contextLoadedSessionId,
    contextOperatorNote,
    contextSaveSessionName,
    contextSavedSessions,
    restoreContextBoardSnapshot,
    setApplyReceiptRecorded,
    setApplyRunStartedAt,
    setContextBoardCenterRequest,
    setContextBoardRedoStack,
    setContextBoardUndoStack,
    setContextBriefAccepted,
    setContextBriefLockedFingerprint,
    setContextBriefMetadataFingerprint,
    setContextBriefSavedFingerprint,
    setContextBriefSnapshotFingerprint,
    setContextDecision,
    setContextLoadedSessionId,
    setContextOperatorNote,
    setContextSaveDialogOpen,
    setContextSaveSessionName,
    setContextSavedSessions,
    setContextSavedSessionsModalOpen,
    setHasUnsavedSessionChanges: setHasUnsavedSessionChangesFromUser,
    setDraftReviewAccepted,
    setDraftValidationAccepted,
  });
  const {
    closeContextFinalizeDialog,
    finalizeContextBrief,
    keepCurrentTreeAfterBriefRefinalize,
    regenerateTreeFromBrief,
    reopenContextBriefFromFinalize,
  } = useWorkDesignContextBriefActions({
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
    setHasUnsavedSessionChanges: setHasUnsavedSessionChangesFromUser,
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
  });

  useEffect(() => {
    if (!contextNeedsSnapshotCapture || !contextFinalizedFingerprint) {
      return;
    }

    let cancelled = false;

    void (async () => {
      await workDesignWaitForFrame();
      const screenshotAttachment =
        await captureRenderedBoardScreenshotAttachment({
          fingerprint: contextFinalizedFingerprint,
          plane: contextSnapshotCapturePlaneRef.current,
          snapshot: contextFinalizedBoardSnapshot,
        });

      if (!cancelled && screenshotAttachment) {
        setContextCanvasScreenshotAttachment(screenshotAttachment);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    contextFinalizedBoardSnapshot,
    contextFinalizedFingerprint,
    contextNeedsSnapshotCapture,
  ]);

  return {
    closeContextFinalizeDialog,
    confirmSaveContextSession,
    deleteContextSavedSession,
    exportApplyLog,
    exportContextSnapshotAttachment,
    exportWorkDesignReceipt,
    finalizeContextBrief,
    keepCurrentTreeAfterBriefRefinalize,
    loadContextSavedSession,
    regenerateTreeFromBrief,
    reopenContextBriefFromFinalize,
    saveContextSession,
  };
}
