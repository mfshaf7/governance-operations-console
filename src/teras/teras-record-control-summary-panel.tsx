"use client";

import { useState } from "react";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

import styles from "./teras-patterns.module.css";
import { TerasSummaryCard } from "./teras-summary-card";
import {
  TerasPanel,
  TerasPanelHeader,
} from "./teras-panel";
import { TerasStatusDetailDialog } from "./teras-status-detail-dialog";
import type { TerasTone, TerasSurfaceStatusModel } from "./teras-types";
import { cx } from "./teras-utils";

export type TerasRecordControlSummaryMetric = {
  id: string;
  label: ReactNode;
  tone?: TerasTone;
  value: ReactNode;
};

export type TerasRecordControlSummaryPanelProps = {
  className?: string;
  description: ReactNode;
  kicker: string;
  metrics: TerasRecordControlSummaryMetric[];
  statusButtonAttribute?: string;
  title: ReactNode;
  surfaceStatus: TerasSurfaceStatusModel;
} & Omit<HTMLAttributes<HTMLElement>, "children" | "title">;

function recordControlStatusSignalToneClass(tone: TerasTone) {
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

function RecordControlStatusSignalButton({
  "aria-label": ariaLabel,
  className,
  current = false,
  label,
  onSelect,
  stateLabel,
  tone = "info",
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "type"> & {
  "aria-label": string;
  current?: boolean;
  label: ReactNode;
  onSelect: () => void;
  stateLabel: ReactNode;
  tone?: TerasTone;
}) {
  return (
    <button
      aria-label={ariaLabel}
      aria-pressed={current}
      className={cx(
        styles.statusSignalButton,
        recordControlStatusSignalToneClass(tone),
        className,
      )}
      data-current={current ? "true" : "false"}
      data-teras-status-signal-button="true"
      onClick={onSelect}
      type="button"
      {...props}
    >
      <span>{label}</span>
      <strong>{stateLabel}</strong>
    </button>
  );
}

export function TerasRecordControlSummaryPanel({
  className,
  description,
  kicker,
  metrics,
  statusButtonAttribute,
  title,
  surfaceStatus,
  ...props
}: TerasRecordControlSummaryPanelProps) {
  const [activeStatusId, setActiveStatusId] = useState<string | null>(null);
  const activeStatus =
    surfaceStatus.items.find((status) => status.id === activeStatusId) ??
    null;

  return (
    <>
      <TerasPanel
        {...props}
        className={cx(styles.terasRecordControlSummaryPanel, className)}
        data-teras-record-control-summary-panel="true"
        tone={surfaceStatus.tone}
        treatment="rail"
      >
        <TerasPanelHeader
          actions={
            <div
              aria-label={surfaceStatus.ariaLabel}
              className={styles.terasRecordControlStatusPillRow}
            >
              {surfaceStatus.items.map((status) => (
                <RecordControlStatusSignalButton
                  aria-label={`Open ${status.label} status details`}
                  current={activeStatusId === status.id}
                  data-teras-surface-status-signal={status.id}
                  key={status.id}
                  label={status.label}
                  onSelect={() => setActiveStatusId(status.id)}
                  stateLabel={status.stateLabel}
                  tone={status.tone}
                  {...(statusButtonAttribute
                    ? { [statusButtonAttribute]: String(status.label) }
                    : {})}
                />
              ))}
            </div>
          }
          actionsLayout="inline"
          description={description}
          kicker={kicker}
          title={title}
        />

        <div className={styles.terasRecordControlSummaryGrid}>
          {metrics.map((metric) => (
            <TerasSummaryCard
              key={metric.id}
              label={metric.label}
              tone={metric.tone}
              value={metric.value}
              variant="prominent"
            />
          ))}
        </div>
      </TerasPanel>

      <TerasStatusDetailDialog
        activeStatus={activeStatus}
        model={surfaceStatus}
        onClose={() => setActiveStatusId(null)}
      />
    </>
  );
}
