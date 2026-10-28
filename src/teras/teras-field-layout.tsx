import type { HTMLAttributes, ReactNode } from "react";

import styles from "./teras-patterns.module.css";
import type { TerasLayoutSpacing } from "./teras-types";
import { cx } from "./teras-utils";

export type TerasFieldGridAlign = "end" | "stretch";
export type TerasFieldGridColumns = 2 | 3;
export type TerasFieldStackFill = "last" | "middle";

export type TerasFieldGridProps = HTMLAttributes<HTMLDivElement> & {
  align?: TerasFieldGridAlign;
  children: ReactNode;
  columns?: TerasFieldGridColumns;
  spacing?: TerasLayoutSpacing;
};

export type TerasFieldStackProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  fill?: TerasFieldStackFill;
  overflow?: "auto";
  spacing?: TerasLayoutSpacing;
};

export function TerasFieldGrid({
  align = "stretch",
  children,
  className,
  columns = 2,
  spacing = "normal",
  ...props
}: TerasFieldGridProps) {
  return (
    <div
      {...props}
      className={cx(styles.terasFieldGrid, className)}
      data-align={align}
      data-columns={columns}
      data-spacing={spacing}
      data-teras-field-grid="true"
    >
      {children}
    </div>
  );
}

export function TerasFieldStack({
  children,
  className,
  fill,
  overflow,
  spacing = "normal",
  ...props
}: TerasFieldStackProps) {
  return (
    <div
      {...props}
      className={cx(styles.terasFieldStack, className)}
      data-fill={fill ?? "none"}
      data-overflow={overflow}
      data-spacing={spacing}
      data-teras-field-stack="true"
    >
      {children}
    </div>
  );
}
