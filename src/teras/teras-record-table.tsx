"use client";

import type { KeyboardEvent, ReactNode } from "react";

import styles from "./teras-patterns.module.css";
import { cx } from "./teras-utils";

export type TerasRecordTableProfile = "inventory" | "register" | "value-matrix";
export type TerasRecordTableDensity = "compact" | "normal";
export type TerasRecordTableColumnIntent =
  | "action"
  | "chips"
  | "evidence"
  | "index"
  | "metric"
  | "primary"
  | "secondary"
  | "status"
  | "technical";
export type TerasRecordTableColumnAlign = "center" | "end" | "start";
export type TerasRecordTableColumnVerticalAlign = "middle" | "top";

export type TerasRecordTableColumn<Row> = {
  align?: TerasRecordTableColumnAlign;
  className?: string;
  colClassName?: string;
  header: ReactNode;
  headerClassName?: string;
  intent?: TerasRecordTableColumnIntent;
  key: string;
  render: (row: Row, index: number) => ReactNode;
  verticalAlign?: TerasRecordTableColumnVerticalAlign;
};

export function TerasRecordCellText({
  description,
  meta,
  title,
  variant = "default",
}: {
  description?: ReactNode;
  meta?: ReactNode;
  title: ReactNode;
  variant?: "default" | "value-stack";
}) {
  return (
    <div className={styles.recordCellText} data-variant={variant}>
      <p className={styles.recordCellTitle}>{title}</p>
      {meta ? <p className={styles.recordCellMetaInline}>{meta}</p> : null}
      {description ? (
        <p className={styles.recordCellDescription}>{description}</p>
      ) : null}
    </div>
  );
}

export function TerasRecordMetricText({
  label,
  value,
}: {
  label: ReactNode;
  value: ReactNode;
}) {
  return (
    <div className={styles.recordCellMetric}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export function TerasRecordStatusStack({
  meta,
  status,
}: {
  meta?: ReactNode;
  status: ReactNode;
}) {
  return (
    <div className={styles.recordCellStatusStack}>
      {status}
      {meta ? <p className={styles.recordCellMetaInline}>{meta}</p> : null}
    </div>
  );
}

export function TerasRecordMetaText({ children }: { children: ReactNode }) {
  return <p className={styles.recordCellMeta}>{children}</p>;
}

export function TerasRecordTable<Row>({
  columns,
  density = "normal",
  fill = false,
  getRowId,
  onSelect,
  profile = "register",
  rows,
  selectedRowId,
}: {
  columns: Array<TerasRecordTableColumn<Row>>;
  density?: TerasRecordTableDensity;
  fill?: boolean;
  getRowId: (row: Row) => string;
  onSelect?: (row: Row) => void;
  profile?: TerasRecordTableProfile;
  rows: Row[];
  selectedRowId?: string | null;
}) {
  const hasEvidenceColumn = columns.some((column) => column.intent === "evidence");

  function handleRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, row: Row) {
    if (!onSelect || (event.key !== "Enter" && event.key !== " ")) {
      return;
    }

    event.preventDefault();
    onSelect(row);
  }

  return (
    <div
      className={styles.recordTableShell}
      data-density={density}
      data-fill={fill ? "true" : "false"}
      data-has-evidence={hasEvidenceColumn ? "true" : undefined}
      data-profile={profile}
    >
      <table className={styles.recordTable}>
        <colgroup>
          {columns.map((column) => (
            <col
              className={column.colClassName}
              data-intent={column.intent}
              key={column.key}
            />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                className={column.headerClassName}
                data-align={column.align}
                data-intent={column.intent}
                key={column.key}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const rowId = getRowId(row);
            return (
              <tr
                className={cx(
                  rowId === selectedRowId && styles.recordTableRowSelected,
                )}
                aria-selected={selectedRowId ? rowId === selectedRowId : undefined}
                data-clickable={Boolean(onSelect)}
                key={rowId}
                onKeyDown={onSelect ? (event) => handleRowKeyDown(event, row) : undefined}
                onClick={onSelect ? () => onSelect(row) : undefined}
                tabIndex={onSelect ? 0 : undefined}
              >
                {columns.map((column) => (
                  <td
                    className={column.className}
                    data-align={column.align}
                    data-intent={column.intent}
                    data-vertical-align={column.verticalAlign}
                    key={column.key}
                  >
                    {column.render(row, index)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
