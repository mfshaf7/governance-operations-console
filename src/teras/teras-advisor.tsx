"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect } from "react";
import { TerasLoadingState } from "./teras-loading-state";
import { TerasAdvisorWaiting } from "./teras-advisor-waiting";
import {
  ChevronDown,
  LockKeyhole,
  MessageSquareText,
  SendHorizonal,
} from "lucide-react";

import styles from "./teras-patterns.module.css";
import { TerasPanel } from "./teras-panel";
import { TerasStatusPill } from "./teras-status-pill";
import type { TerasTone } from "./teras-types";
import { cx } from "./teras-utils";
import { TerasActionButton, TerasActionRow } from "./teras-action";
import { TerasTechnicalDetails } from "./teras-technical-details";
import { TerasNewConversationButton } from "./teras-new-conversation-button";
import { TerasAdvisorStatusBar, type TerasAdvisorConnection } from "./teras-advisor-status-bar";

type TerasAdvisorPromptConfig = {
  ariaLabel: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  placeholder: string;
  readOnly?: boolean;
  rows?: number;
  value: string;
};

export function TerasAdvisorPanel({
  className,
  collapsed = false,
  density = "standard",
  draftControls,
  fill = false,
  fit,
  footer,
  onToggleCollapsed,
  prompt,
  profileLabel,
  statusLabel,
  statusTitle,
  statusTone = "ok",
  transcript,
}: {
  className?: string;
  collapsed?: boolean;
  fit?: "content" | "fill";
  density?: "compact" | "standard";
  draftControls?: {
    connection?: TerasAdvisorConnection;
    busy: boolean; canUndo: boolean; onUndo: () => void; onCancel: () => void;
    waiting?: { startedAt: number; timeoutMs: number; providerBudgetMs?: number } | null;
    cancelLabel?: string;
    notice: string | null; evidenceLabel: string | null;
    supportingContext?: { label: string; choices: Array<{ id: string; label: string; selected: boolean }>; onToggle: (id: string) => void };
    history?: { transcript: Array<{ id: string; role: "operator" | "advisor"; text: string }>; status: string;
      hasEarlier: boolean; onShowEarlier: () => void; onNew: () => void | boolean | Promise<void | boolean>; onRetrySave: () => void;
      saveError: boolean; conflict: boolean; onUseServer: () => void; onKeepLocal: () => void;
      ready: boolean; draftPrompt: string; onDraftPromptChange: (value: string) => void; onUseCurrentContext: () => void };
  };
  fill?: boolean;
  footer?: ReactNode;
  onToggleCollapsed?: () => void;
  prompt?: TerasAdvisorPromptConfig;
  profileLabel: string;
  statusLabel: string;
  statusTitle?: string;
  statusTone?: TerasTone;
  transcript: Array<{
    id: string;
    role: "advisor" | "operator";
    text: string;
  }>;
}) {
  const visibleTranscript = draftControls?.history?.transcript ?? transcript;
  const hasHistoryActions = Boolean(draftControls?.history && (
    draftControls.history.hasEarlier || draftControls.history.saveError || draftControls.history.conflict
  ));
  const hasFooterSupport = Boolean(draftControls && (
    draftControls.notice || draftControls.evidenceLabel || draftControls.canUndo || hasHistoryActions
  ));
  useEffect(() => {
    if (draftControls?.history?.ready && draftControls.history.draftPrompt && prompt && !prompt.value && !prompt.disabled && !prompt.readOnly)
      prompt.onChange(draftControls.history.draftPrompt);
    // Restore only into an empty composer. Keystrokes save through onChange below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftControls?.history?.ready, draftControls?.history?.draftPrompt, prompt?.disabled, prompt?.readOnly]);
  return (
    <TerasPanel
      className={cx(
        styles.advisorPanel,
        density === "compact" && styles.advisorPanelCompact,
        fill && styles.advisorPanelFill,
        collapsed && styles.advisorPanelCollapsed,
        className,
      )}
      frame="flush"
      fit={fit}
      treatment="neutral"
    >
      <div className={styles.advisorHeader}>
        <div className={styles.advisorTitleWrap}>
          <span className={styles.advisorIcon}>
            <MessageSquareText aria-hidden="true" size={16} />
          </span>
          <div className={styles.advisorTitleText}>
            <p>Agent Console</p>
            <strong>{profileLabel}</strong>
          </div>
        </div>
        <div className={styles.advisorStatusGroup}>
          <span
            aria-label="Locked to current context"
            className={styles.advisorLockPill}
            title="Locked to current context"
          >
            <LockKeyhole aria-hidden="true" size={11} />
          </span>
          <span title={statusTitle}>
            <TerasStatusPill tone={statusTone}>{statusLabel}</TerasStatusPill>
          </span>
          {onToggleCollapsed ? (
            <button
              aria-expanded={!collapsed}
              className={styles.advisorToggleButton}
              onClick={onToggleCollapsed}
              title={collapsed ? "Expand advisor" : "Collapse advisor"}
              type="button"
            >
              <ChevronDown
                aria-hidden="true"
                className={collapsed ? "" : styles.advisorToggleButtonOpen}
                size={13}
              />
              {collapsed ? "Expand" : "Collapse"}
            </button>
          ) : null}
        </div>
      </div>
      {collapsed ? null : (
        <div
          className={styles.advisorTerminalShell}
          data-has-prompt={prompt ? "true" : "false"}
        >
          <TerasAdvisorStatusBar connection={draftControls?.connection}
            actions={draftControls?.history ? <TerasNewConversationButton
              disabled={draftControls.busy || !draftControls.history.ready}
              onClick={async () => { if (await draftControls.history!.onNew() !== false) prompt?.onChange(""); }} /> : undefined}
            conversationStatus={draftControls?.history?.status ?? "Conversation not selected"} />
          <div aria-live="polite" className={styles.advisorTerminalTranscript}>
            {draftControls?.supportingContext?.choices.length ? <TerasTechnicalDetails summary={`${draftControls.supportingContext.label} · ${draftControls.supportingContext.choices.filter(choice => choice.selected).length} included`}
              items={draftControls.supportingContext.choices.map(choice => ({ label: choice.label, value: <label><input type="checkbox" aria-label={`Use ${choice.label} as read-only context`} checked={choice.selected} disabled={draftControls.busy} onChange={() => draftControls.supportingContext!.onToggle(choice.id)} /> Read only</label> }))} /> : null}
            {visibleTranscript.map((line) => (
              <div
                className={styles.advisorTerminalEntry}
                data-role={line.role}
                key={line.id}
              >
                {line.role === "operator" ? (
                  <>
                    <span className={styles.advisorTerminalPrompt}>
                      operator@workspace:~$
                    </span>
                    <span className={styles.advisorTerminalCommand}>{line.text}</span>
                  </>
                ) : (
                  <>
                    <span className={styles.advisorTerminalSpeaker}>
                      agent[context]
                    </span>
                    <pre>{line.text}</pre>
                  </>
                )}
              </div>
            ))}
            {draftControls?.busy ? draftControls.waiting
              ? <TerasAdvisorWaiting {...draftControls.waiting} />
              : <TerasLoadingState inline label="Preparing response…" /> : null}
          </div>
          {prompt ? (
            <form className={styles.advisorTerminalForm} onSubmit={(event) => {
              if (draftControls?.history && !draftControls.history.ready) { event.preventDefault(); return; }
              prompt.onSubmit?.(event);
            }}>
              <div className={styles.advisorTerminalActiveLine}>
                <span className={styles.advisorTerminalPrompt}>
                  operator@workspace:~$
                </span>
                <textarea
                  aria-label={prompt.ariaLabel}
                  className={styles.advisorTerminalInput}
                  disabled={prompt.disabled || draftControls?.busy}
                  onChange={(event) => { prompt.onChange(event.target.value); draftControls?.history?.onDraftPromptChange(event.target.value); }}
                  placeholder={prompt.placeholder}
                  readOnly={prompt.readOnly}
                  rows={prompt.rows ?? 2}
                  value={prompt.value}
                />
                <button
                  className={styles.advisorTerminalRunButton}
                  disabled={
                    prompt.disabled || prompt.readOnly || (!draftControls?.busy && (!prompt.value.trim() || draftControls?.history && !draftControls.history.ready))
                  }
                  type={draftControls?.busy ? "button" : "submit"}
                  onClick={draftControls?.busy ? (event) => {
                    // Stopping may synchronously turn this back into a submit
                    // button. Cancel the original click's form default first.
                    event.preventDefault(); draftControls.onCancel();
                  } : undefined}
                >
                  <SendHorizonal aria-hidden="true" size={14} />
                  {draftControls?.busy ? draftControls.cancelLabel ?? "cancel" : "run"}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      )}
      {collapsed ? null : footer}
      {collapsed || !draftControls || !hasFooterSupport ? null : (
        <div aria-live="polite" className={styles.advisorFeedback}>
          {draftControls.notice || draftControls.canUndo ? <div className={styles.advisorFeedbackPrimary}>
            {draftControls.notice ? <p>{draftControls.notice}</p> : null}
            {draftControls.canUndo ? <TerasActionButton size="table-compact" disabled={draftControls.busy} onClick={draftControls.onUndo} emphasis="secondary">Undo advisor edit</TerasActionButton> : null}
          </div> : null}
          {draftControls.evidenceLabel ? <small>{draftControls.evidenceLabel}</small> : null}
          {hasHistoryActions ? <TerasActionRow spacing="compact">
            {draftControls.history ? <>
              {draftControls.history.hasEarlier ? <TerasActionButton emphasis="secondary" onClick={draftControls.history.onShowEarlier}>Earlier messages</TerasActionButton> : null}
              {draftControls.history.saveError && !draftControls.history.conflict ? <TerasActionButton disabled={draftControls.busy} emphasis="secondary" onClick={draftControls.history.onRetrySave}>Retry conversation save</TerasActionButton> : null}
              {!draftControls.history.ready && draftControls.history.saveError ? <TerasActionButton emphasis="secondary" onClick={draftControls.history.onUseCurrentContext}>Use current context only</TerasActionButton> : null}
              {draftControls.history.conflict ? <><TerasActionButton disabled={draftControls.busy} emphasis="secondary" onClick={draftControls.history.onUseServer}>Use server conversation</TerasActionButton><TerasActionButton disabled={draftControls.busy} emphasis="secondary" onClick={draftControls.history.onKeepLocal}>Keep browser conversation</TerasActionButton></> : null}
            </> : null}
          </TerasActionRow> : null}
        </div>
      )}
    </TerasPanel>
  );
}
