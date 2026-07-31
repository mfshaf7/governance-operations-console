"use client";

import {
  useRef,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import styles from "./teras-patterns.module.css";
import { TerasContentTray } from "./teras-content-tray";
import type { TerasTone } from "./teras-types";
import { cx } from "./teras-utils";

export type TerasChoiceOption<T extends string> = {
  confirmed?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  id: T;
  label: string;
  tone: TerasTone;
};

export type TerasSelectableRowProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "onClick"
> & {
  ariaLabel?: string;
  detail?: ReactNode;
  label: ReactNode;
  onSelect: () => void;
  selected?: boolean;
  status?: ReactNode;
  tone?: TerasTone;
};

export function TerasSelectableRow({
  ariaLabel,
  detail,
  disabled = false,
  label,
  onSelect,
  selected = false,
  status,
  tone = "warn",
  ...props
}: TerasSelectableRowProps) {
  return (
    <button
      aria-label={ariaLabel}
      aria-pressed={selected}
      className={styles.terasSelectableRow}
      data-current={selected}
      data-has-detail={detail ? "true" : "false"}
      data-has-status={status ? "true" : "false"}
      data-tone={tone}
      disabled={disabled}
      onClick={onSelect}
      type="button"
      {...props}
    >
      <span className={styles.terasSelectableRowText}>
        <strong>{label}</strong>
        {detail ? <small>{detail}</small> : null}
      </span>
      {status ? (
        <span className={styles.terasSelectableRowStatus}>{status}</span>
      ) : null}
    </button>
  );
}

export function TerasChoiceGroup<T extends string>({
  ariaLabel,
  disabled = false,
  frame,
  label,
  onSelect,
  options,
  readOnly = false,
  selectedId,
}: {
  ariaLabel: string;
  disabled?: boolean;
  onSelect: (id: T) => void;
  options: TerasChoiceOption<T>[];
  readOnly?: boolean;
  selectedId: T;
} & (
  | {
      frame: "none";
      label?: never;
    }
  | {
      frame: "tray";
      label: ReactNode;
    }
)) {
  const locked = disabled || readOnly;
  const optionRefs = useRef(new Map<T, HTMLButtonElement>());
  const selectedOption = options.find(
    (option) => option.id === selectedId && !locked && !option.disabled,
  );
  const tabStopId =
    selectedOption?.id ??
    options.find((option) => !locked && !option.disabled)?.id;

  function selectFromKeyboard(
    event: KeyboardEvent<HTMLButtonElement>,
    currentId: T,
  ) {
    const availableOptions = options.filter(
      (option) => !locked && !option.disabled,
    );
    if (availableOptions.length === 0) {
      return;
    }

    const currentIndex = availableOptions.findIndex(
      (option) => option.id === currentId,
    );
    let targetIndex: number | null = null;

    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
        targetIndex =
          currentIndex >= 0
            ? (currentIndex + 1) % availableOptions.length
            : 0;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        targetIndex =
          currentIndex >= 0
            ? (currentIndex - 1 + availableOptions.length) %
              availableOptions.length
            : availableOptions.length - 1;
        break;
      case "Home":
        targetIndex = 0;
        break;
      case "End":
        targetIndex = availableOptions.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const target = availableOptions[targetIndex];
    optionRefs.current.get(target.id)?.focus();
    if (target.id !== selectedId) {
      onSelect(target.id);
    }
  }

  const choiceGroup = (
    <div
      aria-disabled={locked || undefined}
      aria-label={ariaLabel}
      aria-readonly={readOnly || undefined}
      className={styles.terasChoiceGroup}
      data-read-only={readOnly ? "true" : "false"}
      role="radiogroup"
    >
      {options.map((option) => {
        const selected = selectedId === option.id;
        const optionLocked = locked || option.disabled === true;

        return (
          <button
            aria-checked={selected}
            aria-current={selected ? "true" : undefined}
            aria-disabled={optionLocked}
            aria-label={`${option.label}${option.confirmed ? ", confirmed" : ""}${
              option.disabledReason ? `, unavailable: ${option.disabledReason}` : ""
            }`}
            className={cx(
              styles.terasChoiceButton,
              selected && styles.terasChoiceButtonSelected,
            )}
            data-confirmed={option.confirmed ?? false}
            data-disabled={option.disabled === true}
            data-read-only={readOnly ? "true" : "false"}
            data-tone={option.tone}
            disabled={optionLocked}
            key={option.id}
            onClick={() => {
              if (!optionLocked) {
                onSelect(option.id);
              }
            }}
            onKeyDown={(event) => selectFromKeyboard(event, option.id)}
            ref={(node) => {
              if (node) {
                optionRefs.current.set(option.id, node);
              } else {
                optionRefs.current.delete(option.id);
              }
            }}
            role="radio"
            tabIndex={option.id === tabStopId ? 0 : -1}
            type="button"
          >
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );

  if (frame === "none") {
    return choiceGroup;
  }

  return (
    <TerasContentTray
      className={styles.terasChoiceTrayFrame}
      kicker={label}
    >
      {choiceGroup}
    </TerasContentTray>
  );
}
