"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import styles from "./teras-patterns.module.css";
import { TerasActionRow } from "./teras-action";
import { TerasDialog } from "./teras-dialog";
import { TerasEmptyState } from "./teras-empty-state";
import { TerasMetadataList, type TerasMetadataItem } from "./teras-metadata";
import { TerasPanel, TerasPanelHeader } from "./teras-panel";
import type { TerasDataAttributes, TerasTone } from "./teras-types";
import { TerasUtilityButton } from "./teras-utility-button";
import { cx } from "./teras-utils";

export type TerasActivityLogEntry = {
  detail: ReactNode;
  formattedTimestamp: ReactNode;
  marker: ReactNode;
  timestamp: string;
  tone: TerasTone;
};

export type TerasActivityLogFullView = {
  actions?: ReactNode;
  closeLabel?: string;
  description?: ReactNode;
  facts?: TerasMetadataItem[];
  rows?: TerasActivityLogEntry[];
  title?: ReactNode;
};

export type TerasActivityLogDialogProps = {
  actions?: ReactNode;
  closeLabel?: string;
  description?: ReactNode;
  facts?: TerasMetadataItem[];
  kicker: string;
  onClose: () => void;
  open: boolean;
  rows: TerasActivityLogEntry[];
  title: ReactNode;
};

export type TerasActivityLogPanelProps = TerasDataAttributes & {
  description?: ReactNode;
  footerActions?: ReactNode;
  fullLog?: TerasActivityLogFullView;
  kicker?: string;
  rows: TerasActivityLogEntry[];
  statusLabel: ReactNode;
  statusTone: TerasTone;
  title: ReactNode;
  tone: TerasTone;
};

function TerasActivityLogEntryView({
  density,
  entry,
}: {
  density: "compact" | "full";
  entry: TerasActivityLogEntry;
}) {
  return (
    <div
      className={cx(
        styles.activityLogEntry,
        density === "compact"
          ? styles.activityLogEntryCompact
          : styles.activityLogEntryFull,
      )}
      data-tone={entry.tone}
    >
      <span>{entry.marker}</span>
      {density === "compact" ? (
        <div>
          <time dateTime={entry.timestamp}>{entry.formattedTimestamp}</time>
          <p>{entry.detail}</p>
        </div>
      ) : (
        <>
          <time dateTime={entry.timestamp}>{entry.formattedTimestamp}</time>
          <p>{entry.detail}</p>
        </>
      )}
    </div>
  );
}

function TerasActivityLogViewer({
  facts,
  rows,
}: {
  facts?: TerasMetadataItem[];
  rows: TerasActivityLogEntry[];
}) {
  return (
    <div className={styles.activityLogDialogContent}>
      {facts?.length ? (
        <TerasMetadataList
          className={styles.activityLogDialogFacts}
          items={facts}
        />
      ) : null}
      <div
        className={cx(
          styles.activityLogBody,
          styles.activityLogBodyReadable,
          styles.activityLogDialogBody,
        )}
      >
        {rows.map((entry, index) => (
          <TerasActivityLogEntryView
            density="full"
            entry={entry}
            key={`${entry.marker}-${entry.timestamp}-${index}`}
          />
        ))}
      </div>
    </div>
  );
}

export function TerasActivityLogDialog({
  actions,
  closeLabel = "Close full log",
  description,
  facts,
  kicker,
  onClose,
  open,
  rows,
  title,
}: TerasActivityLogDialogProps) {
  return (
    <TerasDialog
      contentOverflow="hidden"
      height="fill"
      actions={actions}
      closeLabel={closeLabel}
      description={description}
      kicker={kicker}
      onClose={onClose}
      open={open}
      title={title}
      width="large"
    >
      <TerasActivityLogViewer facts={facts} rows={rows} />
    </TerasDialog>
  );
}

export function TerasActivityLogPanel({
  description,
  footerActions,
  fullLog,
  kicker = "Execution Log",
  rows,
  statusLabel,
  statusTone,
  title,
  tone,
  ...dataAttributes
}: TerasActivityLogPanelProps) {
  const [fullLogOpen, setFullLogOpen] = useState(false);
  const hasFooterActions = Boolean(footerActions) || Boolean(fullLog);

  return (
    <>
      <div
        {...dataAttributes}
        className={styles.activityLogPanelShell}
        data-teras-activity-log-panel="true"
      >
        <TerasPanel
          className={cx(
            styles.activityLogPanel,
            hasFooterActions && styles.activityLogPanelHasFooter,
          )}
          frame="flush"
          tone={tone}
          treatment="state"
        >
          <TerasPanelHeader
            description={description}
            kicker={kicker}
            statusLabel={statusLabel}
            statusTone={statusTone}
            title={title}
          />
          {rows.length > 0 ? (
            <div
              className={cx(
                styles.activityLogBody,
                styles.activityLogBodyFill,
              )}
            >
              {rows.map((entry, index) => (
                <TerasActivityLogEntryView
                  density="compact"
                  entry={entry}
                  key={`${entry.marker}-${entry.timestamp}-${index}`}
                />
              ))}
            </div>
          ) : (
            <TerasEmptyState fill>
              No activity has been recorded.
            </TerasEmptyState>
          )}
          {hasFooterActions ? (
            <TerasActionRow
              className={styles.activityLogFooterActions}
              spacing="tight"
            >
              {footerActions}
              {fullLog ? (
                <TerasUtilityButton onClick={() => setFullLogOpen(true)}>
                  View Full Log
                </TerasUtilityButton>
              ) : null}
            </TerasActionRow>
          ) : null}
        </TerasPanel>
      </div>

      {fullLog ? (
        <TerasActivityLogDialog
          actions={fullLog.actions}
          closeLabel={fullLog.closeLabel}
          description={fullLog.description ?? description}
          facts={fullLog.facts}
          kicker={kicker}
          onClose={() => setFullLogOpen(false)}
          open={fullLogOpen}
          rows={fullLog.rows ?? rows}
          title={fullLog.title ?? title}
        />
      ) : null}
    </>
  );
}
