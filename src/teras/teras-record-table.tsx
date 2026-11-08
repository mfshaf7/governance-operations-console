"use client";

import type { KeyboardEvent, ReactNode } from "react";

import styles from "./teras-patterns.module.css";
import { cx } from "./teras-utils";
import type { TerasRecordTableColumnIntent } from "./use-record-table-sizing";
import { useRecordTableSizing } from "./use-record-table-sizing";

export type TerasRecordTableProfile = "inventory" | "register" | "value-matrix";
export type TerasRecordTableDensity = "compact" | "normal";
export type { TerasRecordTableColumnIntent } from "./use-record-table-sizing";
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
  ariaLabel,
  columns,
  density = "normal",
  fill = false,
  getRowId,
  onSelect,
  profile = "register",
  rows,
  selectedRowId,
}: {
  ariaLabel: string;
  columns: Array<TerasRecordTableColumn<Row>>;
  density?: TerasRecordTableDensity;
  fill?: boolean;
  getRowId: (row: Row) => string;
  onSelect?: (row: Row) => void;
  profile?: TerasRecordTableProfile;
  rows: Row[];
  selectedRowId?: string | null;
}) {
  const sizing = useRecordTableSizing(ariaLabel, columns);
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
      ref={sizing.shellRef}
      data-column-sizing={sizing.sizes.widths.length ? "ready" : undefined}
      className={styles.recordTableShell}
      data-density={density}
      data-fill={fill ? "true" : "false"}
      data-has-evidence={hasEvidenceColumn ? "true" : undefined}
      data-profile={profile}
    >
      <table ref={sizing.tableRef} aria-label={ariaLabel} className={styles.recordTable}
        style={sizing.sizes.widths.length ? { width: sizing.sizes.widths.reduce((sum, width) => sum + width, 0) } : undefined}>
        <colgroup>
          {columns.map((column, index) => (
            <col
              style={sizing.sizes.widths[index] ? { width: sizing.sizes.widths[index] } : undefined}
              className={column.colClassName}
              data-intent={column.intent}
              key={column.key}
            />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th
                aria-label={typeof column.header === "string" ? column.header : undefined}
                className={column.headerClassName}
                data-align={column.align}
                data-intent={column.intent}
                key={column.key}
              >
                <span data-column-label>{column.header}</span>
                {index < columns.length - 1 ? <span className={styles.recordColumnResize} role="separator"
                  aria-label={`Resize ${typeof column.header === "string" ? column.header : column.key} and ${typeof columns[index + 1].header === "string" ? columns[index + 1].header : columns[index + 1].key} columns`}
                  aria-orientation="vertical" aria-valuemin={sizing.bounds(index).min}
                  aria-valuemax={sizing.bounds(index).max} aria-valuenow={Math.round(sizing.sizes.widths[index] ?? 0)}
                  tabIndex={0} title="Drag divider to resize neighboring columns · Arrow keys to adjust · Double-click or Enter to reset"
                  {...sizing.handleProps(index)} /> : null}
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
