"use client";

import type { CSSProperties, MouseEvent, PointerEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TerasLoadingIndicator } from "./teras-loading-state";

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

function useSnapshotOverlayVisibility() {
  const [suppressed, setSuppressed] = useState(false);
  const reveal = () => setSuppressed(false);
  return {
    "data-controls-suppressed": suppressed,
    onPointerEnter: reveal,
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
      if (event.movementX || event.movementY) reveal();
    },
    onFocusCapture: reveal,
    onKeyDownCapture: reveal,
    onClickCapture: (event: MouseEvent<HTMLDivElement>) => {
      const button = event.target instanceof Element
        ? event.target.closest('[aria-label="Diagram navigation"] button') : null;
      if (button instanceof HTMLButtonElement && !button.disabled) setSuppressed(true);
    },
  };
}

function SnapshotImage({ src, alt, style }: { src: string; alt: string; style?: CSSProperties }) {
  const image = useRef<HTMLImageElement>(null);
  const [observation, setObservation] = useState<{ src: string; state: "ready" | "error" } | null>(null);
  const state = observation?.src === src ? observation.state : "loading";
  useEffect(() => {
    // A cached image may finish before hydration attaches its load handler.
    if (image.current?.complete) setObservation({ src, state: image.current.naturalWidth ? "ready" : "error" });
  }, [src]);
  return <>
    <img ref={image} alt={alt} src={src} style={style} data-teras-media-state={state}
      onLoad={() => setObservation({ src, state: "ready" })} onError={() => setObservation({ src, state: "error" })} />
    {state !== "ready" ? <span className={styles.terasMediaWait} role="status">
      {state === "loading" ? <><TerasLoadingIndicator />Loading snapshot…</> : "Snapshot could not load."}
    </span> : null}
  </>;
}

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

export function TerasMediaSnapshotNavigation({
  index, total, title, onSelect,
}: { index: number; total: number; title: string; onSelect: (index: number) => void }) {
  if (total < 2) return null;
  return (
    <div className={styles.terasMediaSnapshotNavigation} role="group" aria-label="Diagram navigation">
      <TerasActionButton aria-label="Previous diagram" title="Previous diagram" size="table-compact"
        disabled={index === 0} onClick={() => onSelect(index - 1)} treatment="tonal">
        <ChevronLeft aria-hidden="true" size={16} />
      </TerasActionButton>
      <span title={title}>{title}</span>
      <TerasActionButton aria-label="Next diagram" title="Next diagram" size="table-compact"
        disabled={index === total - 1} onClick={() => onSelect(index + 1)} treatment="tonal">
        <ChevronRight aria-hidden="true" size={16} />
      </TerasActionButton>
    </div>
  );
}

export function TerasMediaSnapshot({
  previewDisabled = false,
  actions,
  className,
  density = "normal",
  fit = "content",
  facts,
  imageAlt,
  imageSrc,
  kicker,
  onPreview,
  previewAriaLabel = "View media snapshot",
  previewOverlay,
  title,
}: {
  previewDisabled?: boolean;
  actions?: TerasMediaSnapshotAction[];
  className?: string;
  density?: "compact" | "normal";
  fit?: "content" | "fill";
  facts: TerasMetadataItem[];
  imageAlt: string;
  imageSrc: string;
  kicker?: ReactNode;
  onPreview: () => void;
  previewAriaLabel?: string;
  previewOverlay?: ReactNode;
  title?: ReactNode;
}) {
  const overlayVisibility = useSnapshotOverlayVisibility();
  const previewButton = (
    <button
      aria-label={previewAriaLabel}
      className={styles.terasMediaSnapshotPreviewButton}
      onClick={onPreview}
      disabled={previewDisabled}
      type="button"
    >
      <SnapshotImage alt={imageAlt} src={imageSrc} />
    </button>
  );
  const factsGrid = <TerasMetadataList items={facts} />;
  const preview = previewOverlay ? (
    <div className={styles.terasMediaSnapshotViewport} {...overlayVisibility}>
      {previewButton}
      <div className={styles.terasMediaSnapshotOverlay}>{previewOverlay}</div>
    </div>
  ) : previewButton;
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
      fit={fit}
      kicker={kicker}
      title={title}
    >
      <div className={styles.terasMediaSnapshotGrid}>
        {density === "compact" ? (
          <>
            {preview}
            <div className={styles.terasMediaSnapshotContent}>{factsGrid}</div>
            {actionRow}
          </>
        ) : (
          <>
            {preview}
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
  navigation,
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
  navigation?: ReactNode;
}) {
  const snapshotViewerFullscreenRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const overlayVisibility = useSnapshotOverlayVisibility();
  useEffect(() => setZoom(1), [imageSrc]);

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
            <TerasActionRow spacing="none">
              <TerasActionButton aria-label="Zoom out snapshot" disabled={zoom <= 0.25} onClick={() => setZoom(value => Math.max(0.25, value - 0.25))}>−</TerasActionButton>
              <TerasActionButton aria-label="Fit snapshot" onClick={() => setZoom(1)}>{Math.round(zoom * 100)}% · Fit</TerasActionButton>
              <TerasActionButton aria-label="Zoom in snapshot" disabled={zoom >= 4} onClick={() => setZoom(value => Math.min(4, value + 0.25))}>+</TerasActionButton>
              {exportAction ? <TerasMediaSnapshotActionButton action={exportAction} /> : null}
            </TerasActionRow>
          </div>
        </TerasContentTray>
        <div
          className={styles.terasMediaSnapshotFullscreenCanvas}
          ref={snapshotViewerFullscreenRef}
          {...overlayVisibility}
        >
          <div className={styles.terasMediaSnapshotViewerCanvas} style={{overflow:"auto",display:"block"}}>
            <SnapshotImage alt={imageAlt} src={imageSrc} style={{width:`${zoom * 100}%`,maxWidth:"none",maxHeight:"none",height:"auto"}} />
          </div>
          {navigation ? <div className={styles.terasMediaSnapshotOverlay}>{navigation}</div> : null}
        </div>
      </div>
    </TerasDialog>
  );
}
