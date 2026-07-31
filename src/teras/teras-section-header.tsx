import type { ReactNode } from "react";

import styles from "./teras-patterns.module.css";
import { cx } from "./teras-utils";

export function TerasSectionHeader({
  actions,
  actionsLayout = "overlay",
  className,
  description,
  descriptionId,
  kicker,
  title,
  titleId,
}: {
  actions?: ReactNode;
  actionsLayout?: "inline" | "overlay";
  className?: string;
  description?: ReactNode;
  descriptionId?: string;
  kicker: string;
  title: ReactNode;
  titleId?: string;
}) {
  return (
    <div
      className={cx(styles.sectionHeader, className)}
      data-actions-layout={actions ? actionsLayout : undefined}
      data-has-actions={actions ? "true" : "false"}
      data-has-description={description ? "true" : "false"}
    >
      <div className={styles.sectionHeaderText}>
        <p className={styles.kicker}>{kicker}</p>
        <h3 className={styles.title} id={titleId}>
          {title}
        </h3>
        {description ? (
          <p className={styles.description} id={descriptionId}>
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className={styles.sectionHeaderActions}>{actions}</div> : null}
    </div>
  );
}
