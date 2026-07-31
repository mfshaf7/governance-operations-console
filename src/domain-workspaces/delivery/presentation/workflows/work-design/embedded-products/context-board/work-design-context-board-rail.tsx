import type { Dispatch, FormEvent, SetStateAction } from "react";

import styles from "@/product-apps/context-board/context-board-workbench.module.css";
import {
  TerasAdvisorPanel,
  TerasPanel,
  TerasPanelHeader,
  TerasStatusPill,
  type TerasTone,
} from "@/teras";
import type { ContextBoardDisposition } from "@/product-apps/context-board";
import type {
  WorkDesignAdvisorTranscriptLine,
  WorkDesignContextDecisionCopy,
  WorkDesignContextDecisionOption,
} from "./work-design-context-board-types.ts";

type WorkDesignContextBoardRailProps = {
  applyCompleted: boolean;
  contextAdvisorPrompt: string;
  contextAdvisorTranscript: WorkDesignAdvisorTranscriptLine[];
  contextBriefAccepted: boolean;
  contextBriefDisplayTitle: string;
  contextBriefFacts: Array<{ label: string; value: string }>;
  contextBriefPanelTone: TerasTone;
  contextBriefReadOnly: boolean;
  contextBriefReady: boolean;
  contextBriefState: string;
  contextBriefStatusTone: TerasTone;
  contextDecision: ContextBoardDisposition;
  contextDecisionCopy: WorkDesignContextDecisionCopy;
  contextDecisionOptions: WorkDesignContextDecisionOption[];
  saveContextSession: () => void;
  setContextAdvisorPrompt: Dispatch<SetStateAction<string>>;
  setContextFinalizeDialogOpen: Dispatch<SetStateAction<boolean>>;
  setContextSavedSessionsModalOpen: Dispatch<SetStateAction<boolean>>;
  submitContextAdvisorPrompt: (event: FormEvent<HTMLFormElement>) => void;
  updateContextDecision: (decision: ContextBoardDisposition) => void;
};

export function WorkDesignContextBoardRail({
  applyCompleted,
  contextAdvisorPrompt,
  contextAdvisorTranscript,
  contextBriefAccepted,
  contextBriefDisplayTitle,
  contextBriefFacts,
  contextBriefPanelTone,
  contextBriefReadOnly,
  contextBriefReady,
  contextBriefState,
  contextBriefStatusTone,
  contextDecision,
  contextDecisionCopy,
  contextDecisionOptions,
  saveContextSession,
  setContextAdvisorPrompt,
  setContextFinalizeDialogOpen,
  setContextSavedSessionsModalOpen,
  submitContextAdvisorPrompt,
  updateContextDecision,
}: WorkDesignContextBoardRailProps) {
  return (
    <aside
      className={styles.contextBoardRail}
      aria-label="Work design agent and decision rail"
    >
      <TerasPanel
        className={styles.contextBoardContextBriefPanel}
        frame="padded"
        treatment="rail"
        tone={contextBriefPanelTone}
      >
        <TerasPanelHeader
          actions={
            <div className={styles.contextBoardBriefHeaderActions}>
              <TerasStatusPill tone={contextBriefStatusTone}>
                {contextBriefState}
              </TerasStatusPill>
            </div>
          }
          kicker="Context Brief"
          title="Session Handoff"
          description="Save brainstorming sessions freely. Finalize only the version that should be consumed by the next step."
        />
        <div className={styles.contextBoardContextBriefBody}>
          <div className={styles.contextBoardBriefReadiness}>
            <div className={styles.contextBoardBriefIdentity}>
              <span>
                {contextBriefState === "stale"
                  ? "Brief Stale"
                  : contextBriefState === "loaded"
                    ? "Loaded Session"
                    : contextBriefState === "finalized"
                      ? "Brief Finalized"
                      : "Session State"}
              </span>
              <strong>{contextBriefDisplayTitle}</strong>
              <dl className={styles.contextBoardBriefFactList}>
                {contextBriefFacts.map((fact) => (
                  <div key={fact.label}>
                    <dt>{fact.label}</dt>
                    <dd>{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <button
              className={styles.contextBoardCheckpointEntryButton}
              disabled={contextBriefReadOnly}
              onClick={() => setContextSavedSessionsModalOpen(true)}
              type="button"
            >
              View Saved Sessions
            </button>
          </div>
          <div className={styles.contextBoardContextBriefActions}>
            <button
              disabled={contextBriefReadOnly}
              onClick={saveContextSession}
              type="button"
            >
              <span>Save Session</span>
            </button>
            <button
              className={styles.contextBoardContextBriefPrimaryAction}
              onClick={() => setContextFinalizeDialogOpen(true)}
              type="button"
            >
              <span>
                {contextBriefReady ? "View Finalized Brief" : "Finalize Brief"}
              </span>
            </button>
          </div>
        </div>
      </TerasPanel>

      <TerasPanel
        className={styles.contextBoardDecisionPanel}
        frame="padded"
        treatment="rail"
        tone={contextBriefAccepted ? contextDecisionCopy.tone : "warn"}
      >
        <TerasPanelHeader
          kicker="Context Decision"
          title={contextDecisionCopy.title}
          description={contextDecisionCopy.description}
        />
        <div className={styles.contextBoardDecisionList}>
          {contextDecisionOptions.map((option) => (
            <button
              aria-pressed={contextDecision === option.id}
              className={`${styles.contextBoardDecisionOption} ${
                contextDecision === option.id
                  ? styles.contextBoardDecisionOptionSelected
                  : ""
              }`}
              data-tone={option.tone}
              disabled={contextBriefReadOnly}
              key={option.id}
              onClick={() => updateContextDecision(option.id)}
              type="button"
            >
              <span>{option.label}</span>
              <small>{option.description}</small>
            </button>
          ))}
        </div>
      </TerasPanel>

      <TerasAdvisorPanel
        className={styles.contextBoardAdvisorPanel}
        density="compact"
        fill
        profileLabel="Work Design Context Advisor"
        prompt={{
          ariaLabel: "Work Design context advisor prompt",
          onChange: setContextAdvisorPrompt,
          onSubmit: submitContextAdvisorPrompt,
          placeholder: contextBriefReadOnly
            ? applyCompleted
              ? "Console locked after Apply Draft."
              : "Console locked until Reopen Brief."
            : "Ask the advisor...",
          readOnly: contextBriefReadOnly,
          rows: 1,
          value: contextAdvisorPrompt,
        }}
        statusLabel="tool-profile pending"
        statusTitle="Target profile: governed work-design reasoning model with bounded ART/OOS tool access. Mock only until authoritative profile truth reports it active."
        statusTone="warn"
        transcript={contextAdvisorTranscript}
      />
    </aside>
  );
}
