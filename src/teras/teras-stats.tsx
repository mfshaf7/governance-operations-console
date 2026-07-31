import type { HTMLAttributes, ReactNode } from "react";

import styles from "./teras-patterns.module.css";
import type { TerasTone } from "./teras-types";
import { cx } from "./teras-utils";

type TerasStatItemElement = "article" | "div";
type TerasStatItemVariant = "default" | "plain";

export function TerasStatGroup({
  children,
  className,
  columns = 2,
  offset = "normal",
  scroll = false,
  ...props
}: {
  children: ReactNode;
  className?: string;
  columns?: 2 | 3 | 4;
  offset?: "none" | "normal";
  scroll?: boolean;
} & Omit<HTMLAttributes<HTMLDivElement>, "children">) {
  return (
    <div
      className={cx(styles.terasStatGroup, className)}
      data-columns={columns}
      data-offset={offset}
      data-scroll={scroll}
      {...props}
    >
      {children}
    </div>
  );
}

export function TerasStatItem({
  className,
  detail,
  element = "div",
  label,
  variant = "default",
  value,
}: {
  className?: string;
  detail?: ReactNode;
  element?: TerasStatItemElement;
  label: ReactNode;
  variant?: TerasStatItemVariant;
  value: ReactNode;
}) {
  const statItemClassName = cx(styles.terasStatItem, className);

  if (element === "article") {
    return (
      <article
        className={statItemClassName}
        data-teras-stat-item="true"
        data-variant={variant}
      >
        <span>{label}</span>
        <strong>{value}</strong>
        {detail ? <small>{detail}</small> : null}
      </article>
    );
  }

  return (
    <div
      className={statItemClassName}
      data-teras-stat-item="true"
      data-variant={variant}
    >
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}

export function TerasHighlightPanel({
  children,
  className,
  tone = "warn",
}: {
  children: ReactNode;
  className?: string;
  tone?: TerasTone;
}) {
  return (
    <section
      className={cx(styles.terasHighlightPanel, className)}
      data-teras-highlight-panel="true"
      data-tone={tone}
    >
      {children}
    </section>
  );
}
