"use client";

import { useId } from "react";
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
  helper?: ReactNode;
  actions?: ReactNode;
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
  helper,
  actions,
  minimumHeight = "tall",
  onValueChange,
  value,
  ...props
}: TerasNoteFieldProps) {
  const labelId = useId();
  const Field = actions ? "div" : "label";
  const input = (
    <textarea
      id={actions ? (props.id ?? `${labelId}-input`) : props.id}
      onChange={(event) => onValueChange(event.target.value)}
      value={value}
      {...props}
      aria-labelledby={props["aria-labelledby"] ?? (!props["aria-label"] ? labelId : undefined)}
      aria-describedby={[props["aria-describedby"], helper ? `${labelId}-help` : null].filter(Boolean).join(" ") || undefined}
    />
  );
  return (
    <Field
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
      {actions ? <label id={labelId} htmlFor={props.id ?? `${labelId}-input`}>{label}</label> : <span id={labelId}>{label}</span>}
      {actions ? <div className={styles.terasNoteFieldInputFrame}>
        {input}
        <div className={styles.terasNoteFieldActions}>{actions}</div>
      </div> : input}
      {helper ? <small id={`${labelId}-help`}>{helper}</small> : null}
    </Field>
  );
}
