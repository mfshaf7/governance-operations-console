"use client";

import type { LucideIcon } from "lucide-react";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useId } from "react";

import { ConsoleShellPanel, ConsoleShellSectionTitle } from "./console-shell-panel";
import type { ConsoleTone } from "./console-shell-status";
import styles from "./console-connected-surface.module.css";

export type ConsoleConnectedSurfaceAccent = "amber" | "blue" | "teal";

export type ConsoleConnectedSurfaceEntry = Readonly<{
  accent: ConsoleConnectedSurfaceAccent;
  description: string;
  detail: string;
  icon: LucideIcon;
  id: string;
  label: string;
  metricLabel: string;
  metricValue: string;
}>;

export type ConsoleConnectedRegisterCell =
  | Readonly<{
      kind: "primary" | "text";
      label: string;
      meta?: string;
    }>
  | Readonly<{
      kind: "status";
      label: string;
      tone: ConsoleTone;
    }>;

export type ConsoleConnectedRegisterRow = Readonly<{
  cells: readonly ConsoleConnectedRegisterCell[];
  id: string;
}>;

export function ConsoleConnectedRegister({
  action,
  ariaLabel,
  columns,
  description,
  filters = null,
  headerAction = null,
  rows,
  selectedRowId = null,
  title,
}: {
  action?: Readonly<{
    ariaLabel?: (rowId: string) => string;
    label: string;
    onSelect: (rowId: string) => void;
  }>;
  ariaLabel: string;
  columns: readonly string[];
  description: string;
  filters?: ReactNode;
  headerAction?: ReactNode;
  rows: readonly ConsoleConnectedRegisterRow[];
  selectedRowId?: string | null;
  title: string;
}) {
  const tableColumnCount = columns.length + (action ? 1 : 0);

  return (
    <section className={styles.register}>
      <div className={styles.registerHeader}>
        <div>
          <p className={styles.registerTitle}>{title}</p>
          <p className={styles.registerDescription}>{description}</p>
        </div>
        <div className={styles.registerHeaderMeta}>
          <span className={styles.registerCount}>
            {rows.length} {rows.length === 1 ? "record" : "records"}
          </span>
          {headerAction}
        </div>
      </div>

      {filters ? <div className={styles.registerFilters}>{filters}</div> : null}

      <div className={styles.tableViewport}>
        <table aria-label={ariaLabel} className={styles.table}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column} scope="col">
                  {column}
                </th>
              ))}
              {action ? (
                <th className={styles.actionHeader} scope="col">
                  Action
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row) => (
                <tr
                  data-selected={row.id === selectedRowId ? "true" : "false"}
                  key={row.id}
                >
                  {row.cells.map((cell, index) => (
                    <td key={`${row.id}-${columns[index] ?? index}`}>
                      {cell.kind === "status" ? (
                        <span
                          className={styles.status}
                          data-tone={cell.tone}
                        >
                          {cell.label}
                        </span>
                      ) : (
                        <div
                          className={
                            cell.kind === "primary"
                              ? styles.primaryCell
                              : styles.textCell
                          }
                        >
                          <span>{cell.label}</span>
                          {cell.meta ? <small>{cell.meta}</small> : null}
                        </div>
                      )}
                    </td>
                  ))}
                  {action ? (
                    <td className={styles.actionCell}>
                      <button
                        aria-label={action.ariaLabel?.(row.id)}
                        onClick={() => action.onSelect(row.id)}
                        type="button"
                      >
                        {action.label}
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))
            ) : (
              <tr>
                <td className={styles.emptyCell} colSpan={tableColumnCount}>
                  No records match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function ConsoleConnectedSurface({
  children,
  className = "",
  description,
  entries,
  kicker,
  onSelect,
  selectedId,
  title,
}: {
  children: ReactNode;
  className?: string;
  description: string;
  entries: readonly ConsoleConnectedSurfaceEntry[];
  kicker: string;
  onSelect: (entryId: string | null) => void;
  selectedId: string | null;
  title: string;
}) {
  const selectedEntry =
    entries.find((entry) => entry.id === selectedId) ?? null;
  const expandedSurfaceId = useId();

  return (
    <ConsoleShellPanel className={`${styles.panel} ${className}`}>
      <div className={styles.header}>
        <ConsoleShellSectionTitle kicker={kicker} title={title} />
        <p className={styles.description}>{description}</p>
      </div>

      <div className={styles.selectorTray}>
        <div
          className={styles.entryGrid}
          data-columns={Math.min(entries.length, 3)}
        >
          {entries.map((entry) => {
            const Icon = entry.icon;
            const selected = entry.id === selectedId;

            return (
              <button
                aria-controls={selected ? expandedSurfaceId : undefined}
                aria-expanded={selected}
                className={styles.entry}
                data-accent={entry.accent}
                data-selected={selected ? "true" : "false"}
                key={entry.id}
                onClick={() => onSelect(selected ? null : entry.id)}
                type="button"
              >
                {selected ? (
                  <span className={styles.connector} aria-hidden="true" />
                ) : null}
                <span className={styles.entryTop}>
                  <span className={styles.entryIcon}>
                    <Icon aria-hidden="true" size={19} />
                  </span>
                  <span className={styles.entryMetric}>
                    <strong>{entry.metricValue}</strong>
                    <small>{entry.metricLabel}</small>
                  </span>
                </span>
                <span className={styles.entryLabel}>{entry.label}</span>
                <span className={styles.entryDescription}>
                  {entry.description}
                </span>
                <span className={styles.entryDetail}>{entry.detail}</span>
              </button>
            );
          })}
        </div>

        {selectedEntry ? (
          <section
            aria-label={`${selectedEntry.label} environment lifecycle surface`}
            className={styles.expandedSurface}
            id={expandedSurfaceId}
          >
            <div className={styles.expandedHeader}>
              <div>
                <p className={styles.expandedKicker}>{title}</p>
                <h3>{selectedEntry.label}</h3>
                <p>{selectedEntry.description}</p>
              </div>
              <button
                aria-label={`Close ${selectedEntry.label}`}
                className={styles.closeButton}
                onClick={() => onSelect(null)}
                title={`Close ${selectedEntry.label}`}
                type="button"
              >
                <X aria-hidden="true" size={17} />
              </button>
            </div>
            <div className={styles.expandedBody}>{children}</div>
          </section>
        ) : null}
      </div>
    </ConsoleShellPanel>
  );
}
