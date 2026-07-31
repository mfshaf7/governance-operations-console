"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";

import {
  ContextBoardWorkbenchView,
  type ContextBoardController,
  type ContextBoardDisposition,
} from "@/product-apps/context-board";
import { WorkDesignContextBoardRail } from "./work-design-context-board-rail.tsx";
import { WorkDesignContextBoardSources } from "./work-design-context-board-sources.tsx";
import type {
  WorkDesignAdvisorTranscriptLine,
  WorkDesignContextDecisionCopy,
  WorkDesignContextDecisionOption,
  WorkDesignContextSource,
} from "./work-design-context-board-types.ts";

type WorkDesignContextBoardViewProps = {
  applyCompleted: boolean;
  board: ContextBoardController;
  contextAdvisorPrompt: string;
  contextAdvisorTranscript: WorkDesignAdvisorTranscriptLine[];
  contextBriefAccepted: boolean;
  contextBriefDisplayTitle: string;
  contextBriefFacts: Array<{ label: string; value: string }>;
  contextBriefPanelTone: "danger" | "info" | "muted" | "ok" | "stale" | "warn";
  contextBriefState: string;
  contextBriefStatusTone: "danger" | "info" | "muted" | "ok" | "stale" | "warn";
  contextDecision: ContextBoardDisposition;
  contextDecisionCopy: WorkDesignContextDecisionCopy;
  contextDecisionOptions: WorkDesignContextDecisionOption[];
  contextSources: WorkDesignContextSource[];
  saveContextSession: () => void;
  setContextAdvisorPrompt: Dispatch<SetStateAction<string>>;
  setContextFinalizeDialogOpen: Dispatch<SetStateAction<boolean>>;
  setContextSavedSessionsModalOpen: Dispatch<SetStateAction<boolean>>;
  submitContextAdvisorPrompt: (event: FormEvent<HTMLFormElement>) => void;
  updateContextDecision: (decision: ContextBoardDisposition) => void;
};

export function WorkDesignContextBoardView({
  applyCompleted,
  board,
  contextAdvisorPrompt,
  contextAdvisorTranscript,
  contextBriefAccepted,
  contextBriefDisplayTitle,
  contextBriefFacts,
  contextBriefPanelTone,
  contextBriefState,
  contextBriefStatusTone,
  contextDecision,
  contextDecisionCopy,
  contextDecisionOptions,
  contextSources,
  saveContextSession,
  setContextAdvisorPrompt,
  setContextFinalizeDialogOpen,
  setContextSavedSessionsModalOpen,
  submitContextAdvisorPrompt,
  updateContextDecision,
}: WorkDesignContextBoardViewProps) {
  const { contextBriefReadOnly, contextBriefReady } = board;

  return (
    <ContextBoardWorkbenchView
      board={board}
      copy={{
        emptyDetail: "Start with advisor output, a template, or manual cards.",
        emptyLabel: "empty canvas",
        emptyTitle: "No diagram cards yet",
        lockDetail: applyCompleted
          ? "Apply Draft completed; the finalized brief and receipt are immutable in this pass."
          : "Use Reopen Brief in the finalized brief modal before changing the board, decision, or advisor note.",
        lockLabel: "Finalized Brief Locked",
        lockTitle: "Canvas Snapshot Is Read-Only",
        readonlySummaryDetail:
          "This locked board is the finalized brief carried into Build Tree.",
        readonlySummaryTitle: "Finalized Context Snapshot",
        stageAriaLabel: "Work design discussion board",
        summaryDetail:
          "Inspect source context, sketch options, and shape draft direction.",
        summaryTitle: "Context Brief Workspace",
        topbarDetail:
          "Inspect source context, duplicate signals, advisor context sources, and the draft direction before tree building.",
        topbarLabel: "Discussion Board",
        topbarTitle: "Context Brief Workspace",
      }}
      rail={
        <WorkDesignContextBoardRail
          applyCompleted={applyCompleted}
          contextAdvisorPrompt={contextAdvisorPrompt}
          contextAdvisorTranscript={contextAdvisorTranscript}
          contextBriefAccepted={contextBriefAccepted}
          contextBriefDisplayTitle={contextBriefDisplayTitle}
          contextBriefFacts={contextBriefFacts}
          contextBriefPanelTone={contextBriefPanelTone}
          contextBriefReadOnly={contextBriefReadOnly}
          contextBriefReady={contextBriefReady}
          contextBriefState={contextBriefState}
          contextBriefStatusTone={contextBriefStatusTone}
          contextDecision={contextDecision}
          contextDecisionCopy={contextDecisionCopy}
          contextDecisionOptions={contextDecisionOptions}
          saveContextSession={saveContextSession}
          setContextAdvisorPrompt={setContextAdvisorPrompt}
          setContextFinalizeDialogOpen={setContextFinalizeDialogOpen}
          setContextSavedSessionsModalOpen={setContextSavedSessionsModalOpen}
          submitContextAdvisorPrompt={submitContextAdvisorPrompt}
          updateContextDecision={updateContextDecision}
        />
      }
      sourceOverlay={({ collapsed, onToggle, style }) => (
        <WorkDesignContextBoardSources
          collapsed={collapsed}
          onToggle={onToggle}
          sources={contextSources}
          style={style}
        />
      )}
    />
  );
}
