"use client";

import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import type { DeliveryPackageSummary } from "../../../../read-model/index.ts";

import {
  workDesignBriefVersionFromContextSession,
  workDesignContextFingerprint,
  workDesignFinalizedContextBoardSnapshot,
  type WorkDesignSnapshotAttachment,
} from "../artifacts/context-brief/index.ts";
import {
  loadWorkDesignSessionDraft,
  saveWorkDesignSessionDraft,
} from "../../../../local-runtime/index.ts";
import { findWorkDesignNode } from "../../../../product-adapters/build-tree/index.ts";
import type {
  WorkDesignBlockerRecoveryActionId,
  WorkDesignBlockerDispositionReceipt,
  WorkDesignBoardSnapshot,
  WorkDesignBriefVersion,
  WorkDesignBuildTreeViewMode,
  WorkDesignContextDecision,
  WorkDesignContextSavedSession,
  WorkDesignNode,
  WorkDesignPersistedSession,
} from "../model/work-design-model.ts";

type InitialWorkDesignContextSession = NonNullable<
  DeliveryPackageSummary["work_design_context_session"]
>;

type UseWorkDesignSessionPersistenceParams = {
  activeBriefVersionId: string | null;
  applyReceiptId: string | null;
  applyReceiptRecorded: boolean;
  applyDraftRef: string;
  applyRunStartedAt: string | null;
  applyTargetRecordRef: string;
  applyViewOpenedAt: string;
  blockerDispositionReceipt: WorkDesignBlockerDispositionReceipt | null;
  briefVersions: WorkDesignBriefVersion[];
  buildTreeViewMode: WorkDesignBuildTreeViewMode;
  captureContextBoardSnapshot: () => WorkDesignBoardSnapshot;
  contextBoardAutosaveDependencies: readonly unknown[];
  contextBriefAccepted: boolean;
  contextBriefFingerprint: string;
  contextDecision: WorkDesignContextDecision;
  contextFinalizedFingerprint: string | null;
  contextLoadedSessionId: string | null;
  contextOperatorNote: string;
  contextSavedSessions: WorkDesignContextSavedSession[];
  contextSnapshotAttachment: WorkDesignSnapshotAttachment;
  contextSources: ReturnType<
    typeof import("../artifacts/context-brief/index.ts").workDesignContextSources
  >;
  deliveryPackage: DeliveryPackageSummary;
  hasUnsavedSessionChanges: boolean;
  expandedNodeIds: string[];
  initialContextSession: InitialWorkDesignContextSession | null;
  openDetailNodeId: string | null;
  reviewHandoffNote: string;
  restoreContextBoardSnapshot: (snapshot: WorkDesignBoardSnapshot) => void;
  draftReviewAccepted: boolean;
  selectedNodeId: string;
  setActiveBriefVersionId: Dispatch<SetStateAction<string | null>>;
  setApplyReceiptId: Dispatch<SetStateAction<string | null>>;
  setApplyReceiptRecorded: Dispatch<SetStateAction<boolean>>;
  setApplyRunStartedAt: Dispatch<SetStateAction<string | null>>;
  setApplyViewOpenedAt: Dispatch<SetStateAction<string>>;
  setBlockerDispositionJustification: Dispatch<SetStateAction<string>>;
  setBlockerDispositionReceipt: Dispatch<
    SetStateAction<WorkDesignBlockerDispositionReceipt | null>
  >;
  setBlockerRecoveryActionId: Dispatch<
    SetStateAction<WorkDesignBlockerRecoveryActionId>
  >;
  setBriefVersions: Dispatch<SetStateAction<WorkDesignBriefVersion[]>>;
  setBuildTreeViewMode: Dispatch<SetStateAction<WorkDesignBuildTreeViewMode>>;
  setContextBriefAccepted: Dispatch<SetStateAction<boolean>>;
  setContextBriefLockedFingerprint: Dispatch<SetStateAction<string | null>>;
  setContextBriefMetadataFingerprint: Dispatch<SetStateAction<string | null>>;
  setContextBriefSavedFingerprint: Dispatch<SetStateAction<string | null>>;
  setContextBriefSnapshotFingerprint: Dispatch<SetStateAction<string | null>>;
  setContextDecision: Dispatch<SetStateAction<WorkDesignContextDecision>>;
  setContextLoadedSessionId: Dispatch<SetStateAction<string | null>>;
  setContextOperatorNote: Dispatch<SetStateAction<string>>;
  setContextSavedSessions: Dispatch<
    SetStateAction<WorkDesignContextSavedSession[]>
  >;
  setHasUnsavedSessionChanges: Dispatch<SetStateAction<boolean>>;
  setExpandedNodeIds: Dispatch<SetStateAction<string[]>>;
  setOpenDetailNodeId: Dispatch<SetStateAction<string | null>>;
  setReviewHandoffNote: Dispatch<SetStateAction<string>>;
  setDraftReviewAccepted: Dispatch<SetStateAction<boolean>>;
  setSelectedNodeId: Dispatch<SetStateAction<string>>;
  setStructuredStoryGroupIds: Dispatch<SetStateAction<string[]>>;
  setTree: Dispatch<SetStateAction<WorkDesignNode>>;
  setTreeDraftStale: Dispatch<SetStateAction<boolean>>;
  setDraftValidationAccepted: Dispatch<SetStateAction<boolean>>;
  structuredStoryGroupIds: string[];
  tree: WorkDesignNode;
  treeDraftStale: boolean;
  draftValidationAccepted: boolean;
};

export function useWorkDesignSessionPersistence({
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
  contextBoardAutosaveDependencies,
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
}: UseWorkDesignSessionPersistenceParams) {
  const deliveryPackageId = deliveryPackage.delivery_package_id;
  const localWorkDesignApplyProjection =
    deliveryPackage.local_workflow_projection?.workflow_phase ===
      "work_design" &&
    deliveryPackage.local_workflow_projection.status_label === "Done"
      ? deliveryPackage.local_workflow_projection
      : null;
  const [contextPersistenceLoaded, setContextPersistenceLoaded] =
    useState(false);

  useEffect(() => {
    setContextPersistenceLoaded(false);

    try {
      const seededSnapshot =
        initialContextSession?.accepted && initialContextSession.locked
          ? workDesignFinalizedContextBoardSnapshot({
              deliveryPackage,
            })
          : captureContextBoardSnapshot();
      const seededFingerprint =
        initialContextSession && seededSnapshot
          ? workDesignContextFingerprint({
              decision: initialContextSession.decision,
              note: initialContextSession.note,
              snapshot: seededSnapshot,
              sources: contextSources,
            })
          : null;
      const seededContextSession: WorkDesignContextSavedSession | null =
        initialContextSession
          ? {
              decision: initialContextSession.decision,
              fingerprint: seededFingerprint ?? contextBriefFingerprint,
              id: initialContextSession.session_ref,
              name: initialContextSession.name,
              note: initialContextSession.note,
              savedAt: initialContextSession.saved_at,
              sequence: 1,
              snapshot: seededSnapshot,
            }
          : null;
      const seededBriefVersion =
        seededContextSession && initialContextSession?.accepted
          ? workDesignBriefVersionFromContextSession({
              deliveryPackage,
              fingerprint: seededContextSession.fingerprint,
              savedSession: seededContextSession,
              session: initialContextSession,
            })
          : null;
      const persistedSession = loadWorkDesignSessionDraft(deliveryPackageId);
      const persistedContext = persistedSession?.context ?? null;
      const persistedSessions = persistedContext?.sessions ?? [];
      const mergedSessions = seededContextSession
        ? [
            seededContextSession,
            ...persistedSessions.filter(
              (session) => session.id !== seededContextSession.id,
            ),
          ]
        : persistedSessions;
      const persistedLoadedSessionId =
        persistedContext?.loadedSessionId ?? null;
      const persistedCurrentSession = persistedContext?.current ?? null;
      const resumeSession =
        seededContextSession ??
        mergedSessions.find(
          (session) => session.id === persistedLoadedSessionId,
        ) ??
        persistedCurrentSession ??
        mergedSessions[0] ??
        null;
      const persistedBriefVersions = persistedSession?.briefVersions ?? [];
      const nextBriefVersions = seededBriefVersion
        ? [
            seededBriefVersion,
            ...persistedBriefVersions.filter(
              (version) =>
                version.briefVersionId !== seededBriefVersion.briefVersionId,
            ),
          ]
        : persistedBriefVersions;
      const nextActiveBriefVersionId =
        seededBriefVersion?.briefVersionId ??
        persistedSession?.activeBriefVersionId ??
        null;
      const finalizedFingerprint =
        seededContextSession && initialContextSession?.accepted
          ? seededContextSession.fingerprint
          : (persistedContext?.finalizedFingerprint ?? null);

      setContextSavedSessions(mergedSessions);
      setContextLoadedSessionId(
        seededContextSession?.id ??
          persistedLoadedSessionId ??
          resumeSession?.id ??
          null,
      );
      setBriefVersions(nextBriefVersions);
      setActiveBriefVersionId(nextActiveBriefVersionId);

      if (resumeSession) {
        restoreContextBoardSnapshot(resumeSession.snapshot);
        setContextDecision(resumeSession.decision);
        setContextOperatorNote(resumeSession.note);
      }

      if (finalizedFingerprint) {
        setContextBriefSavedFingerprint(finalizedFingerprint);
        setContextBriefLockedFingerprint(finalizedFingerprint);
        setContextBriefMetadataFingerprint(finalizedFingerprint);
        setContextBriefSnapshotFingerprint(finalizedFingerprint);
        setContextBriefAccepted(
          Boolean(seededContextSession?.fingerprint === finalizedFingerprint) ||
            Boolean(resumeSession?.fingerprint === finalizedFingerprint),
        );
      } else {
        setContextBriefSavedFingerprint(null);
        setContextBriefLockedFingerprint(null);
        setContextBriefMetadataFingerprint(null);
        setContextBriefSnapshotFingerprint(null);
        setContextBriefAccepted(false);
      }

      if (persistedSession?.treeDraft) {
        const restoredTree = persistedSession.treeDraft.tree;
        const restoredSelectedNodeId = findWorkDesignNode(
          restoredTree,
          persistedSession.treeDraft.selectedNodeId,
        )
          ? persistedSession.treeDraft.selectedNodeId
          : restoredTree.id;
        const restoredOpenDetailNodeId =
          persistedSession.treeDraft.openDetailNodeId &&
          findWorkDesignNode(
            restoredTree,
            persistedSession.treeDraft.openDetailNodeId,
          )
            ? persistedSession.treeDraft.openDetailNodeId
            : restoredTree.id;
        const briefMismatch =
          Boolean(nextActiveBriefVersionId) &&
          Boolean(persistedSession.treeDraft.activeBriefVersionId) &&
          persistedSession.treeDraft.activeBriefVersionId !==
            nextActiveBriefVersionId;

        setTree(restoredTree);
        setSelectedNodeId(restoredSelectedNodeId);
        setOpenDetailNodeId(restoredOpenDetailNodeId);
        setExpandedNodeIds(persistedSession.treeDraft.expandedNodeIds);
        setStructuredStoryGroupIds(
          persistedSession.treeDraft.structuredStoryGroupIds,
        );
        setBuildTreeViewMode(persistedSession.treeDraft.viewMode);
        setReviewHandoffNote(persistedSession.treeDraft.reviewHandoffNote);
        setHasUnsavedSessionChanges(
          persistedSession.treeDraft.hasUnsavedSessionChanges,
        );
        setTreeDraftStale(persistedSession.treeDraft.stale || briefMismatch);
      } else {
        setHasUnsavedSessionChanges(false);
        setTreeDraftStale(false);
      }

      setDraftReviewAccepted(
        persistedSession?.review.draftReviewAccepted ?? false,
      );
      setDraftValidationAccepted(
        persistedSession?.review.draftValidationAccepted ?? false,
      );
      const restoredApplyReceiptId =
        persistedSession?.apply.receiptId ??
        localWorkDesignApplyProjection?.receipt_id ??
        null;
      setApplyReceiptId(restoredApplyReceiptId);
      setApplyReceiptRecorded(Boolean(restoredApplyReceiptId));
      setApplyRunStartedAt(
        persistedSession?.apply.applyRunStartedAt ??
          localWorkDesignApplyProjection?.recorded_at ??
          null,
      );
      if (persistedSession?.apply.applyViewOpenedAt) {
        setApplyViewOpenedAt(persistedSession.apply.applyViewOpenedAt);
      }
      setBlockerDispositionReceipt(persistedSession?.blocker ?? null);
      if (persistedSession?.blocker) {
        if (persistedSession.blocker.recoveryActionId) {
          setBlockerRecoveryActionId(persistedSession.blocker.recoveryActionId);
        }
        setBlockerDispositionJustification(
          persistedSession.blocker.justification,
        );
      }

      setContextPersistenceLoaded(true);
    } catch {
      setContextPersistenceLoaded(true);
    }
  }, [deliveryPackageId]);

  useEffect(() => {
    if (!contextPersistenceLoaded) {
      return;
    }

    const savedAt = new Date().toISOString();
    const currentContextSession: WorkDesignContextSavedSession = {
      decision: contextDecision,
      fingerprint: contextBriefFingerprint,
      id: `autosave-${deliveryPackageId}`,
      name: "Autosaved Workspace",
      note: contextOperatorNote,
      savedAt,
      sequence: 0,
      snapshot: captureContextBoardSnapshot(),
    };
    const shouldPersistFullSession =
      Boolean(activeBriefVersionId) ||
      Boolean(blockerDispositionReceipt) ||
      contextBriefAccepted ||
      treeDraftStale ||
      draftReviewAccepted ||
      draftValidationAccepted ||
      applyReceiptRecorded;
    const persistedSession: WorkDesignPersistedSession = {
      activeBriefVersionId,
      apply: {
        applyReceiptRecorded,
        applyRunStartedAt,
        applyViewOpenedAt,
        draftRef: shouldPersistFullSession ? applyDraftRef : null,
        receiptId: applyReceiptRecorded ? applyReceiptId : null,
        snapshotStatus: shouldPersistFullSession
          ? contextSnapshotAttachment.attachmentStatus
          : null,
        targetRecordRef: shouldPersistFullSession ? applyTargetRecordRef : null,
      },
      blocker: blockerDispositionReceipt,
      briefVersions,
      context: {
        current: currentContextSession,
        finalizedFingerprint: contextFinalizedFingerprint,
        loadedSessionId: contextLoadedSessionId,
        sessions: contextSavedSessions,
      },
      lastSavedAt: savedAt,
      packageId: deliveryPackageId,
      review: {
        draftReviewAccepted,
        draftValidationAccepted,
      },
      schemaVersion: 2,
      treeDraft: shouldPersistFullSession
        ? {
            activeBriefVersionId,
            hasUnsavedSessionChanges,
            expandedNodeIds,
            openDetailNodeId,
            reviewHandoffNote,
            savedAt,
            selectedNodeId,
            stale: treeDraftStale,
            structuredStoryGroupIds,
            tree,
            viewMode: buildTreeViewMode,
          }
        : null,
      workDesignSessionId: `work-design-session-${deliveryPackageId}`,
    };

    saveWorkDesignSessionDraft(deliveryPackageId, persistedSession);
  }, [
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
    ...contextBoardAutosaveDependencies,
    contextBriefAccepted,
    contextBriefFingerprint,
    contextDecision,
    contextFinalizedFingerprint,
    contextLoadedSessionId,
    contextOperatorNote,
    contextPersistenceLoaded,
    contextSavedSessions,
    contextSnapshotAttachment.attachmentStatus,
    deliveryPackageId,
    hasUnsavedSessionChanges,
    expandedNodeIds,
    openDetailNodeId,
    reviewHandoffNote,
    draftReviewAccepted,
    selectedNodeId,
    structuredStoryGroupIds,
    tree,
    treeDraftStale,
    draftValidationAccepted,
  ]);
}
