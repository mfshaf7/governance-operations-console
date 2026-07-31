import type { HTMLAttributes, ReactNode } from "react";

import styles from "./teras-patterns.module.css";
import { cx } from "./teras-utils";

export function TerasFullscreenSurfaceFrame({
  children,
  className,
  nav,
  summary,
  ...props
}: {
  children: ReactNode;
  className?: string;
  nav?: ReactNode;
  summary: ReactNode;
} & Omit<HTMLAttributes<HTMLDivElement>, "children">) {
  return (
    <div
      {...props}
      className={cx(styles.terasFullscreenSurfaceFrame, className)}
      data-has-nav={nav ? "true" : "false"}
      data-teras-fullscreen-surface-frame="true"
    >
      <div className={styles.terasFullscreenSurfaceFrameSummary}>{summary}</div>
      <div className={styles.terasFullscreenSurfaceFrameBody}>
        {nav ? (
          <aside className={styles.terasFullscreenSurfaceFrameRail}>{nav}</aside>
        ) : null}
        <main className={styles.terasFullscreenSurfaceFrameMain}>{children}</main>
      </div>
    </div>
  );
}
