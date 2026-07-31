"use client";

import {
  ArrowLeft,
  Check,
  CircleAlert,
  Search,
  X,
} from "lucide-react";
import type {
  ChangeEvent,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  useEffect,
  useId,
  useRef,
} from "react";

import type { ConsoleTone } from "./console-shell-status";
import styles from "./console-surface-controls.module.css";

export type ConsoleSurfaceButtonVariant =
  | "danger"
  | "muted"
  | "primary"
  | "secondary";

export type ConsoleSurfaceDialogSize = "default" | "wide";

export function ConsoleSurfaceButton({
  children,
  disabled = false,
  icon = null,
  onClick,
  title,
  type = "button",
  variant = "secondary",
}: {
  children: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
  onClick?: () => void;
  title?: string;
  type?: "button" | "submit";
  variant?: ConsoleSurfaceButtonVariant;
}) {
  return (
    <button
      className={styles.button}
      data-variant={variant}
      disabled={disabled}
      onClick={onClick}
      title={title}
      type={type}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

export function ConsoleSurfaceHeader({
  actions = null,
  description,
  kicker,
  onBack,
  title,
}: {
  actions?: ReactNode;
  description: string;
  kicker: string;
  onBack?: () => void;
  title: string;
}) {
  return (
    <header className={styles.surfaceHeader}>
      <div className={styles.surfaceHeaderIdentity}>
        {onBack ? (
          <button
            aria-label="Back"
            className={styles.backButton}
            onClick={onBack}
            title="Back"
            type="button"
          >
            <ArrowLeft aria-hidden="true" size={17} />
          </button>
        ) : null}
        <div>
          <p className={styles.kicker}>{kicker}</p>
          <h4>{title}</h4>
          <p className={styles.surfaceDescription}>{description}</p>
        </div>
      </div>
      {actions ? <div className={styles.headerActions}>{actions}</div> : null}
    </header>
  );
}

export type ConsoleSurfaceFilter = Readonly<{
  label: string;
  onChange: (value: string) => void;
  options: readonly Readonly<{
    label: string;
    value: string;
  }>[];
  value: string;
}>;

export function ConsoleSurfaceFilterBar({
  filters,
  onSearchChange,
  searchPlaceholder,
  searchValue,
}: {
  filters: readonly ConsoleSurfaceFilter[];
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  searchValue: string;
}) {
  return (
    <div className={styles.filterBar}>
      <label className={styles.searchField}>
        <Search aria-hidden="true" size={15} />
        <span className={styles.srOnly}>Search</span>
        <input
          aria-label="Search"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          type="search"
          value={searchValue}
        />
      </label>
      <div className={styles.filterGroup}>
        {filters.map((filter) => (
          <label className={styles.filterField} key={filter.label}>
            <span className={styles.srOnly}>{filter.label}</span>
            <select
              aria-label={filter.label}
              onChange={(event) => filter.onChange(event.target.value)}
              value={filter.value}
            >
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </div>
  );
}

export type ConsoleSurfaceTab<TId extends string> = Readonly<{
  id: TId;
  label: string;
}>;

export function ConsoleSurfaceTabs<TId extends string>({
  activeId,
  groupId,
  onChange,
  tabs,
}: {
  activeId: TId;
  groupId: string;
  onChange: (id: TId) => void;
  tabs: readonly ConsoleSurfaceTab<TId>[];
}) {
  function moveFocus(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    const keyMoves = {
      ArrowLeft: index - 1,
      ArrowRight: index + 1,
      End: tabs.length - 1,
      Home: 0,
    } as const;
    const requestedIndex =
      keyMoves[event.key as keyof typeof keyMoves];

    if (requestedIndex === undefined) {
      return;
    }

    event.preventDefault();
    const nextIndex =
      (requestedIndex + tabs.length) % tabs.length;
    const nextTab = tabs[nextIndex];
    if (!nextTab) {
      return;
    }

    onChange(nextTab.id);
    const tabButtons =
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
        '[role="tab"]',
      );
    tabButtons?.[nextIndex]?.focus();
  }

  return (
    <div aria-label="View" className={styles.tabs} role="tablist">
      {tabs.map((tab, index) => (
        <button
          aria-controls={`${groupId}-panel`}
          aria-selected={activeId === tab.id}
          className={styles.tab}
          data-active={activeId === tab.id ? "true" : "false"}
          id={`${groupId}-tab-${tab.id}`}
          key={tab.id}
          onKeyDown={(event) => moveFocus(event, index)}
          onClick={() => onChange(tab.id)}
          role="tab"
          tabIndex={activeId === tab.id ? 0 : -1}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function ConsoleSurfaceTabPanel<TId extends string>({
  activeId,
  children,
  groupId,
}: {
  activeId: TId;
  children: ReactNode;
  groupId: string;
}) {
  return (
    <div
      aria-labelledby={`${groupId}-tab-${activeId}`}
      id={`${groupId}-panel`}
      role="tabpanel"
      tabIndex={0}
    >
      {children}
    </div>
  );
}

export function ConsoleSurfaceTwoZone({
  primary,
  support,
}: {
  primary: ReactNode;
  support: ReactNode;
}) {
  return (
    <div className={styles.twoZone}>
      <div className={styles.primaryZone}>{primary}</div>
      <div className={styles.supportZone}>{support}</div>
    </div>
  );
}

export function ConsoleSurfaceStack({ children }: { children: ReactNode }) {
  return <div className={styles.stack}>{children}</div>;
}

export function ConsoleSurfaceActionGroup({
  align = "start",
  children,
}: {
  align?: "end" | "start";
  children: ReactNode;
}) {
  return (
    <div className={styles.actionGroup} data-align={align}>
      {children}
    </div>
  );
}

export function ConsoleSurfacePanel({
  children,
  description,
  footer = null,
  kicker,
  title,
  tone = "default",
}: {
  children: ReactNode;
  description: string;
  footer?: ReactNode;
  kicker: string;
  title: string;
  tone?: ConsoleTone | "default";
}) {
  return (
    <section className={styles.panel} data-tone={tone}>
      <div className={styles.panelHeader}>
        <p className={styles.panelKicker}>{kicker}</p>
        <h5>{title}</h5>
        <p>{description}</p>
      </div>
      <div className={styles.panelBody}>{children}</div>
      {footer ? <div className={styles.panelFooter}>{footer}</div> : null}
    </section>
  );
}

export type ConsoleSurfaceMetadataItem = Readonly<{
  label: string;
  meta?: string;
  tone?: ConsoleTone;
  value: string;
}>;

export function ConsoleSurfaceMetadataList({
  items,
}: {
  items: readonly ConsoleSurfaceMetadataItem[];
}) {
  return (
    <dl className={styles.metadataList}>
      {items.map((item) => (
        <div className={styles.metadataItem} key={item.label}>
          <dt>{item.label}</dt>
          <dd data-tone={item.tone ?? "default"} title={item.value}>
            {item.value}
          </dd>
          {item.meta ? <small>{item.meta}</small> : null}
        </div>
      ))}
    </dl>
  );
}

export function ConsoleSurfaceTagList({
  emptyLabel = "None recorded",
  items,
}: {
  emptyLabel?: string;
  items: readonly string[];
}) {
  return (
    <div className={styles.tagList}>
      {items.length > 0 ? (
        items.map((item) => <span key={item}>{item}</span>)
      ) : (
        <span data-empty="true">{emptyLabel}</span>
      )}
    </div>
  );
}

export function ConsoleSurfaceContentGroup({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className={styles.contentGroup}>
      <p>{label}</p>
      {children}
    </div>
  );
}

export type ConsoleSurfaceCheckItem = Readonly<{
  detail: string;
  id: string;
  label: string;
  status: string;
  tone: ConsoleTone;
}>;

export function ConsoleSurfaceChecklist({
  items,
}: {
  items: readonly ConsoleSurfaceCheckItem[];
}) {
  return (
    <div className={styles.checklist}>
      {items.map((item) => (
        <div className={styles.checkItem} data-tone={item.tone} key={item.id}>
          <span className={styles.checkIcon}>
            {item.tone === "ok" ? (
              <Check aria-hidden="true" size={14} />
            ) : (
              <CircleAlert aria-hidden="true" size={14} />
            )}
          </span>
          <span className={styles.checkContent}>
            <strong>{item.label}</strong>
            <small>{item.detail}</small>
          </span>
          <span className={styles.checkStatus}>{item.status}</span>
        </div>
      ))}
    </div>
  );
}

export function ConsoleSurfaceEmptyState({
  detail,
  title,
}: {
  detail: string;
  title: string;
}) {
  return (
    <div className={styles.emptyState}>
      <strong>{title}</strong>
      <p>{detail}</p>
    </div>
  );
}

export function ConsoleSurfaceFieldGrid({
  children,
}: {
  children: ReactNode;
}) {
  return <div className={styles.fieldGrid}>{children}</div>;
}

type SharedFieldProps = {
  description?: string;
  disabled?: boolean;
  label: string;
};

export function ConsoleSurfaceTextField({
  description,
  disabled = false,
  label,
  onChange,
  placeholder,
  value,
}: SharedFieldProps & {
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <label className={styles.formField}>
      <span>{label}</span>
      {description ? <small>{description}</small> : null}
      <input
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="text"
        value={value}
      />
    </label>
  );
}

export function ConsoleSurfaceTextAreaField({
  description,
  disabled = false,
  label,
  onChange,
  placeholder,
  rows = 3,
  value,
}: SharedFieldProps & {
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  value: string;
}) {
  return (
    <label className={styles.formField}>
      <span>{label}</span>
      {description ? <small>{description}</small> : null}
      <textarea
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        value={value}
      />
    </label>
  );
}

export function ConsoleSurfaceSelectField({
  description,
  disabled = false,
  label,
  onChange,
  options,
  value,
}: SharedFieldProps & {
  onChange: (value: string) => void;
  options: readonly Readonly<{ label: string; value: string }>[];
  value: string;
}) {
  return (
    <label className={styles.formField}>
      <span>{label}</span>
      {description ? <small>{description}</small> : null}
      <select
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ConsoleSurfaceCheckboxGroup({
  label,
  onChange,
  options,
  values,
}: {
  label: string;
  onChange: (values: readonly string[]) => void;
  options: readonly Readonly<{ label: string; value: string }>[];
  values: readonly string[];
}) {
  function updateValue(event: ChangeEvent<HTMLInputElement>) {
    const nextValues = event.target.checked
      ? [...values, event.target.value]
      : values.filter((value) => value !== event.target.value);

    onChange([...new Set(nextValues)]);
  }

  return (
    <fieldset className={styles.checkboxGroup}>
      <legend>{label}</legend>
      <div className={styles.checkboxOptions}>
        {options.map((option) => (
          <label key={option.value}>
            <input
              checked={values.includes(option.value)}
              onChange={updateValue}
              type="checkbox"
              value={option.value}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ConsoleSurfaceWizardSteps<TId extends string>({
  activeId,
  steps,
}: {
  activeId: TId;
  steps: readonly ConsoleSurfaceTab<TId>[];
}) {
  const activeIndex = steps.findIndex((step) => step.id === activeId);

  return (
    <ol
      className={styles.wizardSteps}
      data-columns={Math.min(steps.length, 3)}
    >
      {steps.map((step, index) => (
        <li
          aria-current={index === activeIndex ? "step" : undefined}
          data-state={
            index < activeIndex
              ? "complete"
              : index === activeIndex
                ? "current"
                : "pending"
          }
          key={step.id}
        >
          <span>{String(index + 1).padStart(2, "0")}</span>
          <strong>{step.label}</strong>
        </li>
      ))}
    </ol>
  );
}

export type ConsoleSurfaceTimelineItem = Readonly<{
  detail: string;
  id: string;
  label: string;
  meta: string;
}>;

export function ConsoleSurfaceTimeline({
  items,
}: {
  items: readonly ConsoleSurfaceTimelineItem[];
}) {
  return (
    <ol className={styles.timeline}>
      {items.map((item) => (
        <li key={item.id}>
          <span aria-hidden="true" />
          <div>
            <strong>{item.label}</strong>
            <p>{item.detail}</p>
            <small>{item.meta}</small>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function ConsoleSurfaceDialog({
  children,
  className,
  description,
  footer = null,
  kicker,
  onClose,
  open,
  size = "default",
  title,
}: {
  children: ReactNode;
  className?: string;
  description: string;
  footer?: ReactNode;
  kicker: string;
  onClose: () => void;
  open: boolean;
  size?: ConsoleSurfaceDialogSize;
  title: string;
}) {
  const descriptionId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousBodyOverflow = document.body.style.overflow;
    const dialog = dialogRef.current;
    const focusable = dialog?.querySelector<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    );
    document.body.style.overflow = "hidden";
    (focusable ?? dialog)?.focus();

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      previousFocus?.focus();
    };
  }, [open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  function handleDialogKeyDown(
    event: ReactKeyboardEvent<HTMLElement>,
  ) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusable = [
      ...(dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ) ?? []),
    ];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (!first || !last) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return createPortal(
    <div className={styles.dialogLayer}>
      <div
        aria-hidden="true"
        className={styles.dialogBackdrop}
        onClick={onClose}
      />
      <section
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className={[styles.dialog, className].filter(Boolean).join(" ")}
        data-size={size}
        onKeyDown={handleDialogKeyDown}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className={styles.dialogHeader}>
          <div>
            <p>{kicker}</p>
            <h4 id={titleId}>{title}</h4>
            <span className={styles.dialogDescription} id={descriptionId}>
              {description}
            </span>
          </div>
          <button
            aria-label={`Close ${title}`}
            onClick={onClose}
            title={`Close ${title}`}
            type="button"
          >
            <X aria-hidden="true" size={17} />
          </button>
        </header>
        <div className={styles.dialogBody}>{children}</div>
        {footer ? <footer className={styles.dialogFooter}>{footer}</footer> : null}
      </section>
    </div>,
    document.body,
  );
}
