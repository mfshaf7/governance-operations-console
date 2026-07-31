"use client";

import type { HTMLAttributes, ReactNode } from "react";

import styles from "./teras-patterns.module.css";
import {
  TerasActionButton,
  type TerasActionEmphasis,
} from "./teras-action";
import type { TerasTone } from "./teras-types";
import { cx } from "./teras-utils";

function hoverTitle(value: ReactNode) {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  return undefined;
}

export function TerasRailCard({
  actionAriaLabel,
  actionEmphasis = "primary",
  actionLabel = "Open",
  actionTone = "accent",
  className,
  detail,
  kicker,
  onOpen,
  selected = false,
  status,
  title,
  titleTreatment = "default",
  tone = "info",
  ...props
}: Omit<HTMLAttributes<HTMLElement>, "children" | "title"> & {
  actionAriaLabel?: string;
  actionEmphasis?: TerasActionEmphasis;
  actionLabel?: ReactNode;
  actionTone?: "accent" | "danger";
  className?: string;
  detail?: ReactNode;
  kicker: ReactNode;
  onOpen?: () => void;
  selected?: boolean;
  status?: ReactNode;
  title: ReactNode;
  titleTreatment?: "default" | "tray";
  tone?: TerasTone;
}) {
  const cardTitle = hoverTitle(title);
  const cardDetail = hoverTitle(detail);

  return (
    <article
      className={cx(styles.terasRailCard, className)}
      data-selected={selected}
      data-teras-rail-card="true"
      data-title-treatment={titleTreatment}
      data-tone={tone}
      {...props}
    >
      <span className={styles.terasRailCardHeader}>
        <span className={styles.terasRailCardKicker}>{kicker}</span>
        {status ? (
          <span className={styles.terasRailCardStatus}>{status}</span>
        ) : null}
      </span>
      <span className={styles.terasRailCardBody}>
        <strong className={styles.terasRailCardTitle} title={cardTitle}>
          {title}
        </strong>
        {detail ? (
          <span className={styles.terasRailCardDetail} title={cardDetail}>
            {detail}
          </span>
        ) : null}
      </span>
      {onOpen ? (
        <span className={styles.terasRailCardFooter}>
          <TerasActionButton
            aria-label={actionAriaLabel}
            className={styles.terasRailCardAction}
            emphasis={actionEmphasis}
            onClick={onOpen}
            tone={actionTone}
          >
            {actionLabel}
          </TerasActionButton>
        </span>
      ) : null}
    </article>
  );
}
