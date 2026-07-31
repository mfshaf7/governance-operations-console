"use client";

import { useMemo, useState } from "react";
import { Download, History } from "lucide-react";

import {
  TerasDialog,
  TerasFilterBar,
  TerasUtilityButton,
} from "@/teras";
import { downloadConsoleBlob } from "@/console-integration/browser-download";

import {
  consoleActivityOutcomeLabels,
  consoleActivityTitle,
  filterConsoleActivity,
  type ConsoleActivityEvent,
  type ConsoleActivityOutcome,
} from "../activity/console-activity-model";
import {
  ConsoleShellPanel,
  ConsoleShellSectionTitle,
} from "../console-shell-panel";
import styles from "./console-activity-panel.module.css";

const recentActivityLimit = 8;

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
  minute: "2-digit",
  month: "short",
  timeZone: "UTC",
});

const fullDateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
  minute: "2-digit",
  month: "short",
  second: "2-digit",
  timeZone: "UTC",
  year: "numeric",
});

export function ConsoleActivityPanel({
  events,
}: {
  events: readonly ConsoleActivityEvent[];
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [outcome, setOutcome] = useState<ConsoleActivityOutcome | "all">("all");
  const [query, setQuery] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    events[0]?.eventId ?? null,
  );
  const [source, setSource] = useState("all");
  const recentEvents = events.slice(0, recentActivityLimit);
  const selectedEvent =
    events.find((event) => event.eventId === selectedEventId) ??
    events[0] ??
    null;
  const filteredEvents = useMemo(
    () =>
      filterConsoleActivity(events, {
        outcome,
        query,
        source,
      }),
    [events, outcome, query, source],
  );
  const dialogSelectedEvent =
    filteredEvents.find((event) => event.eventId === selectedEventId) ??
    filteredEvents[0] ??
    null;
  const sourceOptions = useMemo(() => {
    const labelsByOwner = new Map<string, string>();

    for (const event of events) {
      labelsByOwner.set(event.source.owner, event.source.label);
    }

    return [
      { label: "All sources", value: "all" },
      ...[...labelsByOwner.entries()]
        .sort((left, right) => left[1].localeCompare(right[1]))
        .map(([value, label]) => ({ label, value })),
    ];
  }, [events]);
  const outcomeOptions = useMemo(() => {
    const availableOutcomes = new Set(events.map((event) => event.outcome));

    return [
      { label: "All outcomes", value: "all" as const },
      ...Object.entries(consoleActivityOutcomeLabels)
        .filter(([value]) =>
          availableOutcomes.has(value as ConsoleActivityOutcome),
        )
        .map(([value, label]) => ({
          label,
          value: value as ConsoleActivityOutcome,
        })),
    ];
  }, [events]);

  function openFullActivity() {
    setSelectedEventId(selectedEvent?.eventId ?? events[0]?.eventId ?? null);
    setDialogOpen(true);
  }

  function exportActivity() {
    const exportedAt = new Date().toISOString();
    const payload = {
      eventCount: filteredEvents.length,
      events: filteredEvents,
      exportedAt,
      filters: {
        outcome,
        query: query.trim(),
        source,
      },
      schemaVersion: 1,
      scope: "governance-activity",
      source: "governance-operations-console",
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    downloadConsoleBlob(
      blob,
      `governance-activity-${exportedAt.slice(0, 10)}.json`,
    );
  }

  return (
    <>
      <ConsoleShellPanel className="lg:col-span-3">
        <div className={styles.header}>
          <div>
            <ConsoleShellSectionTitle
              kicker="Governance Activity"
              title="Material system events"
            />
            <p className={styles.description}>
              Commands, receipts, state changes, blockers, and runtime changes
              projected from their owning console domains.
            </p>
          </div>
          <button
            className={styles.viewAllButton}
            onClick={openFullActivity}
            type="button"
          >
            <History aria-hidden="true" size={14} />
            View all activity
          </button>
        </div>

        <div className={styles.layout}>
          <section
            aria-label="Recent governance activity"
            className={styles.recentSurface}
          >
            <div className={styles.surfaceHeader}>
              <span>Recent activity</span>
              <span>
                {Math.min(recentEvents.length, recentActivityLimit)} of{" "}
                {events.length}
              </span>
            </div>
            <ActivityList
              events={recentEvents}
              onSelect={setSelectedEventId}
              selectedEventId={selectedEvent?.eventId ?? null}
            />
          </section>

          <ActivityDetail event={selectedEvent} />
        </div>
      </ConsoleShellPanel>

      <TerasDialog
        contentOverflow="hidden"
        description="Material activity projected from console domain receipts, state transitions, and runtime records."
        height="fill"
        kicker="Governance Activity"
        onClose={() => setDialogOpen(false)}
        open={dialogOpen}
        title="Activity History"
        width="wide"
      >
        <div className={styles.dialogLayout}>
          <TerasFilterBar
            action={
              <TerasUtilityButton onClick={exportActivity}>
                <Download aria-hidden="true" size={13} />
                <span>Export JSON</span>
              </TerasUtilityButton>
            }
            filters={[
              {
                label: "Source",
                onValueChange: setSource,
                options: sourceOptions,
                value: source,
              },
              {
                label: "Outcome",
                onValueChange: setOutcome,
                options: outcomeOptions,
                value: outcome,
              },
            ]}
            search={{
              ariaLabel: "Search governance activity",
              onValueChange: setQuery,
              placeholder: "Search activity",
              value: query,
            }}
          />

          <div className={styles.dialogContent}>
            <section
              aria-label="Governance activity history"
              className={styles.historySurface}
            >
              <div className={styles.surfaceHeader}>
                <span>Activity history</span>
                <span>
                  {filteredEvents.length}{" "}
                  {filteredEvents.length === 1 ? "event" : "events"}
                </span>
              </div>
              <ActivityList
                emptyLabel="No activity matches the current filters."
                events={filteredEvents}
                onSelect={setSelectedEventId}
                selectedEventId={dialogSelectedEvent?.eventId ?? null}
              />
            </section>

            <ActivityDetail event={dialogSelectedEvent} />
          </div>
        </div>
      </TerasDialog>
    </>
  );
}

function ActivityList({
  emptyLabel = "No material activity has been recorded.",
  events,
  onSelect,
  selectedEventId,
}: {
  emptyLabel?: string;
  events: readonly ConsoleActivityEvent[];
  onSelect: (eventId: string) => void;
  selectedEventId: string | null;
}) {
  if (events.length === 0) {
    return <p className={styles.emptyState}>{emptyLabel}</p>;
  }

  return (
    <div className={styles.activityList}>
      {events.map((event) => (
        <button
          aria-pressed={event.eventId === selectedEventId}
          className={styles.activityRow}
          data-selected={event.eventId === selectedEventId}
          key={event.eventId}
          onClick={() => onSelect(event.eventId)}
          type="button"
        >
          <span className={styles.rowMeta}>
            <time
              dateTime={event.occurredAt}
              title={fullDateTimeFormatter.format(new Date(event.occurredAt))}
            >
              {dateTimeFormatter.format(new Date(event.occurredAt))}
            </time>
            <span title={event.source.label}>{event.source.label}</span>
          </span>
          <span className={styles.rowContent}>
            <strong>{consoleActivityTitle(event)}</strong>
            <span>{event.summary}</span>
          </span>
          <OutcomePill outcome={event.outcome} />
        </button>
      ))}
    </div>
  );
}

function ActivityDetail({
  event,
}: {
  event: ConsoleActivityEvent | null;
}) {
  if (!event) {
    return (
      <aside className={styles.detailSurface}>
        <p className={styles.emptyState}>
          Select an activity event to inspect its source facts.
        </p>
      </aside>
    );
  }

  const references = [
    event.receiptRef
      ? { label: "Receipt", value: event.receiptRef }
      : null,
    event.correlationId
      ? { label: "Correlation", value: event.correlationId }
      : null,
    event.causationId
      ? { label: "Causation", value: event.causationId }
      : null,
    ...event.evidenceRefs.map((value, index) => ({
      label: `Evidence ${index + 1}`,
      value,
    })),
  ].filter((reference): reference is { label: string; value: string } =>
    Boolean(reference),
  );

  return (
    <aside className={styles.detailSurface}>
      <div className={styles.detailHeader}>
        <div>
          <span className={styles.detailKicker}>Selected event</span>
          <h3>{event.action.label}</h3>
        </div>
        <OutcomePill outcome={event.outcome} />
      </div>

      <div className={styles.subjectBlock}>
        <span>Subject</span>
        <strong>{event.subject.label}</strong>
        <p>{event.subject.ref}</p>
      </div>

      <p className={styles.eventSummary}>{event.summary}</p>

      <dl className={styles.detailFacts}>
        <div>
          <dt>Occurred</dt>
          <dd>{fullDateTimeFormatter.format(new Date(event.occurredAt))} UTC</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{humanize(event.category)}</dd>
        </div>
        <div>
          <dt>Actor</dt>
          <dd>{event.actor.ref}</dd>
        </div>
        <div>
          <dt>Durability</dt>
          <dd>{humanize(event.durability)}</dd>
        </div>
      </dl>

      <div className={styles.sourceBlock}>
        <span>Source authority</span>
        <strong>{event.source.authority}</strong>
        <p title={event.source.ref}>{event.source.ref}</p>
      </div>

      {references.length > 0 ? (
        <div className={styles.references}>
          <span>References</span>
          <dl>
            {references.map((reference) => (
              <div key={`${reference.label}:${reference.value}`}>
                <dt>{reference.label}</dt>
                <dd title={reference.value}>{reference.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </aside>
  );
}

function OutcomePill({ outcome }: { outcome: ConsoleActivityOutcome }) {
  return (
    <span className={styles.outcomePill} data-outcome={outcome}>
      {consoleActivityOutcomeLabels[outcome]}
    </span>
  );
}

function humanize(value: string) {
  return value.replaceAll("-", " ");
}
