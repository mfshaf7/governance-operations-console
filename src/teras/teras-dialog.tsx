"use client";

import { useId, type ReactNode } from "react";
import { X } from "lucide-react";

import styles from "./teras-patterns.module.css";
import { TerasActionButton } from "./teras-action";
import { TerasModalFoundation } from "./teras-modal-foundation";
import { TerasSectionHeader } from "./teras-section-header";
import { cx } from "./teras-utils";

export function TerasDialog({
  actions,
  children,
  className,
  closeDisabled = false,
  closeLabel = "Close dialog",
  contentOverflow,
  description,
  height,
  kicker,
  onClose,
  open,
  role = "dialog",
  title,
  width,
}: {
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  closeDisabled?: boolean;
  closeLabel?: string;
  contentOverflow: "auto" | "hidden";
  description?: ReactNode;
  height: "content" | "fill";
  kicker: string;
  onClose?: () => void;
  open: boolean;
  role?: "alertdialog" | "dialog";
  title: ReactNode;
  width: "compact" | "large" | "standard" | "wide";
}) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <TerasModalFoundation
      ariaDescribedBy={description ? descriptionId : undefined}
      ariaLabelledBy={titleId}
      className={styles.terasDialogNativeSurface}
      closeDisabled={closeDisabled}
      onRequestClose={onClose}
      open={open}
      role={role}
    >
      <div className={styles.terasDialogOverlay}>
        <div
          className={cx(styles.terasDialog, className)}
          data-content-overflow={contentOverflow}
          data-height={height}
          data-width={width}
        >
          <TerasSectionHeader
            actions={
              onClose ? (
                <button
                  aria-label={closeLabel}
                  className={styles.terasDialogClose}
                  disabled={closeDisabled}
                  onClick={onClose}
                  type="button"
                >
                  <X aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
              ) : undefined
            }
            description={description}
            descriptionId={description ? descriptionId : undefined}
            kicker={kicker}
            title={title}
            titleId={titleId}
          />
          {children ? (
            <div className={styles.terasDialogBody}>{children}</div>
          ) : null}
          {actions ? (
            <div className={styles.terasDialogActions}>{actions}</div>
          ) : null}
        </div>
      </div>
    </TerasModalFoundation>
  );
}

export function TerasDraftCloseGuardDialog({
  description,
  keepEditingLabel = "Keep Editing",
  kicker,
  leaveLabel = "Leave",
  onKeepEditing,
  onLeave,
  open,
  title,
}: {
  description: ReactNode;
  keepEditingLabel?: ReactNode;
  kicker: string;
  leaveLabel?: ReactNode;
  onKeepEditing: () => void;
  onLeave: () => void;
  open: boolean;
  title: ReactNode;
}) {
  return (
    <TerasDialog
      actions={
        <>
          <TerasActionButton autoFocus onClick={onKeepEditing} emphasis="secondary">
            {keepEditingLabel}
          </TerasActionButton>
          <TerasActionButton onClick={onLeave} tone="danger" emphasis="primary">
            {leaveLabel}
          </TerasActionButton>
        </>
      }
      description={description}
      contentOverflow="auto"
      height="content"
      kicker={kicker}
      open={open}
      role="alertdialog"
      title={title}
      width="compact"
    />
  );
}
