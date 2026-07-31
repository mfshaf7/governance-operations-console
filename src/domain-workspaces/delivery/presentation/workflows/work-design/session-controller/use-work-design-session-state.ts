"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import type { DeliveryPackageSummary } from "../../../../read-model/index.ts";

import {
  workDesignBriefVersionIdFromSession,
  workDesignContextSources,
  type WorkDesignSnapshotAttachment,
} from "../artifacts/context-brief/index.ts";
import { initialWorkDesignTree } from "../../../../product-adapters/build-tree/index.ts";
import type {
  WorkDesignBriefVersion,
  WorkDesignContextDecision,
  WorkDesignContextSavedSession,
  WorkDesignStep,
} from "../model/work-design-model.ts";
import type { WorkDesignAdvisorTranscriptLine } from "../view-model/work-design-context-advisor-view-model.ts";

export function useWorkDesignSessionState(
  deliveryPackage: DeliveryPackageSummary,
) {
  const deliveryPackageId = deliveryPackage.delivery_package_id;
  const initialApplyReceiptId =
    deliveryPackage.local_workflow_projection?.workflow_phase ===
      "work_design" &&
    deliveryPackage.local_workflow_projection.status_label === "Done"
      ? deliveryPackage.local_workflow_projection.receipt_id
      : null;
  const initialTree = useMemo(
    () => initialWorkDesignTree(deliveryPackage),
    [deliveryPackageId],
  );
  const initialContextSession =
    deliveryPackage.work_design_context_session ?? null;
  const contextSnapshotCapturePlaneRef = useRef<HTMLDivElement | null>(null);
  const [activeStep, setActiveStep] = useState<WorkDesignStep>("hub");
  const [applyReceiptId, setApplyReceiptId] = useState<string | null>(
    initialApplyReceiptId ?? null,
  );
  const [applyReceiptRecorded, setApplyReceiptRecordedState] = useState(
    Boolean(initialApplyReceiptId),
  );
  const setApplyReceiptRecorded = useCallback<
    Dispatch<SetStateAction<boolean>>
  >((value) => {
    if (value === false) {
      setApplyReceiptId(null);
    }

    setApplyReceiptRecordedState(value);
  }, []);
  const [closeGuardOpen, setCloseGuardOpen] = useState(false);
  const [hasUnsavedSessionChanges, setHasUnsavedSessionChanges] =
    useState(false);
  const [contextBriefAccepted, setContextBriefAccepted] = useState(
    Boolean(initialContextSession?.accepted),
  );
  const [contextDecision, setContextDecision] =
    useState<WorkDesignContextDecision>(
      initialContextSession?.decision ?? "proceed",
    );
  const [contextFinalizeDialogOpen, setContextFinalizeDialogOpen] =
    useState(false);
  const [contextFinalizeRunning, setContextFinalizeRunning] = useState(false);
  const [contextSnapshotDialogOpen, setContextSnapshotDialogOpen] =
    useState(false);
  const [
    contextFinalizedDetailsDialogOpen,
    setContextFinalizedDetailsDialogOpen,
  ] = useState(false);
  const [
    contextCanvasScreenshotAttachment,
    setContextCanvasScreenshotAttachment,
  ] = useState<WorkDesignSnapshotAttachment | null>(null);
  const [contextSaveDialogOpen, setContextSaveDialogOpen] = useState(false);
  const [contextSaveSessionName, setContextSaveSessionName] = useState("");
  const [contextSavedSessionsModalOpen, setContextSavedSessionsModalOpen] =
    useState(false);
  const [contextSavedSessions, setContextSavedSessions] = useState<
    WorkDesignContextSavedSession[]
  >([]);
  const [contextLoadedSessionId, setContextLoadedSessionId] = useState<
    string | null
  >(null);
  const [activeBriefVersionId, setActiveBriefVersionId] = useState<
    string | null
  >(() =>
    initialContextSession?.accepted
      ? workDesignBriefVersionIdFromSession(
          deliveryPackageId,
          initialContextSession,
        )
      : null,
  );
  const [briefVersions, setBriefVersions] = useState<WorkDesignBriefVersion[]>(
    [],
  );
  const [contextBriefLockedFingerprint, setContextBriefLockedFingerprint] =
    useState<string | null>(null);
  const [contextBriefMetadataFingerprint, setContextBriefMetadataFingerprint] =
    useState<string | null>(null);
  const [contextBriefSavedFingerprint, setContextBriefSavedFingerprint] =
    useState<string | null>(null);
  const [contextBriefSnapshotFingerprint, setContextBriefSnapshotFingerprint] =
    useState<string | null>(null);
  const [contextAdvisorPrompt, setContextAdvisorPrompt] = useState("");
  const [contextAdvisorTurns, setContextAdvisorTurns] = useState<
    WorkDesignAdvisorTranscriptLine[]
  >([]);
  const [contextOperatorNote, setContextOperatorNote] = useState(
    initialContextSession?.note ??
      "Inspect ART context for duplicate scope, existing package overlap, and the right draft boundary before building the tree.",
  );
  const [reviewHandoffNote, setReviewHandoffNote] = useState(() => {
    if (initialContextSession?.initial_step === "build") {
      return "";
    }

    return (
      initialContextSession?.note ??
      `Shape ${deliveryPackage.display_name} into a draft Epic tree before refinement.`
    );
  });
  const [draftReviewAccepted, setDraftReviewAccepted] = useState(false);
  const [draftValidationAccepted, setDraftValidationAccepted] = useState(false);
  const [treeDraftStale, setTreeDraftStale] = useState(false);
  const [treeReconciliationDialogOpen, setTreeReconciliationDialogOpen] =
    useState(false);
  const contextSources = useMemo(
    () => workDesignContextSources(deliveryPackage),
    [deliveryPackage],
  );

  return {
    activeBriefVersionId,
    applyReceiptId,
    activeStep,
    applyReceiptRecorded,
    briefVersions,
    closeGuardOpen,
    contextAdvisorPrompt,
    contextAdvisorTurns,
    contextBriefAccepted,
    contextCanvasScreenshotAttachment,
    contextBriefLockedFingerprint,
    contextBriefMetadataFingerprint,
    contextBriefSavedFingerprint,
    contextBriefSnapshotFingerprint,
    contextDecision,
    contextFinalizedDetailsDialogOpen,
    contextFinalizeDialogOpen,
    contextFinalizeRunning,
    contextLoadedSessionId,
    contextOperatorNote,
    contextSaveDialogOpen,
    contextSavedSessions,
    contextSavedSessionsModalOpen,
    contextSaveSessionName,
    contextSnapshotCapturePlaneRef,
    contextSnapshotDialogOpen,
    contextSources,
    hasUnsavedSessionChanges,
    initialContextSession,
    initialTree,
    reviewHandoffNote,
    draftReviewAccepted,
    setActiveBriefVersionId,
    setApplyReceiptId,
    setActiveStep,
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
    treeReconciliationDialogOpen,
    draftValidationAccepted,
  };
}

export type WorkDesignSessionState = ReturnType<
  typeof useWorkDesignSessionState
>;
