import type { DeliveryCatalogValue } from "../../domain/delivery-catalog.ts";
import { iterationCatalogId, piPlanningDateCatalogId, targetPiCatalogId } from "./catalog-selectors.ts";

const day = 86_400_000;

export const backlogIterationLabel = "Not committed to a PI iteration yet.";

export function recordedPlanningIteration(value: string | null | undefined, backlog = backlogIterationLabel) {
  return value?.trim() && value !== backlog ? value : null;
}

export function calendarDateNumber(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NaN;
  const timestamp = Date.parse(date);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().startsWith(date) ? timestamp : NaN;
}

export function datedIterationIndex(values: readonly DeliveryCatalogValue[]) {
  const piWindows = new Map<string, { start: number; end: number }>();
  for (const value of values) {
    const pi = value.parent_catalog_value_key;
    if (value.catalog_item_id !== piPlanningDateCatalogId || !pi ||
        !["active", "admitted", "read_only"].includes(value.lifecycle_state)) continue;
    const [start, end] = value.value_key.split(/\.\.|\//).map(calendarDateNumber);
    if (start <= end) piWindows.set(pi, { start, end });
  }
  const dated = new Map<string, { pi: string; window: NonNullable<DeliveryCatalogValue["iteration_window"]> }>();
  for (const value of values) {
    const pi = value.parent_catalog_value_key;
    const window = value.iteration_window;
    const bounds = pi ? piWindows.get(pi) : undefined;
    if (value.catalog_item_id !== iterationCatalogId || value.lifecycle_state !== "active" ||
        !pi || !window || !bounds || !value.value_key.startsWith(`${pi} / `)) continue;
    const start = calendarDateNumber(window.start_date);
    const end = calendarDateNumber(window.end_date);
    if (start >= bounds.start && end <= bounds.end && start <= end) dated.set(value.value_key, { pi, window });
  }
  return dated;
}

export function iterationWindows(start: string, iterationLengthDays: number, count: number) {
  const first = calendarDateNumber(start);
  if (!Number.isFinite(first) || !Number.isSafeInteger(iterationLengthDays) || iterationLengthDays < 1 ||
      !Number.isSafeInteger(count) || count < 1 || count > 100) return [];
  const last = first + (iterationLengthDays * count - 1) * day;
  if (!Number.isSafeInteger(last) || last > Date.UTC(9999, 11, 31)) return [];
  return Array.from({ length: count }, (_, index) => {
    const startDate = first + index * iterationLengthDays * day;
    const endDate = startDate + (iterationLengthDays - 1) * day;
    return {
      sequence: index + 1,
      start_date: new Date(startDate).toISOString().slice(0, 10),
      end_date: new Date(endDate).toISOString().slice(0, 10),
    };
  });
}

export function recordedIterationLabels(values: readonly DeliveryCatalogValue[], pi: string) {
  if (!pi) return [];
  const prefix = `${pi} / `;
  return values.filter(value => value.catalog_item_id === iterationCatalogId &&
    value.usage_count > 0 && value.value_key.startsWith(prefix) &&
    (!value.parent_catalog_value_key || value.parent_catalog_value_key === pi));
}

export function overlappingPlanningIncrement(
  start: string,
  end: string,
  pi: string,
  values: readonly DeliveryCatalogValue[],
) {
  const first = calendarDateNumber(start);
  const last = calendarDateNumber(end);
  if (!Number.isFinite(first) || !Number.isFinite(last) || last < first) return null;
  const overlap = values.find(value => {
    if (value.catalog_item_id !== piPlanningDateCatalogId || value.lifecycle_state === "missing" ||
        value.parent_catalog_value_key === pi || !/^PI-\d{4}-\d{2}$/.test(value.parent_catalog_value_key ?? "")) return false;
    const [otherStart, otherEnd] = value.value_key.split(/\.\.|\//).map(calendarDateNumber);
    return otherStart <= last && otherEnd >= first;
  });
  return overlap?.parent_catalog_value_key ?? null;
}

export function nextPlanningIncrementName(startDate: string, values: readonly DeliveryCatalogValue[]) {
  if (!Number.isFinite(calendarDateNumber(startDate))) return "";
  const year = startDate.slice(0, 4);
  const prefix = `PI-${year}-`;
  const last = Math.max(0, ...values.filter(value => value.catalog_item_id === targetPiCatalogId && value.value_key.startsWith(prefix))
    .map(value => value.value_key.slice(prefix.length)).filter(sequence => /^\d{2}$/.test(sequence)).map(Number));
  return last < 99 ? `${prefix}${String(last + 1).padStart(2, "0")}` : "";
}

export function calendarDateRange(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  return formatter.formatRange(new Date(start), new Date(end));
}

export function currentPlanningIncrement(values: readonly DeliveryCatalogValue[]) {
  const now = new Date();
  const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
  return values.find(value => {
    if (value.catalog_item_id !== piPlanningDateCatalogId || !["active", "admitted", "read_only"].includes(value.lifecycle_state)) return false;
    const [start, end] = value.value_key.split(/\.\.|\//);
    return Number.isFinite(calendarDateNumber(start)) && Number.isFinite(calendarDateNumber(end)) && start <= today && today <= end;
  })?.parent_catalog_value_key ?? null;
}
