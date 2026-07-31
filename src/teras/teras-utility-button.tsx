"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

import styles from "./teras-patterns.module.css";
import { cx } from "./teras-utils";

type TerasUtilityButtonVariant = "emphasis" | "subtle";

export function TerasUtilityButton({
  children,
  className,
  variant = "emphasis",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  className?: string;
  variant?: TerasUtilityButtonVariant;
}) {
  return (
    <button
      className={cx(styles.terasUtilityButton, className)}
      data-variant={variant}
      type="button"
      {...props}
    >
      {typeof children === "string" ? <span>{children}</span> : children}
    </button>
  );
}

export function TerasUtilityButtonGroup({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx(styles.terasUtilityButtonGrid, className)}>
      {children}
    </div>
  );
}
