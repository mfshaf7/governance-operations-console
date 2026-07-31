import type { HTMLAttributes, ReactNode } from "react";

import styles from "./teras-patterns.module.css";
import { cx } from "./teras-utils";

export function TerasBasePanel({
  children,
  className,
  ...props
}: {
  children: ReactNode;
  className?: string;
} & Omit<HTMLAttributes<HTMLElement>, "children">) {
  return (
    <section className={cx(styles.panel, className)} {...props}>
      {children}
    </section>
  );
}
