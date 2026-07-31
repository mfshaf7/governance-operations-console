"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

import styles from "./teras-patterns.module.css";
import { TerasPanel } from "./teras-panel";
import type { TerasTone } from "./teras-types";
import { cx } from "./teras-utils";

export function TerasSurfaceNav({
  ariaLabel,
  children,
  className,
  description,
  kicker,
  title,
}: {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  description: ReactNode;
  kicker: ReactNode;
  title: ReactNode;
}) {
  return (
    <TerasPanel
      className={cx(styles.terasSurfaceNav, className)}
      tone="warn"
      treatment="rail"
    >
      <div className={styles.terasSurfaceNavHeader}>
        <span>{kicker}</span>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      <nav aria-label={ariaLabel} className={styles.terasSurfaceNavList}>
        {children}
      </nav>
    </TerasPanel>
  );
}

export function TerasSurfaceNavButton({
  className,
  current,
  kicker,
  meta,
  onClick,
  title,
  tone = "muted",
  ...buttonProps
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  current: boolean;
  kicker: ReactNode;
  meta?: ReactNode;
  title: ReactNode;
  tone?: TerasTone;
}) {
  return (
    <button
      {...buttonProps}
      aria-current={current ? "page" : buttonProps["aria-current"]}
      className={cx(
        styles.terasSurfaceNavButton,
        current && styles.terasSurfaceNavButtonActive,
        className,
      )}
      data-current={current}
      data-tone={tone}
      onClick={onClick}
      type={buttonProps.type ?? "button"}
    >
      <span>{kicker}</span>
      <strong>{title}</strong>
      {meta !== undefined ? <small>{meta}</small> : null}
    </button>
  );
}
