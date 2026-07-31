"use client";

import type { ReactNode } from "react";

import styles from "./teras-patterns.module.css";
import { TerasStatusPill } from "./teras-status-pill";
import type { TerasDataAttributes, TerasTone } from "./teras-types";
import { cx } from "./teras-utils";

export type TerasStatusItemTreatment = "default" | "rail";

type TerasStatusItemBaseProps = TerasDataAttributes & {
  detail: ReactNode;
  index?: ReactNode;
  label: ReactNode;
  status: ReactNode;
  tone: TerasTone;
  treatment?: TerasStatusItemTreatment;
};

type TerasStaticStatusItemProps = {
  ariaLabel?: never;
  onSelect?: never;
  selected?: never;
};

type TerasInteractiveStatusItemProps = {
  ariaLabel: string;
  onSelect: () => void;
  selected?: boolean;
};

export type TerasStatusItemProps = TerasStatusItemBaseProps &
  (TerasStaticStatusItemProps | TerasInteractiveStatusItemProps);

export function TerasStatusItem({
  ariaLabel,
  detail,
  index,
  label,
  onSelect,
  selected = false,
  status,
  tone,
  treatment = "default",
  ...dataAttributes
}: TerasStatusItemProps) {
  const itemClassName = cx(
    styles.terasStatusItem,
    treatment === "rail"
      ? styles.terasStatusItemRail
      : index
        ? styles.terasStatusItemIndexed
        : styles.terasStatusItemCompact,
    onSelect && styles.terasStatusItemButton,
  );

  const content = (
    <>
      {index ? <span className={styles.terasStatusItemIndex}>{index}</span> : null}
      <span className={styles.terasStatusItemBody}>
        <strong className={styles.terasStatusItemLabel}>{label}</strong>
        <span className={styles.terasStatusItemDetail}>{detail}</span>
      </span>
      <span className={styles.terasStatusItemStatus}>
        <TerasStatusPill size="compact" tone={tone}>
          {status}
        </TerasStatusPill>
      </span>
    </>
  );

  return (
    <div className={styles.terasListItem} role="listitem">
      {onSelect ? (
        <button
          {...dataAttributes}
          aria-label={ariaLabel}
          aria-pressed={selected}
          className={itemClassName}
          data-indexed={index ? "true" : "false"}
          data-selected={selected ? "true" : "false"}
          data-tone={tone}
          data-treatment={treatment}
          onClick={onSelect}
          type="button"
        >
          {content}
        </button>
      ) : (
        <div
          {...dataAttributes}
          className={itemClassName}
          data-indexed={index ? "true" : "false"}
          data-tone={tone}
          data-treatment={treatment}
        >
          {content}
        </div>
      )}
    </div>
  );
}
