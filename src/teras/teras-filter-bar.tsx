"use client";

import type { HTMLAttributes, ReactElement, ReactNode } from "react";

import styles from "./teras-patterns.module.css";
import {
  TerasSelectControl,
  type TerasSelectOption,
} from "./teras-select-control";
import { TerasTextField } from "./teras-text-field";
import { cx } from "./teras-utils";

export type TerasFilterBarFilter<Value extends string = string> = {
  label: string;
  onValueChange: (value: Value) => void;
  options: readonly TerasSelectOption<Value>[];
  value: Value;
};

export type TerasFilterBarFilters<
  First extends string = string,
  Second extends string = string,
  Third extends string = string,
> =
  | readonly []
  | readonly [TerasFilterBarFilter<First>]
  | readonly [
      TerasFilterBarFilter<First>,
      TerasFilterBarFilter<Second>,
    ]
  | readonly [
      TerasFilterBarFilter<First>,
      TerasFilterBarFilter<Second>,
      TerasFilterBarFilter<Third>,
    ];

export type TerasFilterBarSearch = {
  ariaLabel: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  value: string;
};

type TerasFilterBarBaseProps = {
  action?: ReactNode;
  className?: string;
  search: TerasFilterBarSearch;
} & Omit<HTMLAttributes<HTMLDivElement>, "children">;

type TerasFilterBarImplementationProps = TerasFilterBarBaseProps & {
  filters?: readonly unknown[];
};

export function TerasFilterBar(
  props: TerasFilterBarBaseProps & { filters?: readonly [] },
): ReactElement;
export function TerasFilterBar<First extends string>(
  props: TerasFilterBarBaseProps & {
    filters: readonly [TerasFilterBarFilter<First>];
  },
): ReactElement;
export function TerasFilterBar<
  First extends string,
  Second extends string,
>(
  props: TerasFilterBarBaseProps & {
    filters: readonly [
      TerasFilterBarFilter<First>,
      TerasFilterBarFilter<Second>,
    ];
  },
): ReactElement;
export function TerasFilterBar<
  First extends string,
  Second extends string,
  Third extends string,
>(
  props: TerasFilterBarBaseProps & {
    filters: readonly [
      TerasFilterBarFilter<First>,
      TerasFilterBarFilter<Second>,
      TerasFilterBarFilter<Third>,
    ];
  },
): ReactElement;
export function TerasFilterBar({
  action,
  className,
  filters: unresolvedFilters = [],
  search,
  ...props
}: TerasFilterBarImplementationProps) {
  const filters = unresolvedFilters as readonly TerasFilterBarFilter<string>[];

  if (filters.length > 3) {
    throw new RangeError("TerasFilterBar supports at most three filters.");
  }

  return (
    <div
      className={cx(styles.terasFilterBar, className)}
      data-filter-count={filters.length}
      data-has-action={action ? "true" : "false"}
      data-teras-filter-bar="true"
      {...props}
    >
      <TerasTextField
        aria-label={search.ariaLabel}
        className={styles.terasFilterBarSearch}
        label={search.ariaLabel}
        labelVisibility="hidden"
        onValueChange={search.onValueChange}
        placeholder={search.placeholder}
        type="search"
        value={search.value}
      />
      {filters.length > 0 ? (
        <div className={styles.terasFilterBarFilters}>
          {filters.map((filter) => (
            <TerasFilterSelect
              key={filter.label}
              label={filter.label}
              onValueChange={filter.onValueChange}
              options={filter.options}
              value={filter.value}
            />
          ))}
        </div>
      ) : null}
      {action ? (
        <div className={styles.terasFilterBarAction}>{action}</div>
      ) : null}
    </div>
  );
}

function TerasFilterSelect<Value extends string>({
  label,
  onValueChange,
  options,
  value,
}: {
  label: string;
  onValueChange: (value: Value) => void;
  options: readonly TerasSelectOption<Value>[];
  value: Value;
}) {
  return (
    <TerasSelectControl
      ariaLabel={label}
      menuPlacement="inline"
      onValueChange={onValueChange}
      options={options}
      placeholder="Select"
      value={value}
    />
  );
}
