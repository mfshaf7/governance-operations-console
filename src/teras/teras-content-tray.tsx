import type { HTMLAttributes, ReactNode } from "react";

import styles from "./teras-patterns.module.css";
import { cx } from "./teras-utils";

export function TerasContentTray({
  actions,
  children,
  className,
  description,
  fit = "content",
  kicker,
  title,
  tone = "default",
  ...props
}: {
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  description?: ReactNode;
  fit?: "content" | "fill";
  kicker?: ReactNode;
  title?: ReactNode;
  tone?: "default" | "muted";
} & Omit<HTMLAttributes<HTMLElement>, "children" | "title">) {
  return (
    <section
      className={cx(styles.terasContentTray, className)}
      data-fit={fit}
      data-tone={tone}
      {...props}
    >
      {kicker ? <p className={styles.terasContentTrayKicker}>{kicker}</p> : null}
      {title || actions ? (
        <div className={styles.terasContentTrayHeader}>
          {title ? <h4 className={styles.terasContentTrayTitle}>{title}</h4> : null}
          {actions ? (
            <div className={styles.terasContentTrayActions}>{actions}</div>
          ) : null}
        </div>
      ) : null}
      {description ? (
        <p className={styles.terasContentTrayDescription}>{description}</p>
      ) : null}
      {children ? <div className={styles.terasContentTrayBody}>{children}</div> : null}
    </section>
  );
}
