import {
  consoleWgcfModeSelected,
  resolveConsoleWgcfConnection,
} from "../console-integration/configuration/console-runtime-configuration.ts";
import type {
  ConsoleActivityCategory,
  ConsoleActivityEvent,
  ConsoleActivityOutcome,
} from "../console-integration/activity-contract.ts";
import type { GovernanceActivitySource } from "./governance-activity-types.ts";
import {
  array,
  boolean,
  GovernanceActivityValidationError,
  integer,
  invalid,
  nullableText,
  oneOf,
  record,
  text,
  timestamp,
} from "./governance-activity-validation.ts";

const pageLimit = 5;
const pageSize = 100;
const requestTimeoutMs = 8_000;

export type WgcfGovernanceActivityProjection = Readonly<{
  events: readonly ConsoleActivityEvent[];
  observedAt: string;
  sources: readonly GovernanceActivitySource[];
  status: "current" | "partial";
  truncated: boolean;
}>;

export function governanceActivityWgcfConfigured(
  env: NodeJS.ProcessEnv = process.env,
) {
  return consoleWgcfModeSelected(env);
}

export async function listWgcfGovernanceActivity({
  env = process.env,
  fetchImpl = fetch,
  now = new Date(),
}: {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  now?: Date;
} = {}): Promise<WgcfGovernanceActivityProjection> {
  const config = resolveConsoleWgcfConnection(env);
  const events = new Map<string, ConsoleActivityEvent>();
  const sources = new Map<string, GovernanceActivitySource>();
  const observedAt = now.toISOString();
  let cursor: string | null = null;
  let status: "current" | "partial" = "current";

  for (let pageIndex = 0; pageIndex < pageLimit; pageIndex += 1) {
    const query = new URLSearchParams({ limit: String(pageSize) });
    if (cursor) query.set("cursor", cursor);
    const payload = await wgcfRequest(
      config,
      `/v1/governance-history?${query.toString()}`,
      fetchImpl,
    );
    const page = parseWgcfPage(payload, observedAt);
    if (page.status === "partial") status = "partial";

    for (const event of page.events) {
      const existing = events.get(event.eventId);
      if (existing && JSON.stringify(existing) !== JSON.stringify(event)) {
        invalid(`WGCF history event ${event.eventId} has conflicting projections.`);
      }
      events.set(event.eventId, event);
    }
    for (const source of page.sources) {
      const existing = sources.get(source.sourceId);
      if (
        existing &&
        (existing.authority !== source.authority ||
          existing.state !== source.state ||
          existing.errorCode !== source.errorCode)
      ) {
        invalid(`WGCF history source ${source.sourceId} changed within one read.`);
      }
      sources.set(source.sourceId, {
        ...source,
        eventCount: Math.max(existing?.eventCount ?? 0, source.eventCount),
        truncated: Boolean(existing?.truncated || source.truncated),
      });
    }

    cursor = page.nextCursor;
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

function parseWgcfPage(value: unknown, observedAt: string) {
  const page = record(value, "WGCF governance history page", [
    "schema_version",
    "projection_state",
    "authority_boundary",
    "filters",
    "page",
    "sources",
    "records",
  ]);
  if (page.schema_version !== 1) invalid("WGCF returned an unsupported history contract.");
  parseAuthorityBoundary(page.authority_boundary);
  record(page.filters, "WGCF governance history filters", ["category", "outcome", "subject"]);
  const pagination = record(page.page, "WGCF governance history pagination", [
    "limit",
    "returned",
    "has_more",
    "next_cursor",
  ]);
  integer(pagination.limit, "WGCF governance history page limit");
  integer(pagination.returned, "WGCF governance history returned count");
  const hasMore = boolean(pagination.has_more, "WGCF governance history has_more");
  const nextCursor = nullableText(pagination.next_cursor, "WGCF governance history cursor");
  if (hasMore !== Boolean(nextCursor)) {
    invalid("WGCF governance history cursor does not match has_more.");
  }
  const events = array(page.records, "WGCF governance history records").map(parseWgcfRecord);
  if (events.length !== pagination.returned) {
    invalid("WGCF governance history returned count is inconsistent.");
  }
  return {
    events,
    nextCursor,
    sources: array(page.sources, "WGCF governance history sources").map((source) =>
      parseWgcfSource(source, observedAt),
    ),
    status:
      oneOf(page.projection_state, ["complete", "partial"] as const, "WGCF projection state") === "complete"
        ? "current" as const
        : "partial" as const,
  };
}

function parseWgcfRecord(value: unknown): ConsoleActivityEvent {
  const entry = record(value, "WGCF governance history record", [
    "history_id",
    "source",
    "category",
    "occurred_at",
    "actor",
    "action",
    "subject",
    "outcome",
    "freshness",
    "summary",
    "authority_boundary",
    "evidence_routes",
    "next_action",
    "metadata",
  ]);
  parseAuthorityBoundary(entry.authority_boundary);
  const historyId = text(entry.history_id, "WGCF history id");
  if (!historyId.startsWith("wgh_")) invalid("WGCF history id is invalid.");
  const category = oneOf(
    entry.category,
    ["readiness", "escalation", "ledger", "receipt"] as const,
    "WGCF history category",
  );
  const freshness = oneOf(
    entry.freshness,
    ["current", "stale", "unknown", "not-applicable"] as const,
    "WGCF history freshness",
  );
  const action = text(entry.action, "WGCF history action");
  const subject = text(entry.subject, "WGCF history subject");
  const actor = entry.actor === null ? "workspace-governance-control-fabric" : text(entry.actor, "WGCF history actor");
  const metadata = parseMetadata(entry.metadata);
  const evidenceRoutes = array(entry.evidence_routes, "WGCF history evidence routes").map((route) => {
    const item = record(route, "WGCF history evidence route", ["ref", "route_type"]);
    return {
      ref: text(item.ref, "WGCF history evidence ref"),
      routeType: text(item.route_type, "WGCF history evidence route type"),
    };
  });
  const nextActions = parseNextAction(entry.next_action);
  const receiptRef = evidenceRoutes.find((route) => route.routeType.includes("receipt"))?.ref ?? null;

  return {
    action: { id: `wgcf.${category}.${slug(action)}`, label: humanize(action) },
    actor: { kind: actorKind(actor), ref: actor },
    causationId: metadataText(metadata, ["causation_id", "causation_ref"]),
    category: consoleCategory(category),
    correlationId: metadataText(metadata, ["correlation_id", "run_ref"]),
    durability: "source-projected",
    eventId: `wgcf:${historyId}`,
    evidenceRefs: evidenceRoutes.map((route) => route.ref),
    nextActions,
    occurredAt: timestamp(entry.occurred_at, "WGCF history occurred_at"),
    outcome: consoleOutcome(text(entry.outcome, "WGCF history outcome"), freshness),
    receiptRef,
    source: {
      authority: "workspace-governance-control-fabric",
      label: "WGCF governance",
      mode: "source-projected",
      owner: "workspace-governance-control-fabric",
      ref: `wgcf://governance-history/${historyId}`,
    },
    subject: { kind: category, label: subject, ref: subject },
    summary: text(entry.summary, "WGCF history summary"),
  };
}

function parseWgcfSource(value: unknown, observedAt: string): GovernanceActivitySource {
  const source = record(value, "WGCF governance history source", [
    "id",
    "category",
    "state",
    "scanned",
    "truncated",
    "reason_code",
  ]);
  const sourceId = text(source.id, "WGCF history source id");
  const category = oneOf(
    source.category,
    ["readiness", "escalation", "ledger", "receipt"] as const,
    "WGCF history source category",
  );
  const state = oneOf(source.state, ["available", "unavailable"] as const, "WGCF history source state");
  return {
    authority: "workspace-governance-control-fabric",
    errorCode: nullableText(source.reason_code ?? null, "WGCF history source reason code"),
    eventCount: integer(source.scanned ?? 0, "WGCF history source scanned count"),
    label: `WGCF ${humanize(category)}`,
    observedAt,
    owner: "workspace-governance-control-fabric",
    sourceId: `wgcf:${sourceId}`,
    state: state === "available" ? "current" : "unavailable",
    truncated: boolean(source.truncated ?? false, "WGCF history source truncation"),
  };
}

function parseAuthorityBoundary(value: unknown) {
  const boundary = record(value, "WGCF authority boundary", ["owner_repo", "role", "approval_source"]);
  if (
    boundary.owner_repo !== "workspace-governance-control-fabric" ||
    boundary.role !== "runtime-evidence-projection" ||
    boundary.approval_source !== false
  ) {
    invalid("WGCF authority boundary is invalid.");
  }
}

function parseMetadata(value: unknown) {
  const metadata = record(value, "WGCF history metadata");
  for (const [key, item] of Object.entries(metadata)) {
    if (!["string", "number", "boolean"].includes(typeof item) && item !== null) {
      invalid(`WGCF history metadata ${key} is invalid.`);
    }
  }
  return metadata;
}

function parseNextAction(value: unknown) {
  if (value === null) return [];
  const next = record(value, "WGCF history next action", [
    "authority",
    "code",
    "route",
    "owner_repo",
    "action",
    "reason",
  ]);
  const action = firstText(next, ["action", "code", "route"]);
  const ownerRef = firstText(next, ["owner_repo", "authority"]);
  if (!action || !ownerRef) return [];
  return [{ action, ownerRef, reviewAt: null }];
}

async function wgcfRequest(
  config: ReturnType<typeof resolveConsoleWgcfConnection>,
  path: string,
  fetchImpl: typeof fetch,
) {
  let response: Response;
  try {
    response = await fetchImpl(`${config.baseUrl}${path}`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "x-wgcf-caller-id": config.callerId,
        "x-wgcf-caller-secret": config.callerSecret,
      },
      method: "GET",
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
  } catch (error) {
    throw new GovernanceActivityValidationError(
      error instanceof Error ? error.message : "WGCF history request failed.",
      "governance_activity_wgcf_unavailable",
      502,
    );
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const failure = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
    throw new GovernanceActivityValidationError(
      typeof failure.detail === "string" ? failure.detail : "WGCF rejected the history read.",
      typeof failure.code === "string" ? failure.code : "governance_activity_wgcf_rejected",
      response.status,
    );
  }
  return body;
}

function actorKind(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("agent")) return "agent" as const;
  if (normalized.includes("operator") || normalized.includes("user")) return "operator" as const;
  return "system" as const;
}

function consoleCategory(category: "readiness" | "escalation" | "ledger" | "receipt"): ConsoleActivityCategory {
  if (category === "escalation") return "blocker";
  if (category === "receipt") return "receipt";
  return "state-change";
}

function consoleOutcome(value: string, freshness: string): ConsoleActivityOutcome {
  if (freshness === "stale") return "stale";
  const normalized = value.toLowerCase();
  if (/blocked|denied|rejected/.test(normalized)) return "blocked";
  if (/failed|error|invalid/.test(normalized)) return "failed";
  if (/waiting|pending|queued/.test(normalized)) return "waiting";
  if (/started|running|in-progress/.test(normalized)) return "started";
  if (/succeeded|approved|ready|passed|complete|completed/.test(normalized)) return "succeeded";
  return "informational";
}

function firstText(value: Record<string, unknown>, keys: readonly string[]) {
  for (const key of keys) {
    if (typeof value[key] === "string" && value[key].trim()) return value[key].trim();
  }
  return null;
}

function metadataText(value: Record<string, unknown>, keys: readonly string[]) {
  return firstText(value, keys);
}

function humanize(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function sortEvents(events: ConsoleActivityEvent[]) {
  return events.sort((left, right) =>
    right.occurredAt.localeCompare(left.occurredAt) || left.eventId.localeCompare(right.eventId),
  );
}

function sortSources(sources: GovernanceActivitySource[]) {
  return sources.sort((left, right) => left.sourceId.localeCompare(right.sourceId));
}
