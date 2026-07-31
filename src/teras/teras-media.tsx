"use client";

import type { ReactNode } from "react";
import { useRef } from "react";

import styles from "./teras-patterns.module.css";
import {
  TerasActionButton,
  TerasActionRow,
  type TerasActionTone,
} from "./teras-action";
import { TerasContentTray } from "./teras-content-tray";
import { TerasDialog } from "./teras-dialog";
import { TerasMetadataList, type TerasMetadataItem } from "./teras-metadata";
import { TerasSectionTitle } from "./teras-subject";
import type { TerasTone } from "./teras-types";
import { cx } from "./teras-utils";

type TerasMediaSnapshotAction = {
  ariaLabel?: string;
  disabled?: boolean;
  icon?: ReactNode;
  label: ReactNode;
  onClick: () => void;
  tone?: TerasActionTone;
};

function terasMediaSnapshotActionKey(
  action: TerasMediaSnapshotAction,
  index: number,
) {
  return typeof action.label === "string"
    ? `teras-media-snapshot-action-${action.label}`
    : `teras-media-snapshot-action-${index}`;
}

function TerasMediaSnapshotActionButton({
  action,
}: {
  action: TerasMediaSnapshotAction;
}) {
  return (
    <TerasActionButton
      aria-label={action.ariaLabel}
      disabled={action.disabled}
      onClick={action.onClick}
      tone={action.tone ?? "warn"}
      treatment="tonal"
    >
      {action.icon}
      {action.label}
    </TerasActionButton>
  );
}

export function TerasMediaSnapshot({
  actions,
  className,
  density = "normal",
  facts,
  imageAlt,
  imageSrc,
  kicker,
  onPreview,
  previewAriaLabel = "View media snapshot",
  title,
}: {
  actions?: TerasMediaSnapshotAction[];
  className?: string;
  density?: "compact" | "normal";
  facts: TerasMetadataItem[];
  imageAlt: string;
  imageSrc: string;
  kicker?: ReactNode;
  onPreview: () => void;
  previewAriaLabel?: string;
  title?: ReactNode;
}) {
  const previewButton = (
    <button
      aria-label={previewAriaLabel}
      className={styles.terasMediaSnapshotPreviewButton}
      onClick={onPreview}
      type="button"
    >
      <img alt={imageAlt} src={imageSrc} />
    </button>
  );
  const factsGrid = <TerasMetadataList items={facts} />;
  const actionRow = actions?.length ? (
    <TerasActionRow
      className={styles.terasMediaSnapshotActions}
      spacing="compact"
    >
      {actions.map((action, index) => (
        <TerasMediaSnapshotActionButton
          action={action}
          key={terasMediaSnapshotActionKey(action, index)}
        />
      ))}
    </TerasActionRow>
  ) : null;

  return (
    <TerasContentTray
      className={cx(styles.terasMediaSnapshot, className)}
      data-density={density}
      kicker={kicker}
      title={title}
    >
      <div className={styles.terasMediaSnapshotGrid}>
        {density === "compact" ? (
          <>
            {previewButton}
            <div className={styles.terasMediaSnapshotContent}>{factsGrid}</div>
            {actionRow}
          </>
        ) : (
          <>
            {previewButton}
            <div className={styles.terasMediaSnapshotContent}>
              {factsGrid}
              {actionRow}
            </div>
          </>
        )}
      </div>
    </TerasContentTray>
  );
}

export function TerasMediaSnapshotViewerDialog({
  closeLabel = "Close snapshot viewer",
  description,
  exportAction,
  fullscreenLabel = "Fullscreen Viewer",
  imageAlt,
  imageSrc,
  kicker,
  onClose,
  open,
  title,
  toolbarTitle,
}: {
  closeLabel?: string;
  description?: ReactNode;
  exportAction?: TerasMediaSnapshotAction;
  fullscreenLabel?: ReactNode;
  imageAlt: string;
  imageSrc: string;
  kicker: string;
  onClose: () => void;
  open: boolean;
  title: ReactNode;
  toolbarTitle: ReactNode;
}) {
  const snapshotViewerFullscreenRef = useRef<HTMLDivElement>(null);

  function openFullscreenViewer() {
    void snapshotViewerFullscreenRef.current?.requestFullscreen?.();
  }

  return (
    <TerasDialog
      contentOverflow="hidden"
      height="fill"
      width="wide"
      actions={
        <TerasActionButton onClick={openFullscreenViewer}>
          {fullscreenLabel}
        </TerasActionButton>
      }
      closeLabel={closeLabel}
      description={description}
      kicker={kicker}
      onClose={onClose}
      open={open}
      title={title}
    >
      <div className={styles.terasMediaSnapshotViewerContent}>
        <TerasContentTray className={styles.terasMediaSnapshotViewerToolbarTray}>
          <div className={styles.terasMediaSnapshotViewerToolbarContent}>
            <TerasSectionTitle kicker={kicker} title={toolbarTitle} />
            {exportAction ? (
              <TerasActionRow spacing="none">
                <TerasMediaSnapshotActionButton action={exportAction} />
              </TerasActionRow>
            ) : null}
          </div>
        </TerasContentTray>
        <div
          className={styles.terasMediaSnapshotFullscreenCanvas}
          ref={snapshotViewerFullscreenRef}
        >
          <div className={styles.terasMediaSnapshotViewerCanvas}>
            <img alt={imageAlt} src={imageSrc} />
          </div>
        </div>
      </div>
    </TerasDialog>
  );
}
