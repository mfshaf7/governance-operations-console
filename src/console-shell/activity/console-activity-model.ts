import type {
  ConsoleActivityEvent,
  ConsoleActivityOutcome,
} from "../../console-integration/activity-contract";

export type {
  ConsoleActivityActorKind,
  ConsoleActivityCategory,
  ConsoleActivityEvent,
  ConsoleActivityOutcome,
  ConsoleActivitySourceMode,
} from "../../console-integration/activity-contract";

export type ConsoleActivityFilters = Readonly<{
  outcome: ConsoleActivityOutcome | "all";
  query: string;
  source: string;
}>;

export const consoleActivityOutcomeLabels: Readonly<
  Record<ConsoleActivityOutcome, string>
> = {
  blocked: "Blocked",
  failed: "Failed",
  informational: "Recorded",
  stale: "Stale",
  started: "Started",
  succeeded: "Succeeded",
  waiting: "Waiting",
};

export function consoleActivityTitle(event: ConsoleActivityEvent) {
  return `${event.action.label} · ${event.subject.label}`;
}

export function projectConsoleActivity(
  sourceEvents: readonly ConsoleActivityEvent[],
): ConsoleActivityEvent[] {
  const eventsById = new Map<string, ConsoleActivityEvent>();

  for (const event of sourceEvents) {
    if (!event.eventId.trim() || Number.isNaN(Date.parse(event.occurredAt))) {
      continue;
    }

    eventsById.set(event.eventId, event);
  }

  return [...eventsById.values()].sort(
    (left, right) =>
      Date.parse(right.occurredAt) - Date.parse(left.occurredAt) ||
      left.eventId.localeCompare(right.eventId),
  );
}

export function filterConsoleActivity(
  events: readonly ConsoleActivityEvent[],
  filters: ConsoleActivityFilters,
) {
  const query = filters.query.trim().toLocaleLowerCase();

  return events.filter((event) => {
    const matchesOutcome =
      filters.outcome === "all" || event.outcome === filters.outcome;
    const matchesSource =
      filters.source === "all" || event.source.owner === filters.source;
    const searchable = [
      event.action.id,
      event.action.label,
      event.actor.ref,
      event.category,
      event.causationId,
      event.correlationId,
      event.eventId,
      event.outcome,
      event.receiptRef,
      event.source.authority,
      event.source.label,
      event.source.owner,
      event.subject.label,
      event.subject.ref,
      event.summary,
      ...event.evidenceRefs,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase();

    return matchesOutcome && matchesSource && (!query || searchable.includes(query));
  });
}
