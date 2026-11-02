"use client";

import { useEffect, useState, type ReactNode } from "react";

import styles from "./teras-patterns.module.css";
import { cx } from "./teras-utils";

/** Decorative signal. The containing status or button supplies its meaning. */
export function TerasLoadingIndicator() {
  return <span aria-hidden="true" className={styles.terasLoadingSignal} data-teras-loading-signal="true"><i /><i /><i /></span>;
}

/** Only mount while a request is in flight; an empty or failed result is separate. */
export function TerasLoadingState({
  label = "Loading…",
  detail,
  inline = false,
  fill = false,
  skeleton = "rows",
}: {
  label?: string;
  detail?: ReactNode;
  inline?: boolean;
  fill?: boolean;
  skeleton?: "rows" | "details" | "none";
}) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    setSlow(false);
    const timer = window.setTimeout(() => setSlow(true), 8_000);
    return () => window.clearTimeout(timer);
  }, [label]);

  return (
    <div className={cx(styles.terasLoadingState, fill && styles.terasLoadingFill)}
      data-teras-loading={inline ? "inline" : "panel"}>
      <div className={styles.terasLoadingMessage} role="status" aria-live="polite" aria-atomic="true">
        <div className={styles.terasLoadingHeading}><TerasLoadingIndicator /><span>{label}</span></div>
        {detail ? <div className={styles.terasLoadingDetail}>{detail}</div> : null}
        {slow ? <p className={styles.terasLoadingDetail}>Still waiting for a response.</p> : null}
      </div>
      {!inline && skeleton !== "none" ? <div className={styles.terasLoadingSkeleton} data-layout={skeleton} aria-hidden="true">
        {[0, 1, 2].map(row => <div className={styles.terasLoadingRow} key={row}><span /><div><span /><span /></div><span /></div>)}
      </div> : null}
    </div>
  );
}
