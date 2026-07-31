import type { ReactNode } from "react";

import styles from "./teras-patterns.module.css";
import type { TerasTone } from "./teras-types";
import { cx } from "./teras-utils";

export function TerasSummaryCard({
  className,
  label,
  tone = "info",
  value,
  variant = "default",
}: {
  className?: string;
  label: ReactNode;
  tone?: TerasTone;
  value: ReactNode;
  variant?: "default" | "dense" | "prominent";
}) {
  return (
    <div
      className={cx(styles.terasSummaryCard, className)}
      data-teras-summary-card="true"
      data-tone={tone}
      data-variant={variant}
    >
      <div className={styles.terasSummaryCardContent}>
        <p
          className={styles.terasSummaryCardLabel}
          data-teras-summary-label="true"
        >
          {label}
        </p>
        <strong
          className={styles.terasSummaryCardValue}
          data-teras-summary-value="true"
        >
          {value}
        </strong>
      </div>
    </div>
  );
}

export function TerasSummaryCardGrid({
  children,
  className,
  columns = "auto",
  density = "default",
}: {
  children: ReactNode;
  className?: string;
  columns?: "auto" | 5;
  density?: "compact" | "default";
}) {
  return (
    <div
      className={cx(styles.terasSummaryCardGrid, className)}
      data-columns={columns}
      data-density={density}
    >
      {children}
    </div>
  );
}
