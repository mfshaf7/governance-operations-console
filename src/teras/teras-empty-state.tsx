import type { ReactNode } from "react";

import styles from "./teras-patterns.module.css";
import { cx } from "./teras-utils";

export function TerasEmptyState({
  children,
  className,
  fill = false,
}: {
  children: ReactNode;
  className?: string;
  fill?: boolean;
}) {
  return (
    <div
      className={cx(styles.terasEmptyState, fill && styles.terasEmptyStateFill, className)}
    >
      {children}
    </div>
  );
}
