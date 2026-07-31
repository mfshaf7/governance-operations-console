"use client";

import type { ReactNode } from "react";
import { useId } from "react";

import styles from "./teras-patterns.module.css";
import {
  TerasSelectControl,
  type TerasSelectOption,
} from "./teras-select-control";
import type { TerasTone } from "./teras-types";
import { cx } from "./teras-utils";

type TerasSelectFieldBaseProps<Value extends string> = {
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  helper?: ReactNode;
  label: ReactNode;
  onValueChange: (value: Value) => void;
  options: readonly TerasSelectOption<Value>[];
  value: Value;
};

type TerasDefaultSelectFieldProps = {
  tone?: never;
  treatment?: "default";
};

type TerasHighlightedSelectFieldProps = {
  tone?: TerasTone;
  treatment: "highlighted";
};

export type TerasSelectFieldProps<Value extends string> =
  TerasSelectFieldBaseProps<Value> &
    (TerasDefaultSelectFieldProps | TerasHighlightedSelectFieldProps);

export function TerasSelectField<Value extends string>(
  props: TerasSelectFieldProps<Value>,
) {
  const {
    ariaLabel,
    className,
    disabled = false,
    helper,
    label,
    onValueChange,
    options,
    treatment = "default",
    value,
  } = props;
  const labelId = useId();
  const tone =
    treatment === "highlighted" ? (props.tone ?? "info") : undefined;

  return (
    <div
      className={cx(styles.terasSelectField, className)}
      data-tone={tone}
      data-treatment={treatment}
    >
      <span id={labelId}>{label}</span>
      <TerasSelectControl
        ariaLabel={ariaLabel}
        ariaLabelledBy={labelId}
        disabled={disabled}
        menuPlacement="portal"
        onValueChange={onValueChange}
        options={options}
        placeholder="Select value"
        value={value}
      />
      {helper ? <small>{helper}</small> : null}
    </div>
  );
}
