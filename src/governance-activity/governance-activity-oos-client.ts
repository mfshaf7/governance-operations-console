import {
  consoleOosModeSelected,
  resolveConsoleOosConnection,
} from "../console-integration/configuration/console-runtime-configuration.ts";
import type { ConsoleActivityEvent } from "../console-integration/activity-contract.ts";
import {
  consoleMutationAttributionHeaders,
} from "../console-integration/identity/server/console-session-authorization.ts";
import type { GovernanceActivitySource } from "./governance-activity-types.ts";
import {
  array,
  boolean,
  GovernanceActivityValidationError,
  integer,
  invalid,
  nullableText,
  nullableTimestamp,
  oneOf,
  record,
  text,
  timestamp,
} from "./governance-activity-validation.ts";

const pageLimit = 5;
const pageSize = 100;
const requestTimeoutMs = 8_000;

export type OosGovernanceActivityProjection = Readonly<{
  events: readonly ConsoleActivityEvent[];
  observedAt: string;
  sources: readonly GovernanceActivitySource[];
  status: "current" | "partial";
  truncated: boolean;
}>;

export function governanceActivityOosConfigured(
  env: NodeJS.ProcessEnv = process.env,
) {
  return consoleOosModeSelected(env);
}

export async function listOosGovernanceActivity({
  env = process.env,
  fetchImpl = fetch,
}: {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
} = {}): Promise<OosGovernanceActivityProjection> {
  const config = resolveConsoleOosConnection(env);
  const events = new Map<string, ConsoleActivityEvent>();
  const sources = new Map<string, GovernanceActivitySource>();
  let cursor: string | null = null;
  let observedAt = new Date(0).toISOString();
  let status: "current" | "partial" = "current";

  for (let page = 0; page < pageLimit; page += 1) {
    const query = new URLSearchParams({ limit: String(pageSize) });
    if (cursor) query.set("cursor", cursor);
    const payload = await oosRequest(
      config,
      `/v1/workflow-activity?${query.toString()}`,
      fetchImpl,
    );
    const projection = parseOosPage(payload);
    if (projection.observedAt > observedAt) observedAt = projection.observedAt;
    if (projection.status === "partial") status = "partial";

    for (const event of projection.events) {
      const existing = events.get(event.eventId);
      if (existing && JSON.stringify(existing) !== JSON.stringify(event)) {
        invalid(`OOS activity event ${event.eventId} has conflicting projections.`);
      }
      events.set(event.eventId, event);
    }
    for (const source of projection.sources) {
      const existing = sources.get(source.sourceId);
      if (
        existing &&
        (existing.authority !== source.authority ||
          existing.owner !== source.owner ||
          existing.state !== source.state ||
          existing.errorCode !== source.errorCode)
      ) {
        invalid(`OOS activity source ${source.sourceId} changed within one read.`);
      }
      sources.set(source.sourceId, {
        ...source,
        eventCount: Math.max(existing?.eventCount ?? 0, source.eventCount),
        observedAt:
          existing && existing.observedAt > source.observedAt
            ? existing.observedAt
            : source.observedAt,
        truncated: Boolean(existing?.truncated || source.truncated),
      });
    }

    cursor = projection.nextCursor;
    if (!cursor) {
      return {
        events: sortEvents([...events.values()]),
        observedAt,
        sources: sortSources([...sources.values()]),
        status,
        truncated: [...sources.values()].some((source) => source.truncated),
      };
    }
  }

  return {
    events: sortEvents([...events.values()]),
    observedAt,
    sources: sortSources([...sources.values()]),
    status: "partial",
    truncated: true,
  };
}

function parseOosPage(value: unknown) {
  const page = record(value, "OOS workflow activity page", [
    "schema_version",
    "artifact_type",
    "projection_status",
    "observed_at",
    "filters",
    "events",
    "next_cursor",
    "sources",
  ]);
  if (page.schema_version !== 1 || page.artifact_type !== "workflow-activity-page") {
    invalid("OOS returned an unsupported workflow activity contract.");
  }
  record(page.filters, "OOS workflow activity filters", [
    "source_id",
    "category",
    "outcome",
    "subject_ref",
  ]);
  return {
    events: array(page.events, "OOS workflow activity events").map(parseOosEvent),
    nextCursor: nullableText(page.next_cursor, "OOS workflow activity cursor"),
    observedAt: timestamp(page.observed_at, "OOS workflow activity observed_at"),
    sources: array(page.sources, "OOS workflow activity sources").map(parseOosSource),
    status: oneOf(page.projection_status, ["current", "partial"] as const, "OOS projection status"),
  };
}

function parseOosEvent(value: unknown): ConsoleActivityEvent {
  const event = record(value, "OOS workflow activity event", [
    "event_id",
    "action",
    "actor",
    "category",
    "outcome",
    "occurred_at",
    "correlation_id",
    "causation_id",
    "durability",
    "evidence_refs",
    "receipt_ref",
    "next_actions",
    "source",
    "subject",
    "summary",
  ]);
  if (event.durability !== "source-projected") {
    invalid("OOS activity durability is invalid.");
  }
  const action = record(event.action, "OOS activity action", ["id", "label"]);
  const actor = record(event.actor, "OOS activity actor", ["kind", "ref"]);
  const source = record(event.source, "OOS activity source", [
    "authority",
    "label",
    "mode",
    "owner",
    "ref",
    "revision",
  ]);
  if (source.mode !== "source-projected") invalid("OOS activity source mode is invalid.");
  text(source.revision, "OOS activity source revision");
  const subject = record(event.subject, "OOS activity subject", ["kind", "label", "ref"]);

  return {
    action: {
      id: text(action.id, "OOS activity action id"),
      label: text(action.label, "OOS activity action label"),
    },
    actor: {
      kind: oneOf(actor.kind, ["agent", "operator", "system", "unknown"] as const, "OOS activity actor kind"),
      ref: text(actor.ref, "OOS activity actor ref"),
    },
    causationId: nullableText(event.causation_id, "OOS activity causation id"),
    category: oneOf(
      event.category,
      ["blocker", "command", "receipt", "runtime", "state-change", "transition"] as const,
      "OOS activity category",
    ),
    correlationId: nullableText(event.correlation_id, "OOS activity correlation id"),
    durability: "source-projected",
    eventId: text(event.event_id, "OOS activity event id"),
    evidenceRefs: array(event.evidence_refs, "OOS activity evidence refs").map((entry) =>
      text(entry, "OOS activity evidence ref"),
    ),
    nextActions: array(event.next_actions, "OOS activity next actions").map((entry) => {
      const next = record(entry, "OOS activity next action", ["action", "owner_ref", "review_at"]);
      return {
        action: text(next.action, "OOS activity next action"),
        ownerRef: text(next.owner_ref, "OOS activity next action owner"),
        reviewAt: nullableTimestamp(next.review_at, "OOS activity next action review_at"),
      };
    }),
    occurredAt: timestamp(event.occurred_at, "OOS activity occurred_at"),
    outcome: oneOf(
      event.outcome,
      ["blocked", "failed", "informational", "started", "succeeded", "waiting"] as const,
      "OOS activity outcome",
    ),
    receiptRef: nullableText(event.receipt_ref, "OOS activity receipt ref"),
    source: {
      authority: text(source.authority, "OOS activity source authority"),
      label: text(source.label, "OOS activity source label"),
      mode: "source-projected",
      owner: text(source.owner, "OOS activity source owner"),
      ref: text(source.ref, "OOS activity source ref"),
    },
    subject: {
      kind: text(subject.kind, "OOS activity subject kind"),
      label: text(subject.label, "OOS activity subject label"),
      ref: text(subject.ref, "OOS activity subject ref"),
    },
    summary: text(event.summary, "OOS activity summary"),
  };
}

function parseOosSource(value: unknown): GovernanceActivitySource {
  const source = record(value, "OOS workflow activity source status", [
    "source_id",
    "authority",
    "owner",
    "state",
    "observed_at",
    "source_revision",
    "event_count",
    "truncated",
    "error_code",
  ]);
  text(source.source_revision, "OOS activity source revision");
  const sourceId = text(source.source_id, "OOS activity source id");
  return {
    authority: text(source.authority, "OOS activity source authority"),
    errorCode: nullableText(source.error_code, "OOS activity source error code"),
    eventCount: integer(source.event_count, "OOS activity source event count"),
    label: humanize(sourceId),
    observedAt: timestamp(source.observed_at, "OOS activity source observed_at"),
    owner: text(source.owner, "OOS activity source owner"),
    sourceId: `oos:${sourceId}`,
    state: oneOf(source.state, ["current", "stale", "unavailable"] as const, "OOS activity source state"),
    truncated: boolean(source.truncated, "OOS activity source truncation"),
  };
}

async function oosRequest(
  config: ReturnType<typeof resolveConsoleOosConnection>,
  path: string,
  fetchImpl: typeof fetch,
) {
  let response: Response;
  try {
    response = await fetchImpl(`${config.baseUrl}${path}`, {
      cache: "no-store",
      headers: {
        ...consoleMutationAttributionHeaders(),
        Accept: "application/json",
        "x-oos-caller-id": config.callerId,
        "x-oos-caller-secret": config.callerSecret,
      },
      method: "GET",
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
  } catch (error) {
    throw new GovernanceActivityValidationError(
      error instanceof Error ? error.message : "OOS activity request failed.",
      "governance_activity_oos_unavailable",
      502,
    );
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const failure = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
    throw new GovernanceActivityValidationError(
      typeof failure.message === "string" ? failure.message : "OOS rejected the activity read.",
      typeof failure.error === "string" ? failure.error : "governance_activity_oos_rejected",
      response.status,
    );
  }
  return body;
}

function humanize(value: string) {
  return value.replaceAll("-", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function sortEvents(events: ConsoleActivityEvent[]) {
  return events.sort((left, right) =>
    right.occurredAt.localeCompare(left.occurredAt) || left.eventId.localeCompare(right.eventId),
  );
}

function sortSources(sources: GovernanceActivitySource[]) {
  return sources.sort((left, right) => left.sourceId.localeCompare(right.sourceId));
}
