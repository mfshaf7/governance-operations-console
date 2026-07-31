import {
  Children,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import styles from "./teras-patterns.module.css";
import { cx } from "./teras-utils";

type TerasZoneLayoutVariant = "main-aside" | "main-support";
type TerasZoneFit = "content" | "fill";

export function TerasZoneLayout({
  children,
  className,
  variant,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  variant: TerasZoneLayoutVariant;
}) {
  return (
    <div
      {...props}
      className={cx(styles.terasZoneLayout, className)}
      data-teras-zone-layout="true"
      data-variant={variant}
    >
      {children}
    </div>
  );
}

export function TerasZone({
  children,
  className,
  fit,
  spacing = "normal",
  style,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  fit: TerasZoneFit;
  spacing?: "compact" | "normal";
}) {
  const childCount = Children.toArray(children).length;
  const rowTracks =
    fit === "fill" && childCount > 0
      ? [
          ...Array.from({ length: childCount - 1 }, () => "auto"),
          "minmax(0, 1fr)",
        ].join(" ")
      : undefined;
  const resolvedStyle = rowTracks
    ? ({ ...style, gridTemplateRows: rowTracks } as CSSProperties)
    : style;

  return (
    <div
      {...props}
      className={cx(styles.terasZone, className)}
      data-fit={fit}
      data-spacing={spacing}
      data-teras-zone="true"
      style={resolvedStyle}
    >
      {children}
    </div>
  );
}
