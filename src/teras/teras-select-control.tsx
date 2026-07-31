"use client";

import { ChevronDown } from "lucide-react";
import type { CSSProperties, KeyboardEvent } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import styles from "./teras-patterns.module.css";
import { cx } from "./teras-utils";

export type TerasSelectOption<Value extends string = string> = Readonly<{
  label: string;
  value: Value;
}>;

type TerasSelectMenuPlacement = "inline" | "portal";

export function TerasSelectControl<Value extends string>({
  ariaLabel,
  ariaLabelledBy,
  disabled = false,
  menuPlacement,
  onValueChange,
  options,
  placeholder,
  value,
}: {
  ariaLabel?: string;
  ariaLabelledBy?: string;
  disabled?: boolean;
  menuPlacement: TerasSelectMenuPlacement;
  onValueChange: (value: Value) => void;
  options: readonly TerasSelectOption<Value>[];
  placeholder: string;
  value: Value;
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const keyboardFocusIndexRef = useRef<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const triggerId = useId();
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const selectedOption = options[selectedIndex];
  const portalHost =
    typeof document !== "undefined"
      ? buttonRef.current?.closest("dialog") ?? document.body
      : null;

  const closeMenu = ({ restoreFocus = false } = {}) => {
    keyboardFocusIndexRef.current = null;
    setOpen(false);

    if (restoreFocus) {
      buttonRef.current?.focus();
    }
  };

  const openForKeyboard = (focusIndex: number) => {
    if (disabled || options.length === 0) {
      return;
    }

    keyboardFocusIndexRef.current = focusIndex;
    setOpen(true);
  };

  const focusOption = (index: number) => {
    const optionButtons =
      menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]');

    if (!optionButtons || optionButtons.length === 0) {
      return false;
    }

    const normalizedIndex =
      ((index % optionButtons.length) + optionButtons.length) %
      optionButtons.length;

    optionButtons[normalizedIndex]?.focus();
    return true;
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openForKeyboard(selectedIndex);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      openForKeyboard(selectedIndex);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      openForKeyboard(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      openForKeyboard(options.length - 1);
    }
  };

  const handleOptionKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusOption(index + 1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      focusOption(index - 1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      focusOption(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      focusOption(options.length - 1);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu({ restoreFocus: true });
    }
  };

  useEffect(() => {
    if (!open || keyboardFocusIndexRef.current === null) {
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      const focusIndex = keyboardFocusIndexRef.current;

      if (focusIndex !== null && focusOption(focusIndex)) {
        keyboardFocusIndexRef.current = null;
      }
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [menuStyle, open]);

  useEffect(() => {
    if (!open || disabled || menuPlacement !== "portal") {
      return undefined;
    }

    const updateMenuPosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();

      if (!rect) {
        return;
      }

      const viewportPadding = 12;
      const width = Math.min(rect.width, window.innerWidth - viewportPadding * 2);
      const left = Math.max(
        viewportPadding,
        Math.min(rect.left, window.innerWidth - width - viewportPadding),
      );
      const top = rect.bottom + 6;

      setMenuStyle({
        left,
        maxHeight: `min(22rem, calc(100vh - ${Math.ceil(top)}px - 1rem))`,
        top,
        width,
      });
    };

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [disabled, menuPlacement, open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as Node;

      if (
        buttonRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }

      closeMenu();
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu({ restoreFocus: true });
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (
        buttonRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }

      closeMenu();
    };

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (disabled && open) {
      closeMenu();
    }
  }, [disabled, open]);

  const menu =
    open && !disabled ? (
      <div
        aria-labelledby={triggerId}
        className={
          menuPlacement === "portal"
            ? styles.terasSelectPortalMenu
            : styles.filterSelectMenu
        }
        id={menuId}
        ref={menuRef}
        role="listbox"
        style={menuPlacement === "portal" ? menuStyle ?? undefined : undefined}
      >
        {options.map((option, index) => (
          <button
            aria-selected={option.value === value}
            className={cx(
              styles.filterSelectOption,
              menuPlacement === "portal" && styles.terasSelectPortalOption,
              option.value === value && styles.filterSelectOptionActive,
            )}
            key={option.value}
            onClick={() => {
              onValueChange(option.value);
              closeMenu({ restoreFocus: true });
            }}
            onKeyDown={(event) => handleOptionKeyDown(event, index)}
            role="option"
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    ) : null;

  return (
    <div className={styles.filterSelectShell}>
      <button
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? undefined : ariaLabelledBy}
        className={styles.filterSelectButton}
        disabled={disabled}
        id={triggerId}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
        ref={buttonRef}
        type="button"
      >
        <span>{selectedOption?.label ?? placeholder}</span>
        <ChevronDown aria-hidden="true" size={15} />
      </button>
      {menuPlacement === "inline"
        ? menu
        : menu && menuStyle && portalHost
          ? createPortal(menu, portalHost)
          : null}
    </div>
  );
}
