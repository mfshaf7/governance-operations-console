import type { CSSProperties, ReactNode } from "react";

import styles from "./teras-patterns.module.css";
import type { TerasTone } from "./teras-types";
import { cx } from "./teras-utils";

function toneClass(tone: TerasTone) {
  switch (tone) {
    case "danger":
      return styles.toneDanger;
    case "muted":
      return styles.toneMuted;
    case "ok":
      return styles.toneOk;
    case "stale":
      return styles.toneStale;
    case "warn":
      return styles.toneWarn;
    case "info":
    default:
      return styles.toneInfo;
  }
}

export function TerasStatusPill({
  accentRgb,
  children,
  className,
  size = "default",
  style,
  tone = "info",
}: {
  accentRgb?: string;
  children: ReactNode;
  className?: string;
  size?: "compact" | "default";
  style?: CSSProperties;
  tone?: TerasTone;
}) {
  const resolvedStyle = accentRgb
    ? ({
        ...style,
        "--teras-accent-rgb": accentRgb,
      } as CSSProperties)
    : style;

  return (
    <span
      className={cx(
        styles.statusPill,
        toneClass(tone),
        accentRgb && styles.statusPillAccent,
        className,
      )}
      data-size={size}
      style={resolvedStyle}
    >
      {children}
    </span>
  );
}
