import type { ReactNode } from "react";

import styles from "./teras-patterns.module.css";
import { TerasStatusPill } from "./teras-status-pill";
import type { TerasDataAttributes, TerasTone } from "./teras-types";

export type TerasTimelineItemProps = TerasDataAttributes & {
  detail: ReactNode;
  displayTimestamp: ReactNode;
  label: ReactNode;
  status: ReactNode;
  timestamp: string;
  tone: TerasTone;
};

export type TerasTimelineProps = TerasDataAttributes & {
  ariaLabel?: string;
  children: ReactNode;
};

export function TerasTimelineItem({
  detail,
  displayTimestamp,
  label,
  status,
  timestamp,
  tone,
  ...dataAttributes
}: TerasTimelineItemProps) {
  return (
    <li
      {...dataAttributes}
      className={styles.terasTimelineItem}
      data-tone={tone}
    >
      <div>
        <time dateTime={timestamp}>{displayTimestamp}</time>
        <TerasStatusPill tone={tone}>{status}</TerasStatusPill>
      </div>
      <section>
        <strong>{label}</strong>
        <p>{detail}</p>
      </section>
    </li>
  );
}

export function TerasTimeline({
  ariaLabel,
  children,
  ...dataAttributes
}: TerasTimelineProps) {
  return (
    <ol
      {...dataAttributes}
      aria-label={ariaLabel}
      className={styles.terasTimeline}
      data-teras-timeline="true"
    >
      {children}
    </ol>
  );
}
