import type { ReactNode } from "react";

import styles from "./teras-patterns.module.css";
import { cx } from "./teras-utils";

export function TerasCardGrid({
  children,
  className,
  columns = "auto",
}: {
  children: ReactNode;
  className?: string;
  columns?: "auto" | 5;
}) {
  return (
    <div
      className={cx(styles.terasCardGrid, className)}
      data-columns={columns}
    >
      {children}
    </div>
  );
}
