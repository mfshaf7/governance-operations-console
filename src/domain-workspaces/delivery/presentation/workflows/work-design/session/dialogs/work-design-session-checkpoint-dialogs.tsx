"use client";

import { formatWorkDesignDateTime } from "../../view-model/work-design-display-formatters.ts";
import { workDesignSavedSessionSummary } from "../../artifacts/context-brief/index.ts";
import {
  TerasActionButton,
  TerasActionRow,
  TerasDialog,
  TerasEmptyState,
  TerasList,
  TerasSignalItem,
  TerasTextField,
} from "@/teras";
import { workDesignContextDecisionCopy } from "../../view-model/work-design-context-decision-model.ts";
import type { WorkDesignContextSavedSession } from "../../model/work-design-model.ts";

type WorkDesignSaveSessionDialogProps = {
  contextSaveSessionName: string;
  onChangeSessionName: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  open: boolean;
};

export function WorkDesignSaveSessionDialog({
  contextSaveSessionName,
  onChangeSessionName,
  onClose,
  onConfirm,
  open,
}: WorkDesignSaveSessionDialogProps) {
  return (
    <TerasDialog
      contentOverflow="auto"
      height="content"
      width="compact"
      actions={
        <>
          <TerasActionButton onClick={onClose} emphasis="secondary">
            Cancel
          </TerasActionButton>
          <TerasActionButton
            disabled={!contextSaveSessionName.trim()}
            onClick={onConfirm}
          >
            Save Session
          </TerasActionButton>
        </>
      }
      closeLabel="Close save session dialog"
      description="Give this checkpoint a name so it can be recognized when you return to the saved-session list."
      kicker="Save Session"
      onClose={onClose}
      open={open}
      title="Name This Session"
    >
      <TerasTextField
        autoFocus
        label="Session Name"
        onValueChange={onChangeSessionName}
        placeholder="Example: duplicate-scope brainstorming"
        value={contextSaveSessionName}
      />
    </TerasDialog>
  );
}

type WorkDesignSavedSessionsDialogProps = {
  contextBriefReadOnly: boolean;
  contextBriefFingerprint: string | null;
  contextLoadedSessionId: string | null;
  contextSavedSessions: WorkDesignContextSavedSession[];
  onClose: () => void;
  onDeleteSession: (session: WorkDesignContextSavedSession) => void;
  onLoadSession: (session: WorkDesignContextSavedSession) => void;
  open: boolean;
};

export function WorkDesignSavedSessionsDialog({
  contextBriefReadOnly,
  contextBriefFingerprint,
  contextLoadedSessionId,
  contextSavedSessions,
  onClose,
  onDeleteSession,
  onLoadSession,
  open,
}: WorkDesignSavedSessionsDialogProps) {
  return (
    <TerasDialog
      contentOverflow="auto"
      height="content"
      width="standard"
      closeLabel="Close saved sessions"
      description="Load a named checkpoint without crowding the active context brief."
      kicker="Saved Sessions"
      onClose={onClose}
      open={open}
      title="Session Library"
    >
      {contextSavedSessions.length > 0 ? (
        <TerasList
          ariaLabel="Saved context brief checkpoints"
          frame="contained"
          scrollHeight="medium"
        >
          {contextSavedSessions.map((session) => {
            const sessionLoaded = session.id === contextLoadedSessionId;
            const sessionCurrent =
              sessionLoaded && session.fingerprint === contextBriefFingerprint;

            return (
              <TerasSignalItem
                actions={
                  <TerasActionRow spacing="tight">
                    <TerasActionButton
                      disabled={contextBriefReadOnly}
                      emphasis="secondary"
                      onClick={() => onLoadSession(session)}
                      size="table-compact"
                    >
                      {sessionCurrent ? "Reload" : "Load"}
                    </TerasActionButton>
                    <TerasActionButton
                      disabled={contextBriefReadOnly}
                      emphasis="primary"
                      onClick={() => onDeleteSession(session)}
                      size="table-compact"
                      tone="danger"
                    >
                      Delete
                    </TerasActionButton>
                  </TerasActionRow>
                }
                detail={
                  <>
                    {workDesignContextDecisionCopy(session.decision).label} /{" "}
                    {workDesignSavedSessionSummary(session)}
                  </>
                }
                key={session.id}
                label={
                  sessionCurrent
                    ? "Current checkpoint"
                    : sessionLoaded
                      ? "Loaded checkpoint"
                      : "Saved checkpoint"
                }
                meta={formatWorkDesignDateTime(session.savedAt)}
                title={session.name}
                tone={sessionLoaded ? "info" : "muted"}
              />
            );
          })}
        </TerasList>
      ) : (
        <TerasEmptyState>
          No saved sessions yet. Use Save Session to keep separate brainstorming
          checkpoints.
        </TerasEmptyState>
      )}
    </TerasDialog>
  );
}
