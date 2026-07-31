"use client";

import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import { useRef } from "react";

import styles from "./teras-patterns.module.css";
import { cx } from "./teras-utils";

export type TerasSegmentedControlLayout = "fill" | "fit";
export type TerasSegmentedControlSize = "default" | "large";
export type TerasSegmentedControlOption<T extends string> = Readonly<{
  label: ReactNode;
  value: T;
}>;

export type TerasSegmentedControlProps<T extends string> = {
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  layout?: TerasSegmentedControlLayout;
  onValueChange: (value: T) => void;
  options: readonly TerasSegmentedControlOption<T>[];
  size?: TerasSegmentedControlSize;
  value: T;
};

export function TerasSegmentedControl<T extends string>({
  ariaLabel,
  className,
  disabled = false,
  layout = "fit",
  onValueChange,
  options,
  size = "default",
  value,
}: TerasSegmentedControlProps<T>) {
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const focusableIndex = selectedIndex >= 0 ? selectedIndex : 0;
  const fillStyle =
    layout === "fill"
      ? ({
          "--teras-segment-count": Math.max(options.length, 1),
        } as CSSProperties)
      : undefined;

  const selectOptionAt = (index: number) => {
    const option = options[index];

    if (!option || disabled) {
      return;
    }

    onValueChange(option.value);
    optionRefs.current[index]?.focus();
  };

  const handleOptionKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (disabled || options.length === 0) {
      return;
    }

    let nextIndex: number | null = null;

    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (index - 1 + options.length) % options.length;
    } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (index + 1) % options.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = options.length - 1;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      selectOptionAt(nextIndex);
    }
  };

  return (
    <div
      aria-label={ariaLabel}
      aria-orientation="horizontal"
      className={cx(styles.terasSegmentedControl, className)}
      data-layout={layout}
      data-size={size}
      role="radiogroup"
      style={fillStyle}
    >
      {options.map((option, index) => {
        const selected = value === option.value;

        return (
          <button
            aria-checked={selected}
            className={cx(
              styles.terasSegmentedControlButton,
              selected && styles.terasSegmentedControlButtonActive,
            )}
            disabled={disabled}
            key={option.value}
            onClick={() => {
              if (!disabled) {
                onValueChange(option.value);
              }
            }}
            onKeyDown={(event) => handleOptionKeyDown(event, index)}
            ref={(node) => {
              optionRefs.current[index] = node;
            }}
            role="radio"
            tabIndex={index === focusableIndex ? 0 : -1}
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
