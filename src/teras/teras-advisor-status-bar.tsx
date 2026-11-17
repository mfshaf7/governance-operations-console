import type { ReactNode } from "react";
import { TerasLoadingIndicator } from "./teras-loading-state";
import styles from "./teras-patterns.module.css";

export type TerasAdvisorConnection = {
  state: "online" | "offline" | "checking" | "stale" | "unavailable";
  label: string;
  description: string;
};

export function TerasAdvisorStatusBar({ actions, connection, conversationStatus }: {
  actions?: ReactNode;
  connection?: TerasAdvisorConnection;
  conversationStatus: string;
}) {
  const status = connection ?? {
    state: "checking", label: "Checking",
    description: "Assistant connection has not been checked. The selected model is checked when you send a request.",
  };
  return <div className={styles.advisorStatusBar} data-agent-status-bar>
    <div className={styles.advisorStatusLine} data-has-actions={actions ? "true" : undefined}>
      <span className={styles.advisorConnection} data-state={status.state}
        role="status" aria-label={`Assistant connection: ${status.label}`} title={status.description}>
        {status.state === "checking" ? <span className={styles.advisorConnectionSpinner}><TerasLoadingIndicator /></span> : null}
        <span className={styles.advisorConnectionDot} aria-hidden="true" />
        <span className={styles.advisorConnectionLabel} aria-hidden="true">{status.label}</span>
      </span>
      <span className={styles.advisorConversationStatus} role="status"
        aria-label="Conversation save status" title={conversationStatus}>
        Conversation · {conversationStatus}
      </span>
      {actions ? <div className={styles.advisorStatusActions}>{actions}</div> : null}
    </div>
  </div>;
}
