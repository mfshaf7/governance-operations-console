import type { HTMLAttributes, ReactNode } from "react";

import styles from "./teras-patterns.module.css";
import { TerasPanel } from "./teras-panel";
import type { TerasTone } from "./teras-types";
import { cx } from "./teras-utils";

type TerasHubSlot =
  | "action"
  | "history"
  | "progress"
  | "selected"
  | "status";

export function TerasHubFrame({
  className,
  history,
  primary,
  progress,
  selected,
  status,
}: {
  className?: string;
  history?: ReactNode;
  primary: ReactNode;
  progress: ReactNode;
  selected: ReactNode;
  status: ReactNode;
}) {
  return (
    <div
      className={cx(styles.terasHubFrame, className)}
      data-teras-hub-frame="true"
    >
      {selected}
      <div className={styles.terasHubGrid}>
        <div className={styles.terasHubColumn}>
          {primary}
          {status}
        </div>
        <div className={styles.terasHubColumn}>
          {progress}
          {history}
        </div>
      </div>
    </div>
  );
}

export function TerasHubPanel({
  children,
  className,
  slot,
  tone,
  ...props
}: {
  children: ReactNode;
  className?: string;
} & (
  | {
      slot: "history";
      tone?: never;
    }
  | {
      slot: Exclude<TerasHubSlot, "history">;
      tone: TerasTone;
    }
) & Omit<HTMLAttributes<HTMLElement>, "children">) {
  const sharedProps = {
    ...props,
    className: cx(styles.terasHubPanel, className),
    "data-teras-hub-slot": slot,
  };

  if (slot === "history") {
    return (
      <TerasPanel {...sharedProps} treatment="neutral">
        {children}
      </TerasPanel>
    );
  }

  return (
    <TerasPanel
      {...sharedProps}
      tone={tone}
      treatment={slot === "status" ? "state" : "rail"}
    >
      {children}
    </TerasPanel>
  );
}

export function TerasHubStepList({
  ariaLabel,
  children,
  className,
}: {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-label={ariaLabel}
      className={cx(styles.terasHubStepList, className)}
      role="group"
    >
      {children}
    </div>
  );
}
