import { ControlBoardPlanningCalendar, type PlanningCalendarBand } from "@/product-apps/control-board/control-board-planning-calendar";
import type { DeliveryCatalogValue } from "../../domain/delivery-catalog.ts";
import { iterationCatalogId, piPlanningDateCatalogId } from "../../work-model/catalog/catalog-selectors.ts";
import { calendarDateNumber, calendarDateRange } from "../../work-model/catalog/planning-calendar.ts";

function dateRange(start: number, end: number) {
  return calendarDateRange(new Date(start).toISOString().slice(0, 10), new Date(end).toISOString().slice(0, 10));
}

export function DeliveryPlanningCalendar({ catalogValues, pi, startDate, iterations, onSelectStart, disabled }: {
  catalogValues: readonly DeliveryCatalogValue[];
  pi: string;
  startDate: string;
  iterations: readonly NonNullable<DeliveryCatalogValue["iteration_window"]>[];
  onSelectStart?: (date: string) => void;
  disabled?: boolean;
}) {
  const saved = catalogValues.flatMap((value): PlanningCalendarBand[] => {
    const label = value.parent_catalog_value_key;
    if (value.catalog_item_id !== piPlanningDateCatalogId || !label || !/^PI-\d{4}-\d{2}$/.test(label) ||
        value.lifecycle_state === "missing") return [];
    const [start, end] = value.value_key.split(/\.\.|\//).map(calendarDateNumber);
    return Number.isFinite(start) && Number.isFinite(end) && start <= end
      ? [{ id: value.catalog_value_id, label, start, end, dates: dateRange(start, end), kind: "other" }]
      : [];
  });
  const selectedPI = saved.find(window => window.label === pi);
  const usageByKey = new Map(catalogValues.filter(value => value.catalog_item_id === iterationCatalogId)
    .map(value => [value.value_key, value.usage_count]));
  const planned = iterations.flatMap((iteration): PlanningCalendarBand[] => {
    const start = calendarDateNumber(iteration.start_date);
    const end = calendarDateNumber(iteration.end_date);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return [];
    const label = `Iteration ${iteration.sequence}`;
    return [{
      id: String(iteration.sequence), label, start, end, dates: dateRange(start, end), kind: "iteration",
      sequence: iteration.sequence,
      assignments: usageByKey.get(`${pi} / ${label}`) ?? 0,
    }];
  });
  const surrounding = saved.filter(window => window.label !== pi);
  const draftStart = planned[0]?.start;
  const draftEnd = planned.at(-1)?.end;
  const overlaps = surrounding.flatMap((window): PlanningCalendarBand[] => {
    if (!onSelectStart || draftStart === undefined || draftEnd === undefined) return [];
    const start = Math.max(draftStart, window.start);
    const end = Math.min(draftEnd, window.end);
    return start <= end ? [
      { id: `${window.id}-overlap`, label: `Overlap with ${window.label}`, start, end, dates: dateRange(start, end), kind: "overlap" },
    ] : [];
  });

  return <ControlBoardPlanningCalendar pi={pi} hasSavedDates={Boolean(selectedPI)}
    anchor={(onSelectStart || selectedPI) && Number.isFinite(calendarDateNumber(startDate)) ? startDate : ""}
    disabled={disabled} onSelectStart={onSelectStart}
    bands={[
      ...planned,
      ...(!onSelectStart && !planned.length && selectedPI ? [{ ...selectedPI, kind: "pi" as const }] : []),
      ...surrounding,
      ...overlaps,
    ]} />;
}
