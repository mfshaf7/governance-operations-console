"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { useId } from "react";

import styles from "./teras-patterns.module.css";
import { cx } from "./teras-utils";

export type TerasReadoutFieldFit = "content" | "standard";
export type TerasReadoutFieldScrollHeight = "fill" | "medium" | "short" | "tall";
export type TerasReadoutFieldTreatment = "plain" | "quote";

export type TerasReadoutFieldProps = Omit<
  HTMLAttributes<HTMLElement>,
  "children"
> & {
  fit?: TerasReadoutFieldFit;
  label: ReactNode;
  scrollHeight?: TerasReadoutFieldScrollHeight;
  surface?: "field";
  treatment?: TerasReadoutFieldTreatment;
  value: ReactNode;
};

export function TerasReadoutField({
  className,
  fit = "standard",
  label,
  scrollHeight,
  surface,
  treatment = "plain",
  value,
  ...props
}: TerasReadoutFieldProps) {
  const labelId = useId();

  return (
    <section
      {...props}
      aria-labelledby={props["aria-labelledby"] ?? labelId}
      className={cx(styles.terasReadoutField, className)}
      data-fit={fit}
      data-scroll-height={scrollHeight ?? "none"}
      data-surface={surface}
      data-treatment={treatment}
    >
      <span id={labelId}>{label}</span>
      <div className={styles.terasReadoutFieldBox} tabIndex={scrollHeight === "fill" ? 0 : undefined}>{value}</div>
    </section>
  );
}
