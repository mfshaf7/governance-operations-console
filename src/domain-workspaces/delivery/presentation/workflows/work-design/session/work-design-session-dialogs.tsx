"use client";

import type { DeliveryPackageSummary } from "../../../../read-model/index.ts";

import type { useWorkDesignApplyWorkflow } from "../steps/apply-draft/use-work-design-apply-workflow.ts";
import type { useWorkDesignBuildTree } from "../embedded-products/build-tree/index.ts";
import type { useWorkDesignContextArtifacts } from "../artifacts/context-brief/index.ts";
import type { useWorkDesignContextBoard } from "../embedded-products/context-board/index.ts";
import type { useWorkDesignReviewTreeDialog } from "../steps/review-draft/use-work-design-review-tree-dialog.ts";
import type { useWorkDesignSessionLifecycle } from "../session-controller/use-work-design-session-lifecycle.ts";
import type { WorkDesignSessionState } from "../session-controller/use-work-design-session-state.ts";
import { WorkDesignSessionDialogStack } from "./work-design-session-dialog-stack.tsx";

type WorkDesignSessionDialogsProps = {
  applyCompleted: boolean;
  applyWorkflow: ReturnType<typeof useWorkDesignApplyWorkflow>;
  buildTree: ReturnType<typeof useWorkDesignBuildTree>;
  contextArtifacts: ReturnType<typeof useWorkDesignContextArtifacts>;
  contextBoard: ReturnType<typeof useWorkDesignContextBoard>;
  deliveryPackage: DeliveryPackageSummary;
  modalState: WorkDesignSessionState;
  onClose: () => void;
  reviewTreeDialog: ReturnType<typeof useWorkDesignReviewTreeDialog>;
  sessionLifecycle: ReturnType<typeof useWorkDesignSessionLifecycle>;
};

export function WorkDesignSessionDialogs({
  applyCompleted,
  applyWorkflow,
  buildTree,
  contextArtifacts,
  contextBoard,
  deliveryPackage,
  modalState,
  onClose,
  reviewTreeDialog,
  sessionLifecycle,
}: WorkDesignSessionDialogsProps) {
  const {
    closeGuardOpen,
    contextFinalizedDetailsDialogOpen,
    contextFinalizeDialogOpen,
    contextLoadedSessionId,
    contextSaveDialogOpen,
    contextSavedSessions,
    contextSavedSessionsModalOpen,
    contextSaveSessionName,
    contextSnapshotCapturePlaneRef,
    contextSnapshotDialogOpen,
    setActiveStep,
    setCloseGuardOpen,
    setContextFinalizedDetailsDialogOpen,
    setContextSaveDialogOpen,
    setContextSavedSessionsModalOpen,
    setContextSaveSessionName,
    setContextSnapshotDialogOpen,
    setTreeReconciliationDialogOpen,
    treeDraftStale,
    treeReconciliationDialogOpen,
  } = modalState;
  const {
    activeBlockerIssue,
    applyDraftRef,
    applyExecutionLogLines,
    applyLogDialogOpen,
    applyLogRecordedAt,
    applyTargetRecordRef,
    blockerActionInfoDialogOpen,
    blockerAdvisorPrompt,
    blockerAdvisorTranscript,
    blockerCheckLocations,
    blockerDispositionJustification,
    blockerDispositionOpen,
    blockerDispositionRecordedCopy,
    blockerDispositionReceiptRecordedAt,
    blockerPossibleCauses,
    blockerProblemClearanceValue,
    blockerProblemLockValue,
    blockerProblemRecoveryValue,
    blockerProblemStatusLabel,
    blockerProblemStatusTone,
    blockerRecoveryActions,
    blockerRecoveryNoteLabel,
    blockerRecoveryNotePlaceholder,
    blockerResultRecoveryAction,
    blockerResultVisualTone,
    matchingBlockerDispositionReceipt,
    recordBlockerDisposition,
    selectedBlockerRecoveryAction,
    selectedBlockerRecoveryActionRecorded,
    selectedBlockerRecoveryBlockerLabel,
    selectedBlockerRecoveryCanRun,
    selectedBlockerRecoveryDispositionLabel,
    selectedBlockerRecoveryRequiresNote,
    selectedBlockerRecoveryStatusLabel,
    selectedBlockerRecoveryVisualTone,
    setApplyLogDialogOpen,
    setBlockerActionInfoDialogOpen,
    setBlockerAdvisorPrompt,
    setBlockerDispositionJustification,
    setBlockerDispositionOpen,
    setBlockerRecoveryActionId,
    submitBlockerAdvisorPrompt,
  } = applyWorkflow;
  const {
    applyScaffold,
    closeScaffold,
    confirmDelete,
    deleteBlockedNode,
    deleteRequestNode,
    metrics,
    operatorScaffoldSections,
    scaffoldNode,
    setDeleteBlockedNode,
    setDeleteRequestNode,
    traceScaffoldSections,
    tree,
    updateScaffoldSection,
  } = buildTree;
  const {
    activeBriefVersion,
    contextBoardInventory,
    contextFinalizeCanRun,
    contextFinalizeRequirementRows,
    contextFinalizedBoardSnapshot,
    contextFinalizedBrief,
    contextFinalizedBriefDescription,
    contextFinalizedBriefHandoffLabel,
    contextFinalizedBriefReceiptRows,
    contextFinalizedBriefTargetTitle,
    contextNeedsSnapshotCapture,
    contextSnapshotAttachment,
    contextSnapshotAttachmentExportLabel,
    contextSnapshotAttachmentSourceLabel,
    contextSnapshotAttachmentStatusLabel,
    contextSnapshotCoreNodes,
  } = contextArtifacts;
  const {
    contextBoardResetGuardOpen,
    contextBoardTemplateTrayDeleteRequest,
    contextBriefReadOnly,
    contextBriefFingerprint,
    contextBriefReady,
    confirmRemoveContextBoardTemplateTray,
    confirmResetContextBoardLayout,
    setContextBoardResetGuardOpen,
    setContextBoardTemplateTrayDeleteRequest,
  } = contextBoard;
  const {
    reviewTreeCollapsedNodeIds,
    reviewTreeDialogOpen,
    setReviewTreeDialogOpen,
    toggleAllReviewTreeNodes,
    toggleReviewTreeNode,
  } = reviewTreeDialog;
  const {
    closeContextFinalizeDialog,
    confirmSaveContextSession,
    deleteContextSavedSession,
    exportApplyLog,
    exportContextSnapshotAttachment,
    finalizeContextBrief,
    keepCurrentTreeAfterBriefRefinalize,
    loadContextSavedSession,
    regenerateTreeFromBrief,
    reopenContextBriefFromFinalize,
  } = sessionLifecycle;

  return (
    <WorkDesignSessionDialogStack
      applyLogDialog={{
        applyDraftRef,
        applyExecutionLogLines,
        applyLogRecordedAt,
        applyTargetRecordRef,
        exportApplyLog,
        onClose: () => setApplyLogDialogOpen(false),
        open: applyLogDialogOpen,
        packageName: deliveryPackage.display_name,
      }}
      blockerActionInfoDialog={{
        blockerCheckLocations,
        blockerPossibleCauses,
        onClose: () => setBlockerActionInfoDialogOpen(false),
        open: blockerActionInfoDialogOpen,
        selectedBlockerRecoveryAction,
      }}
      blockerRecoveryDialog={{
        activeBlockerIssue,
        blockerAdvisorPrompt,
        blockerAdvisorTranscript,
        blockerDispositionJustification,
        blockerDispositionRecordedCopy,
        blockerDispositionReceiptRecordedAt,
        blockerProblemClearanceValue,
        blockerProblemLockValue,
        blockerProblemRecoveryValue,
        blockerProblemStatusLabel,
        blockerProblemStatusTone,
        blockerRecoveryActions,
        blockerRecoveryNoteLabel,
        blockerRecoveryNotePlaceholder,
        blockerResultRecoveryAction,
        blockerResultVisualTone,
        deliveryPackage,
        matchingBlockerDispositionReceipt,
        onChangeBlockerAdvisorPrompt: setBlockerAdvisorPrompt,
        onChangeBlockerDispositionJustification:
          setBlockerDispositionJustification,
        onClose: () => setBlockerDispositionOpen(false),
        onOpenActionInfo: () => setBlockerActionInfoDialogOpen(true),
        onRecordBlockerDisposition: recordBlockerDisposition,
        onSelectBlockerRecoveryAction: setBlockerRecoveryActionId,
        open: blockerDispositionOpen,
        selectedBlockerRecoveryAction,
        selectedBlockerRecoveryActionRecorded,
        selectedBlockerRecoveryBlockerLabel,
        selectedBlockerRecoveryCanRun,
        selectedBlockerRecoveryDispositionLabel,
        selectedBlockerRecoveryRequiresNote,
        selectedBlockerRecoveryStatusLabel,
        selectedBlockerRecoveryVisualTone,
        submitBlockerAdvisorPrompt,
      }}
      boardResetGuardDialog={{
        onKeepBoard: () => setContextBoardResetGuardOpen(false),
        onResetBoard: confirmResetContextBoardLayout,
        open: contextBoardResetGuardOpen,
      }}
      closeGuardDialog={{
        onKeepEditing: () => setCloseGuardOpen(false),
        onLeave: onClose,
        open: closeGuardOpen,
      }}
      deleteDraftItemDialog={{
        confirmDelete,
        deleteRequestNode,
        setDeleteRequestNode,
      }}
      deleteGuardDialog={{
        deleteBlockedNode,
        setDeleteBlockedNode,
      }}
      finalizedBriefDetailsDialog={{
        contextFinalizedBrief,
        contextSnapshotAttachment,
        onClose: () => setContextFinalizedDetailsDialogOpen(false),
        open: contextFinalizedDetailsDialogOpen,
      }}
      finalizedBriefDialog={{
        applyCompleted,
        contextBoardInventory,
        contextBriefReady,
        contextDecision: modalState.contextDecision,
        contextFinalizeCanRun,
        contextFinalizeRequirementRows,
        contextFinalizeRunning: modalState.contextFinalizeRunning,
        contextFinalizedBrief,
        contextFinalizedBriefDescription,
        contextFinalizedBriefHandoffLabel,
        contextFinalizedBriefReceiptRows,
        contextFinalizedBriefTargetTitle,
        contextSnapshotAttachment,
        contextSnapshotAttachmentExportLabel,
        contextSnapshotAttachmentSourceLabel,
        contextSnapshotAttachmentStatusLabel,
        deliveryPackage,
        exportContextSnapshotAttachment,
        finalizeContextBrief,
        onClose: closeContextFinalizeDialog,
        onOpenDetails: () => setContextFinalizedDetailsDialogOpen(true),
        onOpenSnapshot: () => setContextSnapshotDialogOpen(true),
        open: contextFinalizeDialogOpen,
        reopenContextBriefFromFinalize,
      }}
      reviewTreeDialog={{
        metrics,
        onClose: () => setReviewTreeDialogOpen(false),
        onOpenBuildTree: () => {
          setReviewTreeDialogOpen(false);
          setActiveStep("build");
        },
        onToggleAll: toggleAllReviewTreeNodes,
        onToggleNode: toggleReviewTreeNode,
        open: reviewTreeDialogOpen,
        packageName: deliveryPackage.display_name,
        reviewTreeCollapsedNodeIds,
        tree,
      }}
      saveSessionDialog={{
        contextSaveSessionName,
        onChangeSessionName: setContextSaveSessionName,
        onClose: () => setContextSaveDialogOpen(false),
        onConfirm: confirmSaveContextSession,
        open: contextSaveDialogOpen,
      }}
      savedSessionsDialog={{
        contextBriefReadOnly,
        contextBriefFingerprint,
        contextLoadedSessionId,
        contextSavedSessions,
        onClose: () => setContextSavedSessionsModalOpen(false),
        onDeleteSession: deleteContextSavedSession,
        onLoadSession: loadContextSavedSession,
        open: contextSavedSessionsModalOpen,
      }}
      scaffoldDialog={{
        applyScaffold,
        closeScaffold,
        operatorScaffoldSections,
        scaffoldNode,
        traceScaffoldSections,
        updateScaffoldSection,
      }}
      snapshotCapture={
        contextNeedsSnapshotCapture
          ? {
              capturePlaneRef: contextSnapshotCapturePlaneRef,
              coreNodes: contextSnapshotCoreNodes,
              snapshot: contextFinalizedBoardSnapshot,
            }
          : null
      }
      snapshotViewerDialog={{
        contextSnapshotAttachment,
        contextSnapshotAttachmentExportLabel,
        contextSnapshotAttachmentSourceLabel,
        exportContextSnapshotAttachment,
        onClose: () => setContextSnapshotDialogOpen(false),
        open: contextSnapshotDialogOpen,
      }}
      templateTrayDeleteGuardDialog={{
        onDeleteTray: confirmRemoveContextBoardTemplateTray,
        onKeepTray: () => setContextBoardTemplateTrayDeleteRequest(null),
        tray: contextBoardTemplateTrayDeleteRequest,
      }}
      treeReconciliationDialog={{
        activeBriefVersion,
        metrics,
        onCancel: () => setTreeReconciliationDialogOpen(false),
        onKeepCurrentTree: keepCurrentTreeAfterBriefRefinalize,
        onRegenerateTree: regenerateTreeFromBrief,
        open: treeReconciliationDialogOpen,
        treeDraftStale,
      }}
    />
  );
}
