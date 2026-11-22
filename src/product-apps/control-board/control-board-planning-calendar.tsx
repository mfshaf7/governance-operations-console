"use client";

import { useEffect, useState } from "react";
import { TerasActionButton, TerasActionRow, TerasContentTray, TerasEmptyState, TerasMetadataList, TerasSelectField } from "@/teras";
import styles from "./control-board-planning-calendar.module.css";

export type PlanningCalendarBand = {
  id: string;
  label: string;
  start: number;
  end: number;
  dates: string;
  kind: "iteration" | "pi" | "other" | "overlap";
  sequence?: number;
  assignments?: number;
};

const dayMs = 86_400_000;
const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const monthFormat = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric", timeZone: "UTC" });
const dayFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeZone: "UTC" });
const isoDate = (time: number) => new Date(time).toISOString().slice(0, 10);

function shiftMonth(month: string, distance: number) {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + distance);
  return date.getUTCFullYear() >= 0 && date.getUTCFullYear() <= 9999 ? isoDate(date.getTime()).slice(0, 7) : month;
}

export function ControlBoardPlanningCalendar({ bands, pi, anchor, hasSavedDates, onSelectStart, disabled }: {
  bands: readonly PlanningCalendarBand[];
  pi: string;
  anchor: string;
  hasSavedDates: boolean;
  onSelectStart?: (date: string) => void;
  disabled?: boolean;
}) {
  const isSetup = Boolean(onSelectStart);
  const [selectedBand, setSelectedBand] = useState("");
  const [month, setMonth] = useState(() => (anchor || new Date().toISOString()).slice(0, 7));
  useEffect(() => {
    if (anchor) setMonth(anchor.slice(0, 7));
  }, [anchor]);

  const planned = bands.filter(band => band.kind === "iteration");
  const details = bands.find(band => band.id === selectedBand);
  const first = Date.parse(`${month}-01`);
  const endOfMonth = new Date(first);
  endOfMonth.setUTCMonth(endOfMonth.getUTCMonth() + 1, 0);
  const last = endOfMonth.getTime();
  const offset = (new Date(first).getUTCDay() + 6) % 7;
  const weekCount = Math.ceil((offset + endOfMonth.getUTCDate()) / 7);
  const previous = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);
  const monthLabel = <span aria-live="polite">{monthFormat.format(first)}</span>;

  return (
    <div className={styles.layout}>
      <TerasContentTray className={styles.month} kicker={isSetup ? "Calendar preview" : undefined}
        title={isSetup ? monthLabel : pi || "Planning calendar"} description={isSetup ? undefined : monthLabel}
        actions={<TerasActionRow spacing="tight">
          <TerasActionButton size="table-compact" emphasis="secondary" aria-label="Previous month"
            disabled={month === previous} onClick={() => setMonth(previous)}>‹</TerasActionButton>
          <TerasActionButton size="table-compact" emphasis="secondary" aria-label="Next month"
            disabled={month === next} onClick={() => setMonth(next)}>›</TerasActionButton>
        </TerasActionRow>}>
        <div className={styles.grid} role="group" aria-label={`${monthFormat.format(first)} calendar`}>
          <div className={styles.weekdays} aria-hidden="true">{weekDays.map(label => <span key={label}>{label}</span>)}</div>
          {Array.from({ length: weekCount }, (_, week) => {
            const weekStart = first + (week * 7 - offset) * dayMs;
            const weekEnd = weekStart + 6 * dayMs;
            const visibleStart = Math.max(first, weekStart);
            const visibleEnd = Math.min(last, weekEnd);
            return <div key={weekStart} className={styles.week}>
              <div className={styles.days}>
                {Array.from({ length: 7 }, (_, index) => {
                  const date = weekStart + index * dayMs;
                  if (date < first || date > last) return <span key={date} />;
                  const number = new Date(date).getUTCDate();
                  const dateText = isoDate(date);
                  const isStart = dateText === anchor;
                  return onSelectStart
                    ? <button className={styles.day} type="button" key={date} aria-label={`Set start to ${dayFormat.format(date)}`}
                        aria-pressed={isStart} disabled={disabled} onClick={() => onSelectStart(dateText)}>{number}</button>
                    : <span className={styles.day} key={date} data-start={isStart} title={dayFormat.format(date)}>{number}</span>;
                })}
              </div>
              <div className={styles.bands}>
                {bands.filter(band => band.start <= visibleEnd && band.end >= visibleStart).map(band => {
                  const column = (date: number) => (date - weekStart) / dayMs + 1;
                  return <button key={band.id} type="button" className={styles.band} data-kind={band.kind}
                    data-iteration-color={band.sequence === undefined ? undefined : (band.sequence - 1) % 5}
                    aria-pressed={details?.id === band.id}
                    aria-label={`${band.label}, ${band.dates}`}
                    title={band.label}
                    style={{ gridColumn: `${column(Math.max(visibleStart, band.start))} / ${column(Math.min(visibleEnd, band.end)) + 1}` }}
                    onClick={() => setSelectedBand(band.id)}>
                    {band.label}
                  </button>;
                })}
              </div>
            </div>;
          })}
        </div>
      </TerasContentTray>
      <div className={styles.details}>
        {planned.length > 0 && <TerasSelectField label="Jump to iteration" value={details?.kind === "iteration" ? details.id : ""}
          options={[{ value: "", label: "Select an iteration" }, ...planned.map(band => ({ value: band.id, label: band.label }))]}
          onValueChange={id => {
            const band = planned.find(candidate => candidate.id === id);
            setSelectedBand(id);
            if (band) setMonth(isoDate(band.start).slice(0, 7));
          }} />}
        {details ? <div aria-live="polite"><TerasMetadataList columns={1} items={[
          { label: details.label, value: details.dates },
          ...(details.assignments !== undefined ? [{ label: "Recorded assignments", value: String(details.assignments) }] : []),
        ]} /></div>
          : <TerasEmptyState>{isSetup
            ? planned.length ? "Select an iteration to see its dates and recorded assignments."
              : "Select a start date and enter the cadence to preview iterations."
            : hasSavedDates ? planned.length ? "Select an iteration to see its dates and recorded assignments."
              : "This PI has saved dates and no dated iterations."
            : pi ? `${pi} has no saved calendar dates.` : "There is no PI selected."}</TerasEmptyState>}
      </div>
    </div>
  );
}
