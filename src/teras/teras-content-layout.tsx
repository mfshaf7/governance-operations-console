import type { HTMLAttributes, ReactNode } from "react";

import styles from "./teras-patterns.module.css";
import { cx } from "./teras-utils";

type TerasContentFrameVariant = "single-region" | "standard";
type TerasContentGap = "none" | "normal";

export function TerasContentFrame({
  children,
  className,
  fill = false,
  gap = "normal",
  relative = false,
  variant,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  fill?: boolean;
  gap?: TerasContentGap;
  relative?: boolean;
  variant: TerasContentFrameVariant;
}) {
  return (
    <div
      {...props}
      className={cx(styles.terasContentFrame, className)}
      data-fill={fill ? "true" : "false"}
      data-gap={gap}
      data-relative={relative ? "true" : "false"}
      data-teras-content-frame="true"
      data-variant={variant}
    >
      {children}
    </div>
  );
}

export function TerasContentRegion({
  children,
  className,
  fill = false,
  gap = "none",
  scroll = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  fill?: boolean;
  gap?: TerasContentGap;
  scroll?: boolean;
}) {
  return (
    <div
      {...props}
      className={cx(styles.terasContentRegion, className)}
      data-fill={fill ? "true" : "false"}
      data-gap={gap}
      data-scroll={scroll ? "true" : "false"}
      data-teras-content-region="true"
    >
      {children}
    </div>
  );
}
