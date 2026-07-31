import {
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import styles from "./teras-patterns.module.css";
import { TerasBasePanel } from "./teras-panel-base";
import { terasPanelStackChildren } from "./teras-panel-stack-children";
import { TerasSectionHeader } from "./teras-section-header";
import { TerasStatusPill } from "./teras-status-pill";
import type { TerasTone } from "./teras-types";
import { cx } from "./teras-utils";

export type TerasPanelFrame = "flush" | "padded";
export type TerasPanelFit = "content" | "fill";
type TerasPanelLayout =
  | "header-body"
  | "header-body-footer"
  | "header-toolbar-body";
type TerasPanelDensity = "compact" | "comfortable" | "normal";
type TerasPanelOverflow = "auto" | "hidden" | "visible";
type TerasPanelSpacing = "compact" | "loose" | "normal" | "tight";
type TerasPanelStackPosition = "first" | "last" | "middle";

type TerasPanelCommonProps = {
  children: ReactNode;
  className?: string;
  collapsed?: boolean;
  density?: TerasPanelDensity;
  fit?: TerasPanelFit;
  frame?: TerasPanelFrame;
  layout?: TerasPanelLayout;
  overflow?: TerasPanelOverflow;
  spacing?: TerasPanelSpacing;
};

type TerasPanelNeutralTreatment = {
  accentRgb?: never;
  tone?: never;
  treatment?: "neutral";
};

type TerasPanelEmphasizedTreatment = {
  accentRgb?: string;
  tone: TerasTone;
  treatment: "rail" | "state";
};

export type TerasPanelProps = TerasPanelCommonProps &
  (TerasPanelNeutralTreatment | TerasPanelEmphasizedTreatment) &
  Omit<HTMLAttributes<HTMLElement>, "children">;

function panelToneClass(tone: TerasTone) {
  switch (tone) {
    case "danger":
      return styles.panelDanger;
    case "muted":
      return styles.panelMuted;
    case "ok":
      return styles.panelOk;
    case "stale":
      return styles.panelStale;
    case "warn":
      return styles.panelWarn;
    case "info":
    default:
      return styles.panelInfo;
  }
}

export function TerasPanel({
  accentRgb,
  children,
  className,
  collapsed = false,
  density,
  fit,
  frame = "padded",
  layout,
  overflow,
  spacing,
  style,
  tone,
  treatment = "neutral",
  ...props
}: TerasPanelProps) {
  const resolvedStyle = accentRgb
    ? ({
        ...style,
        "--panel-rgb": accentRgb,
      } as CSSProperties)
    : style;

  return (
    <TerasBasePanel
      className={cx(
        styles.terasPanel,
        frame === "padded" && styles.terasPanelFramePadded,
        treatment === "state" && styles.terasPanelTreatmentState,
        treatment === "rail" && styles.terasPanelTreatmentRail,
        tone && panelToneClass(tone),
        className,
      )}
      data-collapsed={collapsed ? "true" : "false"}
      data-density={density}
      data-fit={fit}
      data-frame={frame}
      data-layout={layout}
      data-overflow={overflow}
      data-spacing={spacing}
      data-treatment={treatment}
      style={resolvedStyle}
      {...props}
    >
      {children}
    </TerasBasePanel>
  );
}

export function TerasPanelHeader({
  actions,
  actionsLayout,
  className,
  description,
  kicker,
  statusLabel,
  statusTone = "info",
  title,
  titleOverflow = "default",
}: {
  actions?: ReactNode;
  actionsLayout?: "inline" | "overlay";
  className?: string;
  description?: ReactNode;
  kicker: string;
  statusLabel?: ReactNode;
  statusTone?: TerasTone;
  title: ReactNode;
  titleOverflow?: "default" | "tooltip";
}) {
  const resolvedActions =
    actions ??
    (statusLabel ? (
      <TerasStatusPill tone={statusTone}>{statusLabel}</TerasStatusPill>
    ) : undefined);
  const resolvedActionsLayout =
    actionsLayout ?? (!actions && statusLabel ? "inline" : undefined);
  const resolvedTitle =
    titleOverflow === "tooltip" ? (
      <span
        className={styles.terasPanelHeaderTitleOverflow}
        title={typeof title === "string" ? title : undefined}
      >
        {title}
      </span>
    ) : (
      title
    );

  return (
    <TerasSectionHeader
      actions={resolvedActions}
      actionsLayout={resolvedActionsLayout}
      className={className}
      description={description}
      kicker={kicker}
      title={resolvedTitle}
    />
  );
}

export function TerasPanelStack({
  bounded,
  children,
  className,
  fill,
}: {
  bounded?: TerasPanelStackPosition;
  children: ReactNode;
  className?: string;
  fill: TerasPanelStackPosition;
}) {
  const panelChildren = terasPanelStackChildren(children);
  const childCount = panelChildren.length;
  const fillIndex =
    fill === "first"
      ? 0
      : fill === "middle"
        ? Math.floor(childCount / 2)
        : Math.max(0, childCount - 1);
  const rowTracks = Array.from(
    { length: childCount },
    (_, index) => (index === fillIndex ? "minmax(0, 1fr)" : "auto"),
  ).join(" ");

  return (
    <div
      className={cx(styles.terasPanelStack, className)}
      data-bounded={bounded}
      data-fill={fill}
      data-teras-panel-stack="true"
      style={{ gridTemplateRows: rowTracks }}
    >
      {panelChildren}
    </div>
  );
}
