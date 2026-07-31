"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

import styles from "./teras-patterns.module.css";
import { TerasStatusPill } from "./teras-status-pill";
import type { TerasTone } from "./teras-types";

type TerasRailButtonStatusProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "onClick"
> & {
  ariaLabel?: string;
  available?: boolean;
  current: boolean;
  detail: ReactNode;
  label: ReactNode;
  onSelect: () => void;
  stateLabel: ReactNode;
  tone: TerasTone;
  variant: "status";
};

type TerasRailButtonMetricProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & {
  available?: boolean;
  current: boolean;
  detail: ReactNode;
  label: ReactNode;
  metricLabel: ReactNode;
  metricValue: ReactNode;
  tone?: TerasTone;
  variant: "metric-split";
};

export function TerasRailButton(props: TerasRailButtonStatusProps | TerasRailButtonMetricProps) {
  if (props.variant === "metric-split") {
    const {
      available = true,
      current,
      detail,
      label,
      metricLabel,
      metricValue,
      tone = "warn",
      variant,
      ...buttonProps
    } = props;

    return (
      <button
        aria-pressed={current}
        className={styles.terasRailButton}
        data-available={available}
        data-current={current}
        data-tone={tone}
        data-variant={variant}
        disabled={!available || buttonProps.disabled}
        type="button"
        {...buttonProps}
      >
        <span className={styles.terasRailButtonMetricText}>
          <strong>{label}</strong>
          <small>{detail}</small>
        </span>
        <strong className={styles.terasRailButtonMetric}>
          <span>{metricValue}</span>
          <small>{metricLabel}</small>
        </strong>
      </button>
    );
  }

  const {
    ariaLabel,
    available = true,
    current,
    detail,
    label,
    onSelect,
    stateLabel,
    tone,
    variant,
    ...buttonProps
  } = props;

  return (
    <button
      aria-label={ariaLabel}
      aria-pressed={current}
      className={styles.terasRailButton}
      data-available={available}
      data-current={current}
      data-tone={tone}
      data-variant={variant}
      disabled={!available || buttonProps.disabled}
      onClick={onSelect}
      type="button"
      {...buttonProps}
    >
      <span className={styles.terasRailButtonStatusText}>
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
      <TerasStatusPill className={styles.terasRailButtonStatusPill} tone={tone}>
        {stateLabel}
      </TerasStatusPill>
    </button>
  );
}
