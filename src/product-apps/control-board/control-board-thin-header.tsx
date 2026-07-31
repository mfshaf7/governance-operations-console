import type { ReactNode } from "react";

import styles from "./control-board.module.css";

export function ControlBoardThinHeader({
  actions,
  className,
  description,
  kicker,
}: {
  actions?: ReactNode;
  className?: string;
  description?: ReactNode;
  kicker: ReactNode;
}) {
  return (
    <div
      className={[styles.controlBoardThinHeader, className]
        .filter(Boolean)
        .join(" ")}
      data-has-actions={actions ? "true" : "false"}
    >
      <div className={styles.controlBoardThinHeaderText}>
        <p className={styles.controlBoardThinHeaderKicker}>{kicker}</p>
        {description ? (
          <p className={styles.controlBoardThinHeaderDescription}>
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className={styles.controlBoardThinHeaderActions}>{actions}</div>
      ) : null}
    </div>
  );
}
