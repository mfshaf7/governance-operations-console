"use client";

import type { ReactNode } from "react";

import styles from "./teras-patterns.module.css";
import { TerasSummaryCard } from "./teras-summary-card";
import { TerasPanel } from "./teras-panel";
import type { TerasSurfaceStatusItem, TerasTone } from "./teras-types";
import { cx } from "./teras-utils";

export type TerasSurfaceSummaryMetric = {
  id: string;
  label: ReactNode;
  tone?: TerasTone;
  value: ReactNode;
};
export type TerasSurfaceSummaryDescription = {
  description: ReactNode;
  kicker: ReactNode;
};
export type TerasSurfaceSummaryUtilityAction = {
  ariaLabel: string;
  disabled?: boolean;
  icon: ReactNode;
  onClick?: () => void;
  title?: string;
};

export type TerasSurfaceSummaryHeaderProps = {
  ariaLabel: string;
  className?: string;
  description?: TerasSurfaceSummaryDescription | null;
  metricSlots?: number;
  metrics: TerasSurfaceSummaryMetric[];
  statusLabel?: ReactNode;
  statuses: TerasSurfaceStatusItem[];
  title: ReactNode;
  titleKicker?: ReactNode;
  tone?: TerasTone;
  utilityAction?: TerasSurfaceSummaryUtilityAction;
};

export function TerasSurfaceSummaryHeader({
  ariaLabel,
  className,
  description,
  metricSlots = 5,
  metrics,
  statusLabel = "Workspace Status",
  statuses,
  title,
  titleKicker = "Workspace Summary",
  tone = "warn",
  utilityAction,
}: TerasSurfaceSummaryHeaderProps) {
  const placeholderCount = Math.max(0, metricSlots - metrics.length);

  return (
    <TerasPanel
      className={cx(styles.terasSurfaceSummaryHeader, className)}
      tone={tone}
      treatment="rail"
    >
      <div className={styles.terasSurfaceSummaryTitle}>
        <span>{titleKicker}</span>
        <strong>{title}</strong>
      </div>
      <div className={styles.terasSurfaceSummaryMain}>
        <div
          aria-label={ariaLabel}
          className={styles.terasSurfaceSummaryStats}
          data-teras-surface-summary-description={
            description ? "true" : undefined
          }
          data-teras-surface-summary-empty={
            metrics.length === 0 ? "true" : undefined
          }
        >
          {description ? (
            <div className={styles.terasSurfaceSummaryDescription}>
              <span>{description.kicker}</span>
              <p>{description.description}</p>
            </div>
          ) : (
            <>
              {metrics.map((metric) => (
                <TerasSummaryCard
                  key={metric.id}
                  label={metric.label}
                  tone={metric.tone}
                  value={metric.value}
                />
              ))}
              {Array.from({ length: placeholderCount }).map((_, index) => (
                <div
                  aria-hidden="true"
                  className={styles.terasSurfaceSummaryPlaceholder}
                  data-teras-surface-summary-placeholder="true"
                  key={`workspace-summary-placeholder-${index}`}
                />
              ))}
            </>
          )}
        </div>
        <div className={styles.terasSurfaceSummaryStatusZone}>
          <span className={styles.terasSurfaceSummaryStatusTitle}>
            {statusLabel}
          </span>
          <div className={styles.terasSurfaceSummaryStatusGrid}>
            {statuses.map((status) => (
              <div
                className={styles.terasSurfaceSummaryStatusPill}
                data-tone={status.tone}
                key={status.id}
              >
                <span>{status.label}</span>
                <strong>{status.stateLabel}</strong>
              </div>
            ))}
          </div>
          {utilityAction ? (
            <button
              aria-label={utilityAction.ariaLabel}
              className={styles.terasSurfaceSummaryUtilityButton}
              disabled={utilityAction.disabled}
              onClick={utilityAction.onClick}
              title={utilityAction.title}
              type="button"
            >
              {utilityAction.icon}
            </button>
          ) : null}
        </div>
      </div>
    </TerasPanel>
  );
}
