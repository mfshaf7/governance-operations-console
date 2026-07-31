"use client";

import {
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type TerasModalRole = "alertdialog" | "dialog";

let terasModalScrollLockCount = 0;
let terasModalPreviousBodyOverflow = "";
let terasModalPreviousHtmlOverflow = "";

function lockTerasDocumentScroll() {
  if (terasModalScrollLockCount === 0) {
    terasModalPreviousBodyOverflow = document.body.style.overflow;
    terasModalPreviousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
  }

  terasModalScrollLockCount += 1;

  return () => {
    terasModalScrollLockCount = Math.max(0, terasModalScrollLockCount - 1);

    if (terasModalScrollLockCount === 0) {
      document.body.style.overflow = terasModalPreviousBodyOverflow;
      document.documentElement.style.overflow = terasModalPreviousHtmlOverflow;
    }
  };
}

export function TerasModalFoundation({
  ariaDescribedBy,
  ariaLabelledBy,
  children,
  className,
  closeDisabled = false,
  onRequestClose,
  open,
  role = "dialog",
}: {
  ariaDescribedBy?: string;
  ariaLabelledBy: string;
  children: ReactNode;
  className: string;
  closeDisabled?: boolean;
  onRequestClose?: () => void;
  open: boolean;
  role?: TerasModalRole;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!open || !dialogRef.current) {
      return;
    }

    const dialog = dialogRef.current;
    const restoreFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const unlockDocumentScroll = lockTerasDocumentScroll();

    if (!dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (dialog.open) {
        dialog.close();
      }

      unlockDocumentScroll();

      queueMicrotask(() => {
        if (restoreFocus?.isConnected) {
          restoreFocus.focus({ preventScroll: true });
        }
      });
    };
  }, [open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <dialog
      aria-describedby={ariaDescribedBy}
      aria-labelledby={ariaLabelledBy}
      aria-modal="true"
      className={className}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();

        if (!closeDisabled) {
          onRequestClose?.();
        }
      }}
      ref={dialogRef}
      role={role}
      tabIndex={-1}
    >
      {children}
    </dialog>,
    document.body,
  );
}
