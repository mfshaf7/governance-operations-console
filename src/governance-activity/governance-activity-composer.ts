import type { ConsoleActivityEvent } from "../console-integration/activity-contract.ts";
import type {
  GovernanceActivitySnapshot,
  GovernanceActivitySource,
} from "./governance-activity-types.ts";
import {
  governanceActivityOosConfigured,
  listOosGovernanceActivity,
} from "./governance-activity-oos-client.ts";
import {
  governanceActivityWgcfConfigured,
  listWgcfGovernanceActivity,
} from "./governance-activity-wgcf-client.ts";
import { GovernanceActivityValidationError } from "./governance-activity-validation.ts";

export async function composeGovernanceActivity({
  env = process.env,
  fetchImpl = fetch,
  now = new Date(),
}: {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  now?: Date;
} = {}): Promise<GovernanceActivitySnapshot> {
  const oosConfigured = governanceActivityOosConfigured(env);
  const wgcfConfigured = governanceActivityWgcfConfigured(env);
  const observedAt = now.toISOString();

  if (!oosConfigured && !wgcfConfigured) {
    return {
      error: null,
      events: [],
      mode: "disconnected-preview",
      observedAt,
      sources: [],
      status: "current",
      truncated: false,
    };
  }

  const [oos, wgcf] = await Promise.allSettled([
    oosConfigured
      ? listOosGovernanceActivity({ env, fetchImpl })
      : Promise.reject(configurationMissing("oos")),
    wgcfConfigured
      ? listWgcfGovernanceActivity({ env, fetchImpl, now })
      : Promise.reject(configurationMissing("wgcf")),
  ]);
  const events = new Map<string, ConsoleActivityEvent>();
  const sources: GovernanceActivitySource[] = [];
  let latestObservedAt = observedAt;
  let truncated = false;
  let partial = false;
  let availableOwners = 0;

  for (const [owner, result] of [["oos", oos], ["wgcf", wgcf]] as const) {
    if (result.status === "rejected") {
      partial = true;
      sources.push(unavailableOwnerSource(owner, result.reason, observedAt));
      continue;
    }
    availableOwners += 1;
    if (result.value.status === "partial") partial = true;
    if (result.value.observedAt > latestObservedAt) latestObservedAt = result.value.observedAt;
    truncated ||= result.value.truncated;
    sources.push(...result.value.sources);
    for (const event of result.value.events) {
      const existing = events.get(event.eventId);
      if (existing && JSON.stringify(existing) !== JSON.stringify(event)) {
        throw new GovernanceActivityValidationError(
          `Governance activity event ${event.eventId} has conflicting owner projections.`,
          "governance_activity_identity_conflict",
        );
      }
      events.set(event.eventId, event);
    }
  }

  return {
    error: partial ? "One or more owner projections are unavailable or partial." : null,
    events: [...events.values()].sort((left, right) =>
      right.occurredAt.localeCompare(left.occurredAt) || left.eventId.localeCompare(right.eventId),
    ),
    mode: "live",
    observedAt: latestObservedAt,
    sources: sources.sort((left, right) => left.sourceId.localeCompare(right.sourceId)),
    status: availableOwners === 0 ? "offline" : partial || truncated ? "partial" : "current",
    truncated,
  };
}

function configurationMissing(owner: "oos" | "wgcf") {
  return new GovernanceActivityValidationError(
    `${owner.toUpperCase()} activity source is not configured.`,
    `governance_activity_${owner}_configuration_missing`,
    503,
  );
}

function unavailableOwnerSource(
  owner: "oos" | "wgcf",
  error: unknown,
  observedAt: string,
): GovernanceActivitySource {
  const normalized = error instanceof GovernanceActivityValidationError
    ? error
    : new GovernanceActivityValidationError(
        `${owner.toUpperCase()} activity source is unavailable.`,
        `governance_activity_${owner}_unavailable`,
      );
  return {
    authority: owner === "oos" ? "operator-orchestration-service" : "workspace-governance-control-fabric",
    errorCode: normalized.code,
    eventCount: 0,
    label: owner === "oos" ? "OOS workflow activity" : "WGCF governance history",
    observedAt,
    owner: owner === "oos" ? "operator-orchestration-service" : "workspace-governance-control-fabric",
    sourceId: `${owner}:owner-projection`,
    state: "unavailable",
    truncated: false,
  };
}
