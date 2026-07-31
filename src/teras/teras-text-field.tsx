"use client";

import type { CSSProperties, InputHTMLAttributes, ReactNode } from "react";

import styles from "./teras-patterns.module.css";
import { cx } from "./teras-utils";

export type TerasFieldLabelVisibility = "hidden" | "visible";
export type TerasTextFieldDensity = "compact" | "normal";

export type TerasTextFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "value"
> & {
  accentRgb?: string;
  className?: string;
  density?: TerasTextFieldDensity;
  label: ReactNode;
  labelVisibility?: TerasFieldLabelVisibility;
  onValueChange: (value: string) => void;
  prefix?: ReactNode;
  value: string;
};

export function TerasTextField({
  accentRgb,
  className,
  density = "normal",
  label,
  labelVisibility = "visible",
  onValueChange,
  prefix,
  value,
  ...props
}: TerasTextFieldProps) {
  const hasPrefix = prefix !== undefined && prefix !== null;
  const input = (
    <input
      onChange={(event) => onValueChange(event.target.value)}
      value={value}
      {...props}
    />
  );

  return (
    <label
      className={cx(styles.terasTextField, className)}
      data-accented={accentRgb ? "true" : "false"}
      data-density={density}
      data-label-visibility={labelVisibility}
      data-prefix={hasPrefix ? "true" : "false"}
      style={
        accentRgb
          ? ({ "--teras-field-accent-rgb": accentRgb } as CSSProperties)
          : undefined
      }
    >
      <span>{label}</span>
      {hasPrefix ? (
        <div className={styles.terasTextFieldControl}>
          <span className={styles.terasTextFieldPrefix}>{prefix}</span>
          {input}
        </div>
      ) : (
        input
      )}
    </label>
  );
}
