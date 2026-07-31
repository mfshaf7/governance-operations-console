"use client";

import type { Dispatch, SetStateAction } from "react";

import { defaultWorkDesignContextSessionName } from "../../../../work-model/work-design/work-design-session-model.ts";
import type {
  WorkDesignBoardSnapshot,
  WorkDesignContextDecision,
  WorkDesignContextSavedSession,
} from "../model/work-design-model.ts";

type SaveContextSessionCheckpointOptions = {
  forceNew?: boolean;
  name?: string;
};

type UseWorkDesignContextSessionActionsParams = {
  captureContextBoardSnapshot: () => WorkDesignBoardSnapshot;
  contextBriefReadOnly: boolean;
  contextBriefFingerprint: string;
  contextBriefLockedFingerprint: string | null;
  contextBriefMetadataFingerprint: string | null;
  contextBriefSavedFingerprint: string | null;
  contextBriefSnapshotFingerprint: string | null;
  contextDecision: WorkDesignContextDecision;
  contextLoadedSessionId: string | null;
  contextOperatorNote: string;
  contextSaveSessionName: string;
  contextSavedSessions: WorkDesignContextSavedSession[];
  restoreContextBoardSnapshot: (snapshot: WorkDesignBoardSnapshot) => void;
  setApplyReceiptRecorded: Dispatch<SetStateAction<boolean>>;
  setApplyRunStartedAt: Dispatch<SetStateAction<string | null>>;
  setContextBoardCenterRequest: Dispatch<SetStateAction<number>>;
  setContextBoardRedoStack: Dispatch<SetStateAction<WorkDesignBoardSnapshot[]>>;
  setContextBoardUndoStack: Dispatch<SetStateAction<WorkDesignBoardSnapshot[]>>;
  setContextBriefAccepted: Dispatch<SetStateAction<boolean>>;
  setContextBriefLockedFingerprint: Dispatch<SetStateAction<string | null>>;
  setContextBriefMetadataFingerprint: Dispatch<SetStateAction<string | null>>;
  setContextBriefSavedFingerprint: Dispatch<SetStateAction<string | null>>;
  setContextBriefSnapshotFingerprint: Dispatch<SetStateAction<string | null>>;
  setContextDecision: Dispatch<SetStateAction<WorkDesignContextDecision>>;
  setContextLoadedSessionId: Dispatch<SetStateAction<string | null>>;
  setContextOperatorNote: Dispatch<SetStateAction<string>>;
  setContextSaveDialogOpen: Dispatch<SetStateAction<boolean>>;
  setContextSaveSessionName: Dispatch<SetStateAction<string>>;
  setContextSavedSessions: Dispatch<
    SetStateAction<WorkDesignContextSavedSession[]>
  >;
  setContextSavedSessionsModalOpen: Dispatch<SetStateAction<boolean>>;
  setHasUnsavedSessionChanges: Dispatch<SetStateAction<boolean>>;
  setDraftReviewAccepted: Dispatch<SetStateAction<boolean>>;
  setDraftValidationAccepted: Dispatch<SetStateAction<boolean>>;
};

export function useWorkDesignContextSessionActions({
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
  setHasUnsavedSessionChanges,
  setDraftReviewAccepted,
  setDraftValidationAccepted,
}: UseWorkDesignContextSessionActionsParams) {
  function saveContextSessionCheckpoint(
    options?: SaveContextSessionCheckpointOptions,
  ) {
    const forceNew = options?.forceNew ?? true;
    const existingSession = contextSavedSessions.find(
      (session) => session.fingerprint === contextBriefFingerprint,
    );

    if (existingSession && !forceNew) {
      return existingSession;
    }

    const savedAt = new Date().toISOString();
    const sequence = contextSavedSessions.length + 1;
    const sessionName =
      options?.name?.trim() || defaultWorkDesignContextSessionName(sequence);
    const session: WorkDesignContextSavedSession = {
      decision: contextDecision,
      fingerprint: contextBriefFingerprint,
      id: `context-session-${Date.now()}-${contextSavedSessions.length + 1}`,
      name: sessionName,
      note: contextOperatorNote,
      savedAt,
      sequence,
      snapshot: captureContextBoardSnapshot(),
    };

    setContextSavedSessions((sessions) => [session, ...sessions].slice(0, 8));
    setContextLoadedSessionId(session.id);
    return session;
  }

  function saveContextSession() {
    if (contextBriefReadOnly) {
      return;
    }

    setContextSaveSessionName(
      defaultWorkDesignContextSessionName(contextSavedSessions.length + 1),
    );
    setContextSaveDialogOpen(true);
  }

  function confirmSaveContextSession() {
    if (contextBriefReadOnly) {
      return;
    }

    saveContextSessionCheckpoint({
      forceNew: true,
      name: contextSaveSessionName,
    });
    setContextSaveDialogOpen(false);
    setHasUnsavedSessionChanges(false);
  }

  function loadContextSavedSession(session: WorkDesignContextSavedSession) {
    if (contextBriefReadOnly) {
      return;
    }

    restoreContextBoardSnapshot(session.snapshot);
    setContextLoadedSessionId(session.id);
    setContextDecision(session.decision);
    setContextOperatorNote(session.note);
    setContextBriefAccepted(false);
    setDraftValidationAccepted(false);
    setDraftReviewAccepted(false);
    setApplyReceiptRecorded(false);
    setApplyRunStartedAt(null);
    setContextBoardUndoStack([]);
    setContextBoardRedoStack([]);
    setContextBoardCenterRequest((request) => request + 1);
    setContextSavedSessionsModalOpen(false);
    setHasUnsavedSessionChanges(false);
  }

  function deleteContextSavedSession(session: WorkDesignContextSavedSession) {
    if (contextBriefReadOnly) {
      return;
    }

    setContextSavedSessions((sessions) =>
      sessions.filter((savedSession) => savedSession.id !== session.id),
    );

    if (contextLoadedSessionId === session.id) {
      setContextLoadedSessionId(null);
    }

    if (contextBriefSavedFingerprint === session.fingerprint) {
      setContextBriefSavedFingerprint(null);
    }

    if (contextBriefLockedFingerprint === session.fingerprint) {
      setContextBriefLockedFingerprint(null);
    }

    if (contextBriefMetadataFingerprint === session.fingerprint) {
      setContextBriefMetadataFingerprint(null);
    }

    if (contextBriefSnapshotFingerprint === session.fingerprint) {
      setContextBriefSnapshotFingerprint(null);
    }

    if (session.fingerprint === contextBriefFingerprint) {
      setContextBriefAccepted(false);
    }
  }

  return {
    confirmSaveContextSession,
    deleteContextSavedSession,
    loadContextSavedSession,
    saveContextSession,
    saveContextSessionCheckpoint,
  };
}
