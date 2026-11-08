"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import styles from "./teras-patterns.module.css";
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

type Column = { key: string; intent?: TerasRecordTableColumnIntent };
type Widths = Record<string, number>;
const maximum = 10000;
const preferences = new Map<string, Widths>();
const defaults: Record<TerasRecordTableColumnIntent, number> = {
  index: 56, primary: 320, secondary: 184, evidence: 192,
  technical: 152, chips: 152, metric: 104, status: 136, action: 152,
};
const minimums: Record<TerasRecordTableColumnIntent, number> = {
  index: 48, primary: 160, secondary: 128, evidence: 128,
  technical: 112, chips: 112, metric: 88, status: 96, action: 112,
};

function readPreference(key: string): Widths {
  if (preferences.has(key)) return preferences.get(key)!;
  let widths: Widths = {};
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(key) ?? "{}");
    if (stored && typeof stored === "object" && !Array.isArray(stored)) {
      widths = Object.fromEntries(Object.entries(stored).filter(([, value]) =>
        typeof value === "number" && Number.isFinite(value) && value >= 48 && value <= maximum));
    }
  } catch { /* Widths are optional presentation preferences. */ }
  preferences.set(key, widths);
  return widths;
}

function intrinsicWidth(element: HTMLElement, context: CanvasRenderingContext2D) {
  const style = getComputedStyle(element);
  context.font = style.font || `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  let text = element.textContent ?? "";
  if (style.textTransform === "uppercase") text = text.toUpperCase();
  const textWidth = context.measureText(text).width + Math.max(0, text.length - 1) * (parseFloat(style.letterSpacing) || 0);
  const icons = Array.from(element.querySelectorAll("svg")).reduce((sum, svg) => sum + svg.getBoundingClientRect().width + (parseFloat(style.columnGap) || 0), 0);
  return Math.ceil(Math.max(parseFloat(style.minWidth) || 0,
    textWidth + icons + (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0) + 2));
}

export function useRecordTableSizing(ariaLabel: string, columns: Column[]) {
  const shellRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const [sizes, setSizes] = useState<{ widths: number[]; minima: number[] }>({ widths: [], minima: [] });
  const saved = useRef<Widths>({});
  const drag = useRef<{ index: number; pointerId: number; x: number; widths: number[]; next: number[]; moved: boolean } | null>(null);
  const frame = useRef<number | null>(null);
  const key = `console.table-widths.v1:${ariaLabel}`;
  const schema = columns.map(column => `${column.key}:${column.intent}`).join("|");
  const [available, setAvailable] = useState(0);

  useLayoutEffect(() => {
    saved.current = readPreference(key);
    const shell = shellRef.current;
    if (!shell) return;
    const observer = new ResizeObserver(() => setAvailable(Math.round(shell.clientWidth)));
    setAvailable(Math.round(shell.clientWidth));
    observer.observe(shell);
    let mounted = true;
    void document.fonts.ready.then(() => { if (mounted) setSizes(previous => ({ ...previous })); });
    return () => { mounted = false; observer.disconnect(); if (frame.current !== null) cancelAnimationFrame(frame.current); };
  }, [key, schema]);

  // Measure only intrinsic controls, never stretched cell widths. New pages may
  // contain longer status labels; those controls must still fit after resizing.
  useLayoutEffect(() => {
    const table = tableRef.current;
    if (!table || !available || drag.current) return;
    const context = document.createElement("canvas").getContext("2d");
    const minima = columns.map((column, index) => {
      let minimum = minimums[column.intent ?? "secondary"];
      if (context) {
        const header = table.tHead?.rows[0]?.cells[index]?.querySelector<HTMLElement>("[data-column-label]");
        if (header) minimum = Math.max(minimum, intrinsicWidth(header, context) + 40);
        for (const row of Array.from(table.tBodies[0]?.rows ?? [])) {
          const cell = row.cells[index];
          if (!cell) continue;
          const gutter = parseFloat(getComputedStyle(cell).paddingLeft) + parseFloat(getComputedStyle(cell).paddingRight);
          if (column.intent === "index") minimum = Math.max(minimum, intrinsicWidth(cell, context));
          for (const control of cell.querySelectorAll<HTMLElement>(`button, .${styles.statusPill}`)) {
            minimum = Math.max(minimum, intrinsicWidth(control, context) + gutter);
          }
        }
      }
      return Math.min(maximum, Math.ceil(minimum));
    });
    const widths = columns.map((column, index) => Math.max(minima[index], saved.current[column.key] ?? defaults[column.intent ?? "secondary"]));
    const flexible = columns.map((column, index) => ({ index, weight: column.intent === "primary" ? 3 : ["evidence", "secondary", "technical", "chips"].includes(column.intent ?? "secondary") ? 1 : 0 }))
      .filter(({ index, weight }) => weight && saved.current[columns[index].key] === undefined);
    const spare = available - widths.reduce((sum, width) => sum + width, 0);
    if (spare > 0 && flexible.length) {
      const weight = flexible.reduce((sum, column) => sum + column.weight, 0);
      for (const column of flexible) widths[column.index] = Math.min(maximum, widths[column.index] + Math.floor(spare * column.weight / weight));
      const remainder = available - widths.reduce((sum, width) => sum + width, 0);
      const first = flexible[0].index;
      widths[first] = Math.min(maximum, widths[first] + remainder);
    }
    // Responsive defaults shrink flexible columns first. Manual widths stay put.
    let deficit = widths.reduce((sum, width) => sum + width, 0) - available;
    for (const { index } of [...flexible].reverse()) {
      const floor = columns[index].intent === "primary" ? Math.max(240, minima[index]) : minima[index];
      const reduction = Math.min(Math.max(0, deficit), Math.max(0, widths[index] - floor));
      widths[index] -= reduction; deficit -= reduction;
    }
    // Older preferences can describe a table narrower than its frame. Keep
    // the outside edge anchored even when every width has been remembered.
    const unfilled = available - widths.reduce((sum, width) => sum + width, 0);
    if (unfilled > 0 && widths.length) {
      const primary = columns.findIndex(column => column.intent === "primary");
      widths[primary < 0 ? widths.length - 1 : primary] += unfilled;
    }
    setSizes(previous => JSON.stringify(previous) === JSON.stringify({ widths, minima }) ? previous : { widths, minima });
  });

  function apply(widths: number[]) {
    const table = tableRef.current;
    if (!table) return;
    table.style.width = `${widths.reduce((sum, width) => sum + width, 0)}px`;
    table.querySelectorAll("col").forEach((col, index) => { col.style.width = `${widths[index]}px`; });
    table.querySelectorAll("[role=separator]").forEach((handle, index) => handle.setAttribute("aria-valuenow", String(Math.round(widths[index]))));
  }

  function persist(next: Widths) {
    saved.current = next;
    preferences.set(key, next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* Keep the in-memory preference if storage is unavailable. */ }
    // Run layout again, including reset-to-responsive defaults.
    setSizes(previous => ({ ...previous }));
  }

  function saveWidths(widths: number[]) {
    persist(Object.fromEntries(columns.map((column, index) => [column.key, widths[index]])));
  }

  function finish(event: PointerEvent<HTMLElement>, cancel = false) {
    const active = drag.current;
    if (!active || event.pointerId !== active.pointerId) return;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    drag.current = null;
    if (shellRef.current) delete shellRef.current.dataset.resizing;
    apply(cancel ? active.widths : active.next);
    if (!cancel && active.moved) saveWidths(active.next);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function reset(index: number) {
    const next = { ...saved.current };
    delete next[columns[index].key];
    delete next[columns[index + 1].key];
    persist(next);
  }

  function bounds(index: number, widths = sizes.widths) {
    const total = (widths[index] ?? defaults[columns[index].intent ?? "secondary"]) + (widths[index + 1] ?? defaults[columns[index + 1].intent ?? "secondary"]);
    return {
      min: Math.max(sizes.minima[index] ?? 48, total - maximum),
      max: Math.min(maximum, total - (sizes.minima[index + 1] ?? 48)),
    };
  }

  // A divider transfers space between its neighboring columns. The table's
  // outside edge never moves during a resize, including the final divider.
  function resizePair(widths: number[], index: number, desired: number) {
    const next = [...widths];
    const limit = bounds(index, widths);
    next[index] = Math.min(limit.max, Math.max(limit.min, desired));
    next[index + 1] = widths[index] + widths[index + 1] - next[index];
    return next;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>, index: number) {
    if (event.key === "Escape" && drag.current) {
      apply(drag.current.widths); drag.current = null;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
      if (shellRef.current) delete shellRef.current.dataset.resizing;
      event.preventDefault(); return;
    }
    if (drag.current) return;
    if (event.key === "Enter") { event.preventDefault(); reset(index); return; }
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault(); event.stopPropagation();
    saveWidths(resizePair(sizes.widths, index,
      sizes.widths[index] + (event.key === "ArrowLeft" ? -1 : 1) * (event.shiftKey ? 50 : 10)));
  }

  return { shellRef, tableRef, sizes, bounds, handleProps: (index: number) => ({
    onDoubleClick: () => reset(index),
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => handleKeyDown(event, index),
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.button !== 0 || drag.current || !sizes.widths.length) return;
      event.preventDefault(); event.stopPropagation(); event.currentTarget.focus();
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { index, pointerId: event.pointerId, x: event.clientX, widths: [...sizes.widths], next: [...sizes.widths], moved: false };
      if (shellRef.current) shellRef.current.dataset.resizing = "true";
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      const active = drag.current; if (!active || event.pointerId !== active.pointerId) return;
      const delta = event.clientX - active.x;
      active.moved ||= Math.abs(delta) > 2;
      active.next = resizePair(active.widths, index, active.widths[index] + delta);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => { apply(active.next); frame.current = null; });
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => finish(event),
    onPointerCancel: (event: PointerEvent<HTMLElement>) => finish(event, true),
    onLostPointerCapture: (event: PointerEvent<HTMLElement>) => finish(event, true),
  }) };
}
