"use client";

import type { ReactNode } from "react";

import styles from "./teras-patterns.module.css";
import { TerasActionRow } from "./teras-action";
import { TerasStatusPill } from "./teras-status-pill";
import type { TerasTone } from "./teras-types";
import { TerasUtilityButton } from "./teras-utility-button";
import { cx } from "./teras-utils";

export function TerasPanelCollapseActions({
  collapsed,
  collapseLabel = "Collapse",
  expandLabel = "Expand",
  onToggle,
  statusAccentRgb,
  statusLabel,
  statusTone,
}: {
  collapsed: boolean;
  collapseLabel?: ReactNode;
  expandLabel?: ReactNode;
  onToggle: () => void;
  statusAccentRgb?: string;
  statusLabel: ReactNode;
  statusTone: TerasTone;
}) {
  return (
    <TerasActionRow spacing="none">
      {collapsed ? null : (
        <TerasStatusPill
          accentRgb={statusAccentRgb}
          size="compact"
          tone={statusTone}
        >
          {statusLabel}
        </TerasStatusPill>
      )}
      <TerasUtilityButton
        aria-expanded={!collapsed}
        onClick={onToggle}
      >
        {collapsed ? expandLabel : collapseLabel}
      </TerasUtilityButton>
    </TerasActionRow>
  );
}

export function TerasPanelActionLayout({
  action,
  className,
  header,
}: {
  action: ReactNode;
  className?: string;
  header: ReactNode;
}) {
  return (
    <div
      className={cx(styles.terasPanelActionLayout, className)}
      data-teras-panel-action-layout="true"
    >
      <div>{header}</div>
      <div>{action}</div>
    </div>
  );
}
