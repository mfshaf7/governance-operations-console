import type { ReactNode } from "react";

import styles from "./teras-patterns.module.css";
import type { TerasDataAttributes } from "./teras-types";

export type TerasListColumns = 1 | 2;
export type TerasListFit = "content" | "fill";
export type TerasListFrame = "contained" | "none";
export type TerasListScrollHeight = "medium" | "short";

export type TerasListProps = TerasDataAttributes & {
  ariaLabel?: string;
  children: ReactNode;
  columns?: TerasListColumns;
  fit?: TerasListFit;
  frame?: TerasListFrame;
  scrollHeight?: TerasListScrollHeight;
};

export function TerasList({
  ariaLabel,
  children,
  columns = 1,
  fit = "content",
  frame = "none",
  scrollHeight,
  ...dataAttributes
}: TerasListProps) {
  return (
    <div
      {...dataAttributes}
      aria-label={ariaLabel}
      className={styles.terasList}
      data-columns={columns}
      data-fit={fit}
      data-frame={frame}
      data-scroll-height={scrollHeight}
      data-teras-list="true"
      role="list"
    >
      {children}
    </div>
  );
}
