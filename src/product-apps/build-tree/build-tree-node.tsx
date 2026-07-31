"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { TerasStatusPill } from "@/teras";

import styles from "./build-tree-node.module.css";

type ClassValue = string | false | null | undefined;

function classNames(...classes: ClassValue[]) {
  return classes.filter(Boolean).join(" ");
}

export function BuildTreeNodeStack({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={classNames(styles.buildTreeNodeStack, className)}>
      {children}
    </div>
  );
}

export function BuildTreeNodeChildren({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={classNames(styles.buildTreeNodeChildren, className)}>
      {children}
    </div>
  );
}

export function BuildTreeNodeToggle({
  expanded,
  label,
  onClick,
}: {
  expanded: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-expanded={expanded}
      aria-label={label}
      className={styles.buildTreeNodeToggle}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      type="button"
    >
      <ChevronDown
        aria-hidden="true"
        className={expanded ? styles.buildTreeNodeToggleOpen : ""}
      />
    </button>
  );
}

export function BuildTreeNodeCard({
  childrenCount,
  className,
  control,
  dataKind,
  description,
  indexLabel,
  kind,
  meta,
  onClick,
  selected = false,
  title,
}: {
  childrenCount?: number;
  className?: string;
  control?: ReactNode;
  dataKind?: string;
  description: ReactNode;
  indexLabel?: ReactNode;
  kind: ReactNode;
  meta?: ReactNode;
  onClick?: () => void;
  selected?: boolean;
  title: ReactNode;
}) {
  const countLabel =
    typeof childrenCount === "number"
      ? `${childrenCount} ${childrenCount === 1 ? "child" : "children"}`
      : null;
  const resolvedMeta =
    meta ??
    (countLabel ? (
      <TerasStatusPill tone={(childrenCount ?? 0) > 0 ? "info" : "muted"}>
        {countLabel}
      </TerasStatusPill>
    ) : null);
  const cardClassName = classNames(
    styles.buildTreeNode,
    selected && styles.buildTreeNodeSelected,
    className,
  );
  const content = (
    <>
      <div className={styles.buildTreeNodeSelect}>
        <span className={styles.buildTreeNodeIndex}>{indexLabel ?? "01"}</span>
        <div className={styles.buildTreeNodeText}>
          <span className={styles.buildTreeNodeKind}>{kind}</span>
          <strong>{title}</strong>
          <small>{description}</small>
        </div>
      </div>
      {resolvedMeta ? (
        <div className={styles.buildTreeNodeMeta}>{resolvedMeta}</div>
      ) : null}
      {control ? (
        <div className={styles.buildTreeNodeControl}>{control}</div>
      ) : null}
    </>
  );

  if (onClick) {
    return (
      <button
        aria-pressed={selected}
        className={cardClassName}
        data-kind={dataKind}
        onClick={onClick}
        type="button"
      >
        {content}
      </button>
    );
  }

  return (
    <article className={cardClassName} data-kind={dataKind}>
      {content}
    </article>
  );
}
