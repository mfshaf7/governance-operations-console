"use client";

import { ChevronRight, UserRound } from "lucide-react";

import type { OperatorAccountSnapshot } from "../../identity/operator-account-model";
import { projectOperatorIdentity } from "../../identity/operator-identity-projection";
import styles from "./operator-account.module.css";

export function OperatorAccountCard({
  account,
  onOpen,
}: {
  account: OperatorAccountSnapshot;
  onOpen: () => void;
}) {
  const identity = projectOperatorIdentity(account.identity);

  return (
    <button
      aria-haspopup="dialog"
      className={styles.card}
      onClick={onOpen}
      type="button"
    >
      <span className={styles.cardHeader}>
        <span className={styles.cardTitle}>
          <UserRound aria-hidden="true" size={16} />
          Operator Account
        </span>
        <span className={styles.cardStatus} data-tone={identity.tone}>
          {identity.statusLabel}
        </span>
      </span>
      <span className={styles.cardIdentity}>
        <strong>{account.profile.displayName}</strong>
        <span>
          {identity.roleSummary} / {identity.authoritySummary}
        </span>
      </span>
      <span className={styles.cardFooter}>
        <span>{identity.environmentLabel}</span>
        <span className={styles.cardOpenCue}>
          Open account
          <ChevronRight aria-hidden="true" size={14} />
        </span>
      </span>
    </button>
  );
}
