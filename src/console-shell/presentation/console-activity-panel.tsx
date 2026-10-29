"use client";

import { Download, History } from "lucide-react";

import {
  TerasDialog,
  TerasFilterBar,
  TerasUtilityButton,
} from "@/teras";
import type { GovernanceActivitySnapshot } from "@/governance-activity/governance-activity-types";

import {
  consoleActivityOutcomeLabels,
  type ConsoleActivityEvent,
  type ConsoleActivityOutcome,
} from "../activity/console-activity-model";
import {
  ConsoleShellPanel,
  ConsoleShellSectionTitle,
} from "../console-shell-panel";
import {activityPresentation} from "../activity/console-activity-view-model.ts";
import {useConsoleActivityController} from "../activity/use-console-activity-controller.ts";
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
  snapshot,
}: {
  snapshot: GovernanceActivitySnapshot;
}) {
  const {
    dialogOpen,outcome,setOutcome,query,setQuery,source,setSource,includeRoutine,setIncludeRoutine,
    recentEvents,visibleHead,hiddenRoutineCount,selectedEvent,filteredEvents,dialogSelectedEvent,
    sourceOptions,outcomeOptions,setSelectedEventId,openFullActivity,closeHistory,currentPage,
    pageNumber,loading,error,loadOlder,latest,exportActivity,
  }=useConsoleActivityController(snapshot);

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
              {activityDescription(snapshot)}
            </p>
            <p className={styles.description}>
              {hiddenRoutineCount > 0 ? `${hiddenRoutineCount} routine evidence reads are hidden from this loaded page. ` : ""}
              <TerasUtilityButton onClick={() => setIncludeRoutine(!includeRoutine)}>{includeRoutine ? "Show operator activity" : "Show all events"}</TerasUtilityButton>
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
                {visibleHead.length}
              </span>
            </div>
            <ActivityList
              emptyLabel="No operator activity in this loaded page. Show all events or open history to inspect older pages."
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
        description="OOS workflow activity and WGCF governance history. This window does not claim to include every Console action."
        height="fill"
        kicker="Governance Activity"
        onClose={closeHistory}
        open={dialogOpen}
        title="Activity History"
        width="wide"
      >
        <div className={styles.dialogLayout}>
          <div>
            <p className={styles.description} role="status">
              Loaded history page {pageNumber + 1}. Search and filters apply to this page only. Outcomes describe individual events, not overall project completion.
              {currentPage.truncated ? " Owner history is partial; this is not the complete audit history." : " No additional truncation reported for this page."}
              {!includeRoutine ? " Routine evidence reads are hidden; choose All events to inspect them." : " All event types in this page are shown."}
            </p>
            <details className={styles.references}>
              <summary>Source coverage and limits</summary>
              <dl>{currentPage.sources.map(source => <div key={source.sourceId}>
                <dt>{source.label}</dt>
                <dd>{source.state}; {source.truncated ? "additional records exist outside this source window" : "no source truncation reported"}. Owner: {source.authority}. Source: {source.sourceId}.</dd>
              </div>)}</dl>
            </details>
            {error ? <p role="alert" className={styles.description}>{error}</p> : null}
            <TerasUtilityButton disabled={loading || !currentPage.continuations?.length} onClick={() => void loadOlder()}>{loading ? "Loading older events" : "Older events"}</TerasUtilityButton>
            <TerasUtilityButton disabled={loading || pageNumber === 0} onClick={latest}>Back to latest</TerasUtilityButton>
          </div>
          <TerasFilterBar
            action={
              <TerasUtilityButton onClick={exportActivity}>
                <Download aria-hidden="true" size={13} />
                <span>Export JSON</span>
              </TerasUtilityButton>
            }
            filters={[
              { label: "Events", onValueChange: value => setIncludeRoutine(value === "all"), options: [{label: "Operator activity", value: "operator"}, {label: "All events", value: "all"}], value: includeRoutine ? "all" : "operator" },
              {
                label: "Source",
                onValueChange: setSource,
                options: sourceOptions,
                value: source,
              },
              {
                label: "Outcome",
                onValueChange: value => setOutcome(value as ConsoleActivityOutcome | "all"),
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
            <strong>{activityPresentation(event).title}</strong>
            <span>{activityPresentation(event).summary}</span>
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

  const display = activityPresentation(event);
  const references = [
    { label: "Original subject", value: event.subject.ref },
    { label: "Original action", value: event.action.label },
    { label: "Projected category", value: event.category },
    { label: "Original summary", value: event.summary },
    { label: "Source record", value: event.source.ref },
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
          <h3>{display.action}</h3>
        </div>
        <OutcomePill outcome={event.outcome} />
      </div>

      <div className={styles.subjectBlock}>
        <span>Subject</span>
        <strong>{display.subject}</strong>
      </div>

      <p className={styles.eventSummary}>{display.summary}</p>

      <dl className={styles.detailFacts}>
        <div>
          <dt>Occurred</dt>
          <dd>{fullDateTimeFormatter.format(new Date(event.occurredAt))} UTC</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{display.category}</dd>
        </div>
        <div>
          <dt>Actor</dt>
          <dd>{event.actor.ref}</dd>
        </div>
        <div>
          <dt>Evidence origin</dt>
          <dd>{event.durability === "source-projected" ? "Owner projection (source-projected)" : humanize(event.durability)}</dd>
        </div>
      </dl>

      <div className={styles.sourceBlock}>
        <span>Source authority</span>
        <strong>{event.source.authority}</strong>

      </div>

      {event.nextActions && event.nextActions.length > 0 ? (
        <div className={styles.sourceBlock}>
          <span>Next action</span>
          <strong>{humanize(event.nextActions[0].action)}</strong>
          <p>{event.nextActions[0].ownerRef}</p>
        </div>
      ) : null}

      {references.length > 0 ? (
        <details className={styles.references}>
          <summary>Technical evidence and original record</summary>
          <dl>
            {references.map((reference) => (
              <div key={`${reference.label}:${reference.value}`}>
                <dt>{reference.label}</dt>
                <dd title={reference.value}>{reference.value}</dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}
    </aside>
  );
}

function OutcomePill({ outcome }: { outcome: ConsoleActivityOutcome }) {
  return (
    <span className={styles.outcomePill} data-outcome={outcome} title="Outcome of this event; this does not establish overall workflow or project completion.">
      {consoleActivityOutcomeLabels[outcome]}
    </span>
  );
}

function humanize(value: string) {
  return value.replaceAll("-", " ");
}

function activityDescription(snapshot: GovernanceActivitySnapshot) {
  if (snapshot.observedAt === new Date(0).toISOString()) return "Loading activity from workflow and governance owners.";
  if (snapshot.mode === "disconnected-preview") {
    return "Disconnected preview of commands, receipts, state changes, blockers, and runtime changes.";
  }
  if (snapshot.status === "offline") {
    return "Owner activity could not be refreshed. Any retained events are from the last received page, not a current observation.";
  }
  if (snapshot.status === "partial") {
    const unavailable = snapshot.sources
      .filter((source) => source.state !== "current" || source.truncated)
      .map((source) => source.label);
    return unavailable.length > 0
      ? `Live owner activity is partial: ${unavailable.join(", ")}.`
      : "Live owner activity is partial or truncated.";
  }
  return "Live commands, receipts, state changes, blockers, and runtime changes from their owning systems.";
}
