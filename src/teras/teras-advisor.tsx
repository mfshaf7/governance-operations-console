"use client";

import type { FormEvent, ReactNode } from "react";
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
  fill = false,
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
  density?: "compact" | "standard";
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
          <div aria-live="polite" className={styles.advisorTerminalTranscript}>
            {transcript.map((line) => (
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
          </div>
          {prompt ? (
            <form className={styles.advisorTerminalForm} onSubmit={prompt.onSubmit}>
              <div className={styles.advisorTerminalActiveLine}>
                <span className={styles.advisorTerminalPrompt}>
                  operator@workspace:~$
                </span>
                <textarea
                  aria-label={prompt.ariaLabel}
                  className={styles.advisorTerminalInput}
                  disabled={prompt.disabled}
                  onChange={(event) => prompt.onChange(event.target.value)}
                  placeholder={prompt.placeholder}
                  readOnly={prompt.readOnly}
                  rows={prompt.rows ?? 2}
                  value={prompt.value}
                />
                <button
                  className={styles.advisorTerminalRunButton}
                  disabled={
                    prompt.disabled || prompt.readOnly || !prompt.value.trim()
                  }
                  type="submit"
                >
                  <SendHorizonal aria-hidden="true" size={14} />
                  run
                </button>
              </div>
            </form>
          ) : null}
        </div>
      )}
      {collapsed ? null : footer}
    </TerasPanel>
  );
}
