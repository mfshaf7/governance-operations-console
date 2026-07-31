"use client";

import type { CSSProperties, ReactNode, TextareaHTMLAttributes } from "react";

import styles from "./teras-patterns.module.css";
import { cx } from "./teras-utils";

export type TerasNoteFieldDensity = "compact" | "normal";
export type TerasNoteFieldMinimumHeight = "medium" | "short" | "tall";

type TerasNoteFieldBaseProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "onChange" | "rows" | "value"
> & {
  accentRgb?: string;
  className?: string;
  density?: TerasNoteFieldDensity;
  label: ReactNode;
  onValueChange: (value: string) => void;
  value: string;
};

export type TerasNoteFieldProps = TerasNoteFieldBaseProps &
  (
    | {
        fill: true;
        minimumHeight?: never;
      }
    | {
        fill?: false;
        minimumHeight?: TerasNoteFieldMinimumHeight;
      }
  );

export function TerasNoteField({
  accentRgb,
  className,
  density = "normal",
  fill = false,
  label,
  minimumHeight = "tall",
  onValueChange,
  value,
  ...props
}: TerasNoteFieldProps) {
  return (
    <label
      className={cx(styles.terasNoteField, className)}
      data-accented={accentRgb ? "true" : "false"}
      data-density={density}
      data-fill={fill ? "true" : "false"}
      data-minimum-height={minimumHeight}
      style={
        accentRgb
          ? ({ "--teras-field-accent-rgb": accentRgb } as CSSProperties)
          : undefined
      }
    >
      <span>{label}</span>
      <textarea
        onChange={(event) => onValueChange(event.target.value)}
        value={value}
        {...props}
      />
    </label>
  );
}
