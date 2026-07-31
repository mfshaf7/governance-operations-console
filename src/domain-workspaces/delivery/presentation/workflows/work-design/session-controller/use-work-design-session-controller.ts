"use client";

import { useCallback, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import type { DeliveryPackageSummary } from "../../../../read-model/index.ts";
import { createLocalWorkDesignApplyReceipt } from "../../../../local-runtime/index.ts";
import type { WorkDesignApplyReceipt } from "../../../../work-model/work-design/work-design-types.ts";

import {
  workDesignContextBoardCoreNodes,
  workDesignDiagramStarterConnections,
  workDesignDiagramStarterItems,
} from "../../../../product-adapters/context-board/index.ts";
import { useWorkDesignApplyState } from "../steps/apply-draft/use-work-design-apply-state.ts";
import { useWorkDesignApplyWorkflow } from "../steps/apply-draft/use-work-design-apply-workflow.ts";
import { useWorkDesignBuildTree } from "../embedded-products/build-tree/index.ts";
import {
  useWorkDesignContextArtifacts,
  workDesignContextFingerprint,
} from "../artifacts/context-brief/index.ts";
import { useWorkDesignContextBoard } from "../embedded-products/context-board/index.ts";
import { useWorkDesignReviewTreeDialog } from "../steps/review-draft/use-work-design-review-tree-dialog.ts";
import { useWorkDesignContextActions } from "./use-work-design-context-actions.ts";
import { useWorkDesignSessionLifecycle } from "./use-work-design-session-lifecycle.ts";
import { useWorkDesignSessionState } from "./use-work-design-session-state.ts";
import { workDesignWorkflowReadiness } from "../view-model/work-design-session-view-model.ts";
import { workDesignSessionShellCopy } from "../view-model/work-design-shell-view-model.ts";
import { workDesignDesignHubProjection } from "../view-model/work-design-hub-model.ts";
import {
  workDesignPackageCompletedFromSource,
  workDesignPackageRetiredFromSource,
} from "../view-model/work-design-source-posture-model.ts";
import {
  workDesignBlockedCurrentMove,
  workDesignCurrentMove,
} from "../view-model/work-design-current-move.ts";
import { workDesignProgressActiveStep } from "../view-model/work-design-step-model.ts";
import type { WorkDesignBoardSnapshot } from "../model/work-design-model.ts";

type UseWorkDesignSessionControllerParams = {
  deliveryPackage: DeliveryPackageSummary;
  onApplied?: (record: WorkDesignApplyReceipt) => void;
  onClose: () => void;
};

export function useWorkDesignSessionController({
  deliveryPackage,
  onApplied,
  onClose,
}: UseWorkDesignSessionControllerParams) {
  const modalState = useWorkDesignSessionState(deliveryPackage);
  const [hasCurrentSessionEdits, setHasCurrentSessionEdits] = useState(false);
  const {
    activeBriefVersionId,
    activeStep,
    applyReceiptId,
    applyReceiptRecorded,
    briefVersions,
    closeGuardOpen,
    contextAdvisorPrompt,
    contextBriefAccepted,
    contextCanvasScreenshotAttachment,
    contextBriefLockedFingerprint,
    contextBriefMetadataFingerprint,
    contextBriefSavedFingerprint,
    contextBriefSnapshotFingerprint,
    contextDecision,
    contextFinalizeDialogOpen,
    contextFinalizeRunning,
    contextLoadedSessionId,
    contextOperatorNote,
    contextSaveDialogOpen,
    contextSavedSessions,
    contextSavedSessionsModalOpen,
    contextSaveSessionName,
    contextSnapshotCapturePlaneRef,
    contextSources,
    hasUnsavedSessionChanges,
    initialContextSession,
    initialTree,
    reviewHandoffNote,
    draftReviewAccepted,
    setActiveBriefVersionId,
    setActiveStep,
    setApplyReceiptId,
    setApplyReceiptRecorded,
    setBriefVersions,
    setCloseGuardOpen,
    setContextAdvisorPrompt,
    setContextAdvisorTurns,
    setContextBriefAccepted,
    setContextCanvasScreenshotAttachment,
    setContextBriefLockedFingerprint,
    setContextBriefMetadataFingerprint,
    setContextBriefSavedFingerprint,
    setContextBriefSnapshotFingerprint,
    setContextDecision,
    setContextFinalizedDetailsDialogOpen,
    setContextFinalizeDialogOpen,
    setContextFinalizeRunning,
    setContextLoadedSessionId,
    setContextOperatorNote,
    setContextSaveDialogOpen,
    setContextSavedSessions,
    setContextSavedSessionsModalOpen,
    setContextSaveSessionName,
    setContextSnapshotDialogOpen,
    setHasUnsavedSessionChanges,
    setReviewHandoffNote,
    setDraftReviewAccepted,
    setTreeDraftStale,
    setTreeReconciliationDialogOpen,
    setDraftValidationAccepted,
    treeDraftStale,
    draftValidationAccepted,
  } = modalState;
  const setHasUnsavedSessionChangesFromUser: Dispatch<
    SetStateAction<boolean>
  > = (value) => {
    if (typeof value === "function") {
      setHasUnsavedSessionChanges((current) => {
        const nextValue = value(current);
        setHasCurrentSessionEdits(nextValue);
        return nextValue;
      });
      return;
    }

    setHasUnsavedSessionChanges(value);
    setHasCurrentSessionEdits(value);
  };
  const interactionModalState = {
    ...modalState,
    setHasUnsavedSessionChanges: setHasUnsavedSessionChangesFromUser,
  };
  const applyState = useWorkDesignApplyState();
  const contextBoardCoreNodes = useMemo(
    () => workDesignContextBoardCoreNodes(deliveryPackage, contextDecision),
    [deliveryPackage, contextDecision],
  );
  const createContextBoardFingerprint = useCallback(
    (snapshot: WorkDesignBoardSnapshot) =>
      workDesignContextFingerprint({
        decision: contextDecision,
        note: contextOperatorNote,
        snapshot,
        sources: contextSources,
      }),
    [contextDecision, contextOperatorNote, contextSources],
  );
  const contextBoard = useWorkDesignContextBoard({
    active: activeStep === "context",
    closeGuardOpen,
    contextBoardCoreNodes,
    contextBriefAccepted,
    contextBriefLockedFingerprint,
    contextBriefMetadataFingerprint,
    contextBriefSavedFingerprint,
    contextBriefSnapshotFingerprint,
    contextFinalizeDialogOpen,
    contextSaveDialogOpen,
    contextSavedSessionsModalOpen,
    createDiagramStarterConnections: workDesignDiagramStarterConnections,
    createDiagramStarterItems: workDesignDiagramStarterItems,
    createContextBoardFingerprint,
    markBoardDirty: () => setHasUnsavedSessionChanges(true),
    markBoardDragCommitted: () => {
      setHasUnsavedSessionChanges(true);
      setApplyReceiptRecorded(false);
      applyState.setApplyRunStartedAt(null);
      setDraftValidationAccepted(false);
      setDraftReviewAccepted(false);
    },
  });
  const {
    contextBriefReadOnly,
    contextBriefFingerprint,
    contextBriefLocked,
    contextBriefMetadataReady,
    contextBriefReady,
    contextBriefSnapshotReady,
  } = contextBoard;
  const contextArtifacts = useWorkDesignContextArtifacts({
    activeBriefVersionId,
    briefVersions,
    contextCanvasScreenshotAttachment,
    contextBriefFingerprint,
    contextBriefLocked,
    contextBriefLockedFingerprint,
    contextBriefMetadataFingerprint,
    contextBriefMetadataReady,
    contextBriefReady,
    contextBriefSavedFingerprint,
    contextBriefSnapshotFingerprint,
    contextBriefSnapshotReady,
    contextDecision,
    contextFinalizeDialogOpen,
    contextFinalizeRunning,
    contextLoadedSessionId,
    contextOperatorNote,
    contextSavedSessions,
    deliveryPackage,
    initialContextSession,
  });
  const {
    contextBriefRecordSavedAtLabel,
    contextDecisionCopy,
    contextFinalizedBrief,
    contextSnapshotAttachment,
    contextSnapshotAttachmentStatusLabel,
  } = contextArtifacts;
  const sourceWorkDesignComplete =
    workDesignPackageCompletedFromSource(deliveryPackage);
  const sourceWorkDesignRetired =
    workDesignPackageRetiredFromSource(deliveryPackage);
  const sourceWorkDesignClosed =
    sourceWorkDesignComplete || sourceWorkDesignRetired;
  const sourceApplyComplete =
    sourceWorkDesignComplete && contextDecision === "proceed";
  const applyCompleted = applyReceiptRecorded || sourceWorkDesignClosed;
  const buildTree = useWorkDesignBuildTree({
    applyCompleted,
    contextFinalizedBrief,
    deliveryPackage,
    initialTree,
    onTreeDirty: () => {
      setHasUnsavedSessionChangesFromUser(true);
      setApplyReceiptRecorded(false);
      applyState.setApplyRunStartedAt(null);
      setDraftValidationAccepted(false);
      setDraftReviewAccepted(false);
    },
  });
  const { metrics, tree } = buildTree;
  const reviewTreeDialog = useWorkDesignReviewTreeDialog({ tree });
  const contextActions = useWorkDesignContextActions({
    contextAdvisorPrompt,
    contextBriefReadOnly,
    contextBriefReady,
    contextDecision,
    contextOperatorNote,
    deliveryPackage,
    setActiveStep,
    setApplyReceiptRecorded,
    setApplyRunStartedAt: applyState.setApplyRunStartedAt,
    setContextAdvisorPrompt,
    setContextAdvisorTurns,
    setContextBriefAccepted,
    setContextDecision,
    setHasUnsavedSessionChanges: setHasUnsavedSessionChangesFromUser,
    setDraftReviewAccepted,
    setTreeReconciliationDialogOpen,
    setDraftValidationAccepted,
    treeDraftStale,
  });
  const { acceptContextBrief } = contextActions;
  const {
    applyReady,
    draftTreePresent,
    reviewHandoffNoteRecorded,
    reviewReady,
    reviewRouteReady,
    validateReady,
  } = workDesignWorkflowReadiness({
    contextBriefAccepted,
    contextDecision,
    hasUnsavedSessionChanges,
    metrics,
    reviewHandoffNote,
    draftReviewAccepted,
  });
  const applyWorkflow = useWorkDesignApplyWorkflow({
    activeStep,
    applyReceiptId,
    applyReceiptRecorded,
    applyReady,
    applyState,
    contextBriefAccepted,
    contextDecision,
    contextSnapshotAttachment,
    contextSnapshotAttachmentStatusLabel,
    deliveryPackage,
    metrics,
    setActiveStep,
    setApplyReceiptId,
    setApplyReceiptRecorded,
    setHasUnsavedSessionChanges: setHasUnsavedSessionChangesFromUser,
    setDraftValidationAccepted,
    sourceApplyComplete,
  });
  const {
    activeBlockerIssue,
    blockerDispositionRecordedCopy,
    blockerDispositionReceiptRecordedAt,
    matchingBlockerDispositionReceipt,
    openBlockerRecovery,
    runApplyDraft: recordApplyDraft,
    workDesignBlocked,
  } = applyWorkflow;
  const sessionShellCopy = workDesignSessionShellCopy(activeStep, {
    terminalDecisionRecorded:
      contextBriefAccepted &&
      contextDecision !== "proceed" &&
      !applyReceiptRecorded,
  });
  const blockedCurrentMove = workDesignBlocked
    ? workDesignBlockedCurrentMove({
        activeBlockerIssue,
        blockerDispositionCopy: blockerDispositionRecordedCopy,
        matchingBlockerDispositionReceipt,
      })
    : null;
  const currentMove = workDesignCurrentMove({
    activeStep,
    applyReceiptRecorded,
    applyReady,
    blockedMove: blockedCurrentMove,
    contextBriefAccepted,
    contextDecision,
    contextDecisionCopy,
    draftTreePresent,
    draftReviewAccepted,
    reviewReady,
    sourceWorkDesignClosed,
    workDesignBlocked,
  });
  const designHubProjection = workDesignDesignHubProjection({
    activeBlockerIssue,
    applyReceiptRecorded,
    blockerDispositionCopy: blockerDispositionRecordedCopy,
    blockerDispositionReceiptRecordedAt,
    contextBriefAccepted,
    contextBriefRecordSavedAtLabel,
    contextDecision,
    contextDecisionCopy,
    currentMove,
    deliveryPackage,
    draftTreePresent,
    metrics,
    matchingBlockerDispositionReceipt,
    draftReviewAccepted,
    reviewReady,
    treeDraftStale,
    draftValidationAccepted,
    workDesignBlocked,
  });
  const progressActiveStep = workDesignProgressActiveStep({
    activeStep,
    applyReceiptRecorded,
    contextBriefAccepted,
    contextDecision,
    draftTreePresent,
    draftReviewAccepted,
    reviewReady,
    sourceWorkDesignClosed,
    validateReady,
  });
  const sessionLifecycle = useWorkDesignSessionLifecycle({
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
  });

  function requestClose() {
    if (hasCurrentSessionEdits && !applyCompleted) {
      setCloseGuardOpen(true);
      return;
    }

    onClose();
  }

  function returnToRegister() {
    onClose();
  }

  function runApplyDraft() {
    if (
      !applyReady ||
      workDesignBlocked ||
      contextDecision !== "proceed" ||
      sourceWorkDesignClosed
    ) {
      return;
    }

    const receipt = createLocalWorkDesignApplyReceipt({
      deliveryPackage,
      targetTree: tree,
    });

    recordApplyDraft(receipt);
    setHasCurrentSessionEdits(false);
    onApplied?.(receipt);
  }

  const shellWidth =
    activeStep === "context"
      ? ("viewport" as const)
      : activeStep === "hub"
        ? ("medium" as const)
        : ("large" as const);

  return {
    dialogsProps: {
      applyCompleted,
      applyWorkflow,
      buildTree,
      contextArtifacts,
      contextBoard,
      deliveryPackage,
      modalState: interactionModalState,
      onClose,
      reviewTreeDialog,
      sessionLifecycle,
    },
    footerProps: {
      activeStep,
      applyReceiptRecorded,
      applyReady,
      contextBriefReady,
      contextDecision,
      contextDecisionTone: contextDecisionCopy.tone,
      onAcceptContextBrief: acceptContextBrief,
      onRequestClose: requestClose,
      onReturnToRegister: returnToRegister,
      onRunApplyDraft: runApplyDraft,
      onSelectStep: setActiveStep,
      reviewRouteReady,
      validateReady,
      workDesignClosed: designHubProjection.workDesignClosed,
    },
    sessionShellCopy,
    requestClose,
    shellWidth,
    stepContentProps: {
      applyCompleted,
      applyReady,
      applyWorkflow,
      buildTree,
      contextActions,
      contextArtifacts,
      contextBoard,
      deliveryPackage,
      draftTreePresent,
      exportApplyLog: sessionLifecycle.exportApplyLog,
      exportContextSnapshotAttachment:
        sessionLifecycle.exportContextSnapshotAttachment,
      exportWorkDesignReceipt: sessionLifecycle.exportWorkDesignReceipt,
      reviewHandoffNoteRecorded,
      currentMove,
      designHubProjection,
      modalState: interactionModalState,
      openBlockerRecovery,
      progressActiveStep,
      reviewReady,
      reviewTreeDialog,
      saveContextSession: sessionLifecycle.saveContextSession,
      workDesignBlocked,
      sourceApplyComplete,
    },
  };
}
