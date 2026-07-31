"use client";

import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, ReactNode } from "react";

import styles from "./teras-patterns.module.css";
import type { TerasTone } from "./teras-types";
import { cx } from "./teras-utils";

export type TerasActionEmphasis = "primary" | "secondary";
export type TerasActionTreatment = "solid" | "tonal";
export type TerasActionTone = "accent" | TerasTone;

type TerasActionButtonBaseProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  accentRgb?: string;
  size?: "default" | "table-compact";
};

type TerasSolidActionButtonProps = {
  emphasis?: TerasActionEmphasis;
  tone?: "accent" | "danger";
  treatment?: "solid";
};

type TerasTonalActionButtonProps = {
  emphasis?: never;
  tone?: TerasActionTone;
  treatment: "tonal";
};

export type TerasActionButtonProps = TerasActionButtonBaseProps &
  (TerasSolidActionButtonProps | TerasTonalActionButtonProps);

export function TerasActionButton({
  accentRgb,
  children,
  className,
  emphasis,
  size = "default",
  style,
  treatment = "solid",
  tone,
  ...props
}: TerasActionButtonProps) {
  const resolvedEmphasis =
    treatment === "tonal" ? undefined : emphasis ?? "primary";
  const resolvedTone =
    tone ?? (treatment === "tonal" ? "info" : "accent");
  const resolvedStyle = accentRgb
    ? ({
        ...style,
        "--teras-accent-rgb": accentRgb,
      } as CSSProperties)
    : style;

  return (
    <button
      className={cx(
        styles.actionButton,
        treatment === "tonal" && styles.actionButtonTonal,
        resolvedEmphasis === "secondary" && styles.actionButtonSecondary,
        resolvedTone === "danger" && styles.actionButtonDanger,
        treatment === "tonal" &&
          resolvedTone === "ok" &&
          styles.actionButtonTonalOk,
        treatment === "tonal" &&
          resolvedTone === "info" &&
          styles.actionButtonTonalInfo,
        treatment === "tonal" &&
          resolvedTone === "warn" &&
          styles.actionButtonTonalWarn,
        treatment === "tonal" &&
          resolvedTone === "danger" &&
          styles.actionButtonTonalDanger,
        accentRgb && styles.actionButtonAccent,
        className,
      )}
      data-emphasis={resolvedEmphasis}
      data-size={size}
      data-tone={resolvedTone}
      data-treatment={treatment}
      style={resolvedStyle}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

export function TerasActionRow({
  children,
  className,
  end,
  fill = false,
  layout = "end",
  spacing = "none",
  ...props
}: {
  children: ReactNode;
  className?: string;
  end?: ReactNode;
  fill?: boolean;
  layout?: "end" | "split";
  spacing?: "compact" | "none" | "normal" | "tight";
} & Omit<HTMLAttributes<HTMLDivElement>, "children">) {
  return (
    <div
      className={cx(styles.actionRow, className)}
      data-fill={fill ? "true" : "false"}
      data-layout={layout}
      data-spacing={spacing}
      data-teras-action-row="true"
      {...props}
    >
      {layout === "split" ? (
        <>
          <div className={styles.actionRowStart}>{children}</div>
          {end ? <div className={styles.actionRowEnd}>{end}</div> : null}
        </>
      ) : (
        children
      )}
    </div>
  );
}
