"use client";

import { useId, type HTMLAttributes, type ReactNode } from "react";
import { X } from "lucide-react";

import styles from "./teras-patterns.module.css";
import { TerasModalFoundation } from "./teras-modal-foundation";
import { cx } from "./teras-utils";

type TerasModalShellAttributes = Omit<HTMLAttributes<HTMLElement>, "children"> &
  Record<`data-${string}`, string | number | boolean | undefined>;

export function TerasModalShell({
  bodyLayout,
  children,
  description,
  footer,
  kicker,
  modalAttributes,
  onClose,
  height,
  surfaceId,
  title,
  width,
}: {
  bodyLayout: "fill" | "scroll";
  children: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  height: "content" | "fill";
  kicker: string;
  modalAttributes?: TerasModalShellAttributes;
  onClose: () => void;
  surfaceId?: string;
  title: ReactNode;
  width: "large" | "medium" | "standard" | "viewport";
}) {
  const titleId = useId();
  const descriptionId = useId();
  const { className: modalClassName, ...modalProps } = modalAttributes ?? {};

  return (
    <TerasModalFoundation
      ariaDescribedBy={description ? descriptionId : undefined}
      ariaLabelledBy={titleId}
      className={styles.modalNativeSurface}
      onRequestClose={onClose}
      open
    >
      <div className={styles.modalLayer} data-width={width}>
        <section
          {...modalProps}
          className={cx(styles.modal, modalClassName)}
          data-body-layout={bodyLayout}
          data-height={height}
          data-teras-modal={surfaceId}
          data-width={width}
        >
          <header className={styles.modalHeader}>
            <div>
              <p className={styles.kicker}>{kicker}</p>
              <h3 className={styles.title} id={titleId}>
                {title}
              </h3>
              {description ? (
                <p className={styles.description} id={descriptionId}>
                  {description}
                </p>
              ) : null}
            </div>
            <button
              aria-label="Close modal"
              className={styles.closeButton}
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" size={16} />
            </button>
          </header>
          <div className={styles.modalBody}>{children}</div>
          {footer ? <footer className={styles.modalFooter}>{footer}</footer> : null}
        </section>
      </div>
    </TerasModalFoundation>
  );
}
