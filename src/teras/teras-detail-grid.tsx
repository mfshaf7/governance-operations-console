import type { HTMLAttributes, ReactNode } from "react";

import styles from "./teras-patterns.module.css";
import { cx } from "./teras-utils";

type TerasDetailGridVariant = "balanced" | "media";

export function TerasDetailGrid({
  children,
  className,
  scrollGutter = false,
  variant,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  scrollGutter?: boolean;
  variant: TerasDetailGridVariant;
}) {
  return (
    <div
      {...props}
      className={cx(styles.terasDetailGrid, className)}
      data-scroll-gutter={scrollGutter ? "true" : "false"}
      data-teras-detail-grid="true"
      data-variant={variant}
    >
      {children}
    </div>
  );
}
