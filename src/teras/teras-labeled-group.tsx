"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { useId } from "react";

import styles from "./teras-patterns.module.css";
import type { TerasLayoutSpacing, TerasLayoutTopOffset } from "./teras-types";
import { cx } from "./teras-utils";

export function TerasLabeledGroup({
  actions,
  children,
  className,
  description,
  label,
  spacing = "normal",
  topOffset = "none",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  actions?: ReactNode;
  children: ReactNode;
  description?: ReactNode;
  label: ReactNode;
  spacing?: TerasLayoutSpacing;
  topOffset?: TerasLayoutTopOffset;
}) {
  const labelId = useId();

  return (
    <div
      {...props}
      aria-labelledby={props["aria-labelledby"] ?? labelId}
      className={cx(styles.terasLabeledGroup, className)}
      data-spacing={spacing}
      data-teras-labeled-group="true"
      data-top-offset={topOffset}
      role={props.role ?? "group"}
    >
      <div className={styles.terasLabeledGroupHeader}>
        <div className={styles.terasLabeledGroupText}>
          <span className={styles.terasLabeledGroupLabel} id={labelId}>
            {label}
          </span>
          {description ? (
            <p className={styles.terasLabeledGroupDescription}>
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className={styles.terasLabeledGroupActions}>{actions}</div>
        ) : null}
      </div>
      {children}
    </div>
  );
}
