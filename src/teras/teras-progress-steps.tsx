"use client";

import type { ReactNode } from "react";

import styles from "./teras-patterns.module.css";
import type { TerasTone } from "./teras-types";
import { cx } from "./teras-utils";

type TerasProgressStepListItem<T extends string = string> = {
  available?: boolean;
  connectsToNext?: boolean;
  detail?: ReactNode;
  id: T;
  label: ReactNode;
  stateLabel?: ReactNode;
  tone?: TerasTone;
};
type TerasProgressStepListColumns = 4 | 5;
type TerasProgressStepListOffset = "none" | "normal";
type TerasProgressStepDensity = "compact" | "default";

export function TerasProgressStepSelector({
  available,
  connectsToNext = false,
  current,
  density = "default",
  detail,
  index,
  label,
  onSelect,
  stateLabel,
  tone,
}: {
  available: boolean;
  connectsToNext?: boolean;
  current: boolean;
  density?: TerasProgressStepDensity;
  detail: ReactNode;
  index: number;
  label: ReactNode;
  onSelect: () => void;
  stateLabel: ReactNode;
  tone: TerasTone;
}) {
  return (
    <button
      aria-current={current ? "step" : undefined}
      className={styles.terasStepButton}
      data-available={available}
      data-connects-next={connectsToNext}
      data-current={current}
      data-density={density}
      data-tone={tone}
      disabled={!available}
      onClick={onSelect}
      type="button"
    >
      <span className={styles.terasStepIndex}>
        {String(index).padStart(2, "0")}
      </span>
      <span>
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
      <em>{stateLabel}</em>
    </button>
  );
}

export function TerasProgressStepList<T extends string>({
  activeStepId,
  ariaLabel = "Progress steps",
  className,
  columns,
  onSelectStep,
  offset = "none",
  steps,
}: {
  activeStepId: T;
  ariaLabel?: string;
  className?: string;
  columns?: TerasProgressStepListColumns;
  onSelectStep?: (stepId: T) => void;
  offset?: TerasProgressStepListOffset;
  steps: TerasProgressStepListItem<T>[];
}) {
  const selectable = Boolean(onSelectStep);

  return (
    <div
      aria-label={ariaLabel}
      className={cx(styles.terasStepList, className)}
      data-columns={columns}
      data-offset={offset}
      data-teras-progress-step-list="true"
      role="group"
    >
      {steps.map((step, index) => {
        const current = step.id === activeStepId;
        const available = (step.available ?? true) && selectable;
        const tone = step.tone ?? (current ? "warn" : "muted");

        return (
          <TerasProgressStepSelector
            available={available}
            connectsToNext={step.connectsToNext ?? index < steps.length - 1}
            current={current}
            detail={step.detail}
            index={index + 1}
            key={step.id}
            label={step.label}
            onSelect={() => onSelectStep?.(step.id)}
            stateLabel={step.stateLabel ?? ""}
            tone={tone}
          />
        );
      })}
    </div>
  );
}
