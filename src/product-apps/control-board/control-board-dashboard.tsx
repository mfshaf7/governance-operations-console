"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

import { TerasStatusPill } from "@/teras";
import type { TerasTone } from "@/teras";

import styles from "./control-board.module.css";

type ClassValue = string | false | null | undefined;

function classNames(...classes: ClassValue[]) {
  return classes.filter(Boolean).join(" ");
}

function hoverTitle(value: ReactNode) {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  return undefined;
}

export function ControlBoardLaneRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={classNames(styles.controlBoardLaneRow, className)}>
      {children}
    </div>
  );
}

export function ControlBoardLanePanel({
  children,
  className,
  count,
  description,
  title,
  tone = "warn",
}: {
  children: ReactNode;
  className?: string;
  count: ReactNode;
  description: ReactNode;
  title: ReactNode;
  tone?: TerasTone;
}) {
  const laneTitle = hoverTitle(title);

  return (
    <section
      className={classNames(styles.controlBoardLanePanel, className)}
      data-tone={tone}
    >
      <div className={styles.controlBoardLaneHeader}>
        <div>
          <p className={styles.controlBoardLaneTitle} title={laneTitle}>
            {title}
          </p>
          <p className={styles.controlBoardLaneDescription}>{description}</p>
        </div>
        <TerasStatusPill className={styles.controlBoardLaneCount} tone={tone}>
          {count}
        </TerasStatusPill>
      </div>
      {children}
    </section>
  );
}

export function ControlBoardCard({
  children,
  className,
  detail,
  kicker,
  onClick,
  pills,
  selected = false,
  title,
  tone = "info",
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "title"> & {
  children?: ReactNode;
  className?: string;
  detail?: ReactNode;
  kicker: ReactNode;
  pills?: ReactNode;
  selected?: boolean;
  title: ReactNode;
  tone?: TerasTone;
}) {
  const cardTitle = hoverTitle(title);

  return (
    <button
      className={classNames(
        styles.controlBoardCard,
        selected && styles.controlBoardCardSelected,
        className,
      )}
      data-tone={tone}
      onClick={onClick}
      type="button"
      {...props}
    >
      <p className={styles.controlBoardCardKicker}>{kicker}</p>
      <p className={styles.controlBoardCardTitle} title={cardTitle}>
        {title}
      </p>
      {detail ? (
        <div className={styles.controlBoardCardDetail}>{detail}</div>
      ) : null}
      {children}
      {pills ? (
        <div className={styles.controlBoardCardPills}>{pills}</div>
      ) : null}
    </button>
  );
}

export function ControlBoardCardProgress({
  progressLabel,
  totalLabel,
}: {
  progressLabel: ReactNode;
  totalLabel: ReactNode;
}) {
  return (
    <>
      <span>{totalLabel}</span>
      <span>{progressLabel}</span>
    </>
  );
}

export function ControlBoardCardStack({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={classNames(styles.controlBoardCardStack, className)}>
      {children}
    </div>
  );
}
