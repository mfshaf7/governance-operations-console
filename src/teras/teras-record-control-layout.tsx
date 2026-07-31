import type { HTMLAttributes, ReactNode } from "react";

import styles from "./teras-patterns.module.css";
import type { TerasDataAttributes } from "./teras-types";
import { cx } from "./teras-utils";

type TerasRecordControlLayoutMode =
  | "overview-register-selected"
  | "register-only"
  | "register-selected";
type TerasRecordControlComposition =
  | "compact-control"
  | "fullscreen-register";

export function TerasRecordControlLayout({
  className,
  composition,
  mode,
  overview,
  overviewProps,
  register,
  registerProps,
  selected,
  selectedProps,
  workProps,
  ...props
}: HTMLAttributes<HTMLDivElement> &
  TerasDataAttributes & {
    composition: TerasRecordControlComposition;
    mode: TerasRecordControlLayoutMode;
    overview?: ReactNode;
    overviewProps?: HTMLAttributes<HTMLElement> & TerasDataAttributes;
    register?: ReactNode;
    registerProps?: HTMLAttributes<HTMLDivElement> & TerasDataAttributes;
    selected?: ReactNode;
    selectedProps?: HTMLAttributes<HTMLElement> & TerasDataAttributes;
    workProps?: HTMLAttributes<HTMLElement> & TerasDataAttributes;
  }) {
  const {
    className: overviewClassName,
    ...resolvedOverviewProps
  } = overviewProps ?? {};
  const {
    className: registerClassName,
    ...resolvedRegisterProps
  } = registerProps ?? {};
  const {
    className: selectedClassName,
    ...resolvedSelectedProps
  } = selectedProps ?? {};
  const { className: workClassName, ...resolvedWorkProps } = workProps ?? {};
  const hasOverview = mode === "overview-register-selected";
  const hasSelected = mode !== "register-only";

  return (
    <div
      {...props}
      className={cx(styles.terasRecordControlLayout, className)}
      data-composition={composition}
      data-has-overview={hasOverview ? "true" : "false"}
      data-has-selected={hasSelected ? "true" : "false"}
      data-mode={mode}
      data-teras-record-control-layout="true"
    >
      {hasOverview ? (
        <section
          {...resolvedOverviewProps}
          className={cx(
            styles.terasRecordControlOverviewZone,
            overviewClassName,
          )}
        >
          {overview}
        </section>
      ) : null}

      <section
        {...resolvedWorkProps}
        className={cx(styles.terasRecordControlWorkZone, workClassName)}
      >
        <div
          {...resolvedRegisterProps}
          className={cx(
            styles.terasRecordControlRegisterColumn,
            registerClassName,
          )}
        >
          {register}
        </div>
        {hasSelected ? (
          <aside
            {...resolvedSelectedProps}
            className={cx(
              styles.terasRecordControlSelectedColumn,
              selectedClassName,
            )}
          >
            {selected}
          </aside>
        ) : null}
      </section>
    </div>
  );
}

export function TerasRecordControlOverviewGrid({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div
      {...props}
      className={cx(styles.terasRecordControlOverviewGrid, className)}
      data-teras-record-control-overview-grid="true"
    >
      {children}
    </div>
  );
}
