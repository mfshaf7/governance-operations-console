import type { HTMLAttributes, ReactNode } from "react";

import styles from "./teras-patterns.module.css";
import type { TerasLayoutSpacing, TerasLayoutTopOffset } from "./teras-types";
import { cx } from "./teras-utils";

type TerasTrayStackAlign = "start" | "stretch";
type TerasTrayStackColumns = 1 | 2;
type TerasTrayStackFrame = "none" | "thin";
type TerasTrayStackScrollHeight = "medium" | "short";

export function TerasTrayStack({
  align = "stretch",
  children,
  className,
  columns = 1,
  frame = "none",
  scrollHeight,
  spacing = "normal",
  topOffset = "none",
  scroll = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  align?: TerasTrayStackAlign;
  children: ReactNode;
  columns?: TerasTrayStackColumns;
  frame?: TerasTrayStackFrame;
  scroll?: boolean;
  scrollHeight?: TerasTrayStackScrollHeight;
  spacing?: TerasLayoutSpacing;
  topOffset?: TerasLayoutTopOffset;
}) {
  return (
    <div
      {...props}
      className={cx(styles.terasTrayStack, className)}
      data-align={align}
      data-columns={columns}
      data-frame={frame}
      data-scroll={scroll || scrollHeight ? "true" : "false"}
      data-scroll-height={scrollHeight}
      data-spacing={spacing}
      data-teras-tray-stack="true"
      data-top-offset={topOffset}
    >
      {children}
    </div>
  );
}
