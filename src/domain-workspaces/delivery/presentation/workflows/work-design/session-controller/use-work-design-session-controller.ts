"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import type { DeliveryPackageSummary } from "../../../../read-model/index.ts";
import { createLocalWorkDesignApplyReceipt } from "../../../../local-runtime/index.ts";
import type { WorkDesignApplyReceipt } from "../../../../work-model/work-design/work-design-types.ts";
import { useWorkDesignLiveRuntime } from "../../../../live-runtime/use-work-design-live-runtime.ts";

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
import { workDesignMockContextAdvisorAdapter } from "../view-model/work-design-context-advisor-view-model.ts";
import { workDesignBuildAdvisorAdapter } from "../../../../product-adapters/build-tree/index.ts";

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
  const liveRuntime = useWorkDesignLiveRuntime(deliveryPackage);
  const [hasCurrentSessionEdits, setHasCurrentSessionEdits] = useState(false);
  const applyInFlightRef = useRef(false);
  const pendingAcceptanceRef = useRef<{
    acceptedAt: string;
    acceptanceId: string;
    treeKey: string;
  } | null>(null);
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
  const applyState = useWorkDesignApplyState();
  useEffect(() => {
    if (liveRuntime.mode !== "live") return;
    if (liveRuntime.projectionError) {
      applyState.setApplyRuntimeError(liveRuntime.projectionError);
      return;
    }
    if (liveRuntime.projectionStatus === "current") {
      applyState.setApplyRuntimeError(null);
    }
  }, [
    liveRuntime.mode,
    liveRuntime.projectionError,
    liveRuntime.projectionStatus,
  ]);
  useEffect(() => {
    if (liveRuntime.mode !== "live") return;
    const latest = liveRuntime.projection?.latest_application;
    if (!latest) {
      setApplyReceiptId(null);
      setApplyReceiptRecorded(false);
      applyState.setApplyRunStartedAt(null);
      return;
    }
    setApplyReceiptId(latest.receipt.ref);
    setApplyReceiptRecorded(true);
    applyState.setApplyRunStartedAt(latest.applied_at);
    applyState.setApplyRuntimeError(null);
    setHasCurrentSessionEdits(false);
  }, [
    liveRuntime.projection?.latest_application,
    liveRuntime.mode,
    setApplyReceiptId,
    setApplyReceiptRecorded,
  ]);
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
    liveRuntime.mode === "live"
      ? Boolean(liveRuntime.projection?.latest_application)
      : workDesignPackageCompletedFromSource(deliveryPackage);
  const sourceWorkDesignRetired =
    workDesignPackageRetiredFromSource(deliveryPackage);
  const sourceWorkDesignClosed =
    sourceWorkDesignComplete || sourceWorkDesignRetired;
  const sourceApplyComplete =
    sourceWorkDesignComplete && contextDecision === "proceed";
  const applyCompleted = applyReceiptRecorded || sourceWorkDesignClosed;
  const requestTreeAdvice = useCallback(
    async ({
      operatorPrompt,
      selectedNode,
      tree,
    }: {
      operatorPrompt: string;
      selectedNode: typeof initialTree;
      tree: typeof initialTree;
    }) => {
      const live = await liveRuntime.treeAdvice({
        operatorPrompt,
        selectedNodeId: selectedNode.id,
        tree,
      });
      if (live.result) return live.result;
      return workDesignBuildAdvisorAdapter({
        finalized_brief_ref: contextFinalizedBrief.metadataPacketRef,
        operator_prompt: operatorPrompt,
        package_ref: deliveryPackage.delivery_package_id,
        request_id: `build-tree-${Date.now()}`,
        selected_node: selectedNode,
        source_ref: deliveryPackage.source_ref,
        tree_snapshot: tree,
      });
    },
    [
      contextFinalizedBrief.metadataPacketRef,
      deliveryPackage.delivery_package_id,
      deliveryPackage.source_ref,
      liveRuntime,
    ],
  );
  const buildTree = useWorkDesignBuildTree({
    applyCompleted,
    contextFinalizedBrief,
    deliveryPackage,
    initialTree,
    onTreeDirty: () => {
      pendingAcceptanceRef.current = null;
      applyState.setApplyRuntimeError(null);
      setHasUnsavedSessionChangesFromUser(true);
      setApplyReceiptRecorded(false);
      applyState.setApplyRunStartedAt(null);
      setDraftValidationAccepted(false);
      setDraftReviewAccepted(false);
    },
    requestTreeAdvice,
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
    requestContextAdvice: async (request) => {
      const live = await liveRuntime.contextAdvice({
        contextDecision: request.context_decision ?? "proceed",
        contextNote: request.context_note ?? "",
        operatorPrompt: request.operator_prompt,
      });
      if (live.result) {
        return {
          advisor_mode: "context_session",
          confidence: live.result.confidence,
          required_operator_action: live.result.required_operator_action,
          response_id: live.result.response_id,
          status: live.result.status,
          text: live.result.text,
        };
      }
      return workDesignMockContextAdvisorAdapter(request);
    },
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
  const applyActionReady =
    applyReady &&
    (liveRuntime.mode === "disconnected-preview" ||
      liveRuntime.projectionStatus === "current");
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
    runtimeMode: liveRuntime.mode,
    runtimeError: applyState.applyRuntimeError,
    setActiveStep,
    setApplyReceiptId,
    setApplyReceiptRecorded,
    setHasUnsavedSessionChanges: setHasUnsavedSessionChangesFromUser,
    setDraftValidationAccepted,
    sourceApplyComplete,
    sourceRecordRef:
      liveRuntime.projection?.source.ref ?? deliveryPackage.source_ref,
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

  async function runApplyDraft() {
    if (
      !applyActionReady ||
      workDesignBlocked ||
      contextDecision !== "proceed" ||
      sourceWorkDesignClosed
    ) {
      return;
    }
    if (applyInFlightRef.current) return;
    applyInFlightRef.current = true;
    applyState.setApplyRuntimeError(null);
    try {
      const treeKey = JSON.stringify(tree);
      if (pendingAcceptanceRef.current?.treeKey !== treeKey) {
        pendingAcceptanceRef.current = {
          acceptedAt: new Date().toISOString(),
          acceptanceId: `work-design-acceptance:${crypto.randomUUID()}`,
          treeKey,
        };
      }
      const acceptance = pendingAcceptanceRef.current;
      const live = await liveRuntime.apply({
        acceptanceId: acceptance.acceptanceId,
        acceptedAt: acceptance.acceptedAt,
        note: reviewHandoffNote,
        tree,
      });
      const receipt: WorkDesignApplyReceipt = live.result
        ? {
            appliedAt: live.result.applied_at,
            appliedBy: live.result.applied_by,
            receiptId: live.result.receipt.ref,
            targetTree: tree,
          }
        : createLocalWorkDesignApplyReceipt({
            deliveryPackage,
            targetTree: tree,
          });
      recordApplyDraft(receipt);
      setHasCurrentSessionEdits(false);
      if (!live.result) onApplied?.(receipt);
    } catch (error) {
      applyState.setApplyRuntimeError(
        error instanceof Error ? error.message : "Work Design apply failed.",
      );
    } finally {
      applyInFlightRef.current = false;
    }
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
      applyReady: applyActionReady,
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
