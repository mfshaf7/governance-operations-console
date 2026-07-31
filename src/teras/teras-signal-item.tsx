"use client";

import type { ReactNode } from "react";

import styles from "./teras-patterns.module.css";
import { TerasStatusPill } from "./teras-status-pill";
import type { TerasDataAttributes, TerasTone } from "./teras-types";
import { cx } from "./teras-utils";

type TerasSignalItemBaseProps = TerasDataAttributes & {
  detail?: ReactNode;
  label: ReactNode;
  meta?: ReactNode;
  title: ReactNode;
  tone?: TerasTone;
};

type TerasInteractiveSignalItemProps = {
  actions?: never;
  actionLabel: ReactNode;
  ariaLabel: string;
  onSelect: () => void;
  statusLabel?: never;
};

type TerasStaticSignalItemProps = {
  actions?: ReactNode;
  actionLabel?: never;
  ariaLabel?: never;
  onSelect?: never;
  statusLabel?: ReactNode;
};

export type TerasSignalItemProps = TerasSignalItemBaseProps &
  (TerasInteractiveSignalItemProps | TerasStaticSignalItemProps);

export function TerasSignalItem({
  actions,
  actionLabel,
  ariaLabel,
  detail,
  label,
  meta,
  onSelect,
  statusLabel,
  title,
  tone = "info",
  ...dataAttributes
}: TerasSignalItemProps) {
  const content = (
    <>
      <span className={styles.terasSignalItemLabel}>{label}</span>
      <strong className={styles.terasSignalItemTitle}>{title}</strong>
      {detail ? <p className={styles.terasSignalItemDetail}>{detail}</p> : null}
      {meta ? <small className={styles.terasSignalItemMeta}>{meta}</small> : null}
      {actionLabel ? (
        <small className={styles.terasSignalItemActionLabel}>{actionLabel}</small>
      ) : null}
      {statusLabel ? (
        <span className={styles.terasSignalItemStatus}>
          <TerasStatusPill size="compact" tone={tone}>
            {statusLabel}
          </TerasStatusPill>
        </span>
      ) : null}
      {actions ? <div className={styles.terasSignalItemActions}>{actions}</div> : null}
    </>
  );

  return (
    <div className={styles.terasListItem} role="listitem">
      {onSelect ? (
        <button
          {...dataAttributes}
          aria-label={ariaLabel}
          className={cx(styles.terasSignalItem, styles.terasSignalItemInteractive)}
          data-has-action-label="true"
          data-tone={tone}
          onClick={onSelect}
          type="button"
        >
          {content}
        </button>
      ) : (
        <article
          {...dataAttributes}
          className={styles.terasSignalItem}
          data-has-actions={actions ? "true" : "false"}
          data-has-status={statusLabel ? "true" : "false"}
          data-tone={tone}
        >
          {content}
        </article>
      )}
    </div>
  );
}
