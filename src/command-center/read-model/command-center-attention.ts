import type {
  ConsoleAttentionCandidate as CommandCenterAttentionCandidate,
  ConsoleAttentionClass as CommandCenterAttentionClass,
  ConsoleAttentionFreshness as CommandCenterAttentionFreshness,
  ConsoleAttentionRoute as CommandCenterAttentionRoute,
  ConsoleAttentionSource as CommandCenterAttentionSource,
  ConsoleAttentionSourceDisposition as CommandCenterAttentionSourceDisposition,
  ConsoleAttentionSourceMode as CommandCenterAttentionSourceMode,
  ConsoleAttentionSourceRegistration as CommandCenterAttentionSourceRegistration,
  ConsoleAttentionSourceSnapshot as CommandCenterAttentionSourceSnapshot,
  ConsoleAttentionUrgency as CommandCenterAttentionUrgency,
} from "../../console-integration/attention-contract";

export type {
  ConsoleAttentionCandidate as CommandCenterAttentionCandidate,
  ConsoleAttentionClass as CommandCenterAttentionClass,
  ConsoleAttentionFreshness as CommandCenterAttentionFreshness,
  ConsoleAttentionRoute as CommandCenterAttentionRoute,
  ConsoleAttentionSource as CommandCenterAttentionSource,
  ConsoleAttentionSourceDisposition as CommandCenterAttentionSourceDisposition,
  ConsoleAttentionSourceMode as CommandCenterAttentionSourceMode,
  ConsoleAttentionSourceRegistration as CommandCenterAttentionSourceRegistration,
  ConsoleAttentionSourceSnapshot as CommandCenterAttentionSourceSnapshot,
  ConsoleAttentionUrgency as CommandCenterAttentionUrgency,
} from "../../console-integration/attention-contract";

export type CommandCenterAttentionProjectionIssue = Readonly<{
  candidateId: string | null;
  code:
    | "duplicate-candidate-id"
    | "invalid-candidate"
    | "invalid-source"
    | "non-admitted-source-emitted-candidates";
  detail: string;
  sourceId: string;
}>;

export type CommandCenterAttentionSnapshot = Readonly<{
  candidates: readonly CommandCenterAttentionCandidate[];
  issues: readonly CommandCenterAttentionProjectionIssue[];
  projectedAt: string;
  schemaVersion: 1;
  sources: readonly CommandCenterAttentionSourceSnapshot[];
}>;

const urgencyOrder = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
} as const satisfies Record<CommandCenterAttentionUrgency, number>;

const attentionClassOrder = {
  recovery: 0,
  decision: 1,
  "required-action": 2,
  review: 3,
  "external-follow-up": 4,
} as const satisfies Record<CommandCenterAttentionClass, number>;

function isValidDate(value: string | null) {
  return value === null || !Number.isNaN(Date.parse(value));
}

function isNonEmpty(value: string) {
  return value.trim().length > 0;
}

function candidateIssue(
  candidate: CommandCenterAttentionCandidate,
): string | null {
  if (
    candidate.schemaVersion !== 1 ||
    !isNonEmpty(candidate.candidateId) ||
    !isNonEmpty(candidate.dedupeKey) ||
    !isNonEmpty(candidate.owner.label) ||
    !isNonEmpty(candidate.owner.ref) ||
    !isNonEmpty(candidate.reason) ||
    !isNonEmpty(candidate.requiredMove.id) ||
    !isNonEmpty(candidate.requiredMove.label) ||
    !isNonEmpty(candidate.source.authority) ||
    !isNonEmpty(candidate.source.ref) ||
    !isNonEmpty(candidate.source.version) ||
    !isNonEmpty(candidate.subject.kind) ||
    !isNonEmpty(candidate.subject.ref) ||
    !isNonEmpty(candidate.subject.title)
  ) {
    return "required candidate identity or content is missing";
  }

  if (
    !Number.isInteger(candidate.ownerRank) ||
    candidate.ownerRank < 0 ||
    candidate.ownerRank > 100
  ) {
    return "ownerRank must be an integer from 0 through 100";
  }

  if (
    !isValidDate(candidate.dueAt) ||
    !isValidDate(candidate.reviewAt) ||
    !isValidDate(candidate.source.observedAt) ||
    !isValidDate(candidate.source.projectedAt)
  ) {
    return "candidate contains an invalid timestamp";
  }

  if (!isNonEmpty(candidate.route.label)) {
    return "route label is missing";
  }

  if (
    candidate.route.availability === "available" &&
    candidate.route.entryIntent === null
  ) {
    return "available console route is missing its entry intent";
  }

  if (
    candidate.route.availability === "external" &&
    !candidate.route.externalHref
  ) {
    return "external route is missing its href";
  }

  if (
    candidate.route.availability === "unavailable" &&
    !candidate.route.unavailableReason
  ) {
    return "unavailable route is missing its reason";
  }

  return null;
}

function sourceIssue(
  snapshot: CommandCenterAttentionSourceSnapshot,
): string | null {
  if (
    snapshot.schemaVersion !== 1 ||
    !isNonEmpty(snapshot.registration.id) ||
    !isNonEmpty(snapshot.registration.label) ||
    !isNonEmpty(snapshot.registration.reason) ||
    !isNonEmpty(snapshot.source.authority) ||
    !isNonEmpty(snapshot.source.ref) ||
    !isNonEmpty(snapshot.source.version) ||
    !isValidDate(snapshot.source.observedAt) ||
    !isValidDate(snapshot.source.projectedAt)
  ) {
    return "source registration or source metadata is invalid";
  }

  return null;
}

function routeForFreshness(
  candidate: CommandCenterAttentionCandidate,
): CommandCenterAttentionCandidate {
  if (
    candidate.source.freshness === "current" ||
    candidate.route.availability === "unavailable"
  ) {
    return candidate;
  }

  return {
    ...candidate,
    route: {
      availability: "unavailable",
      entryIntent: null,
      externalHref: null,
      label: candidate.route.label,
      unavailableReason: `Source projection is ${candidate.source.freshness}; refresh owner truth before routing.`,
    },
  };
}

function dateOrder(value: string | null) {
  return value ? Date.parse(value) : Number.POSITIVE_INFINITY;
}

export function compareCommandCenterAttention(
  left: CommandCenterAttentionCandidate,
  right: CommandCenterAttentionCandidate,
) {
  return (
    urgencyOrder[left.urgency] - urgencyOrder[right.urgency] ||
    attentionClassOrder[left.attentionClass] -
      attentionClassOrder[right.attentionClass] ||
    dateOrder(left.dueAt ?? left.reviewAt) -
      dateOrder(right.dueAt ?? right.reviewAt) ||
    left.ownerRank - right.ownerRank ||
    left.candidateId.localeCompare(right.candidateId)
  );
}

export function projectCommandCenterAttention(
  sources: readonly CommandCenterAttentionSourceSnapshot[],
  projectedAt = new Date().toISOString(),
): CommandCenterAttentionSnapshot {
  const issues: CommandCenterAttentionProjectionIssue[] = [];
  const candidatesById = new Map<string, CommandCenterAttentionCandidate>();

  for (const snapshot of sources) {
    const invalidSource = sourceIssue(snapshot);
    if (invalidSource) {
      issues.push({
        candidateId: null,
        code: "invalid-source",
        detail: invalidSource,
        sourceId: snapshot.registration.id,
      });
      continue;
    }

    if (
      snapshot.registration.disposition !== "admitted" &&
      snapshot.candidates.length > 0
    ) {
      issues.push({
        candidateId: null,
        code: "non-admitted-source-emitted-candidates",
        detail: `${snapshot.registration.disposition} sources cannot emit attention candidates`,
        sourceId: snapshot.registration.id,
      });
      continue;
    }

    for (const candidate of snapshot.candidates) {
      const invalidCandidate = candidateIssue(candidate);
      if (invalidCandidate) {
        issues.push({
          candidateId: candidate.candidateId || null,
          code: "invalid-candidate",
          detail: invalidCandidate,
          sourceId: snapshot.registration.id,
        });
        continue;
      }

      if (candidatesById.has(candidate.candidateId)) {
        issues.push({
          candidateId: candidate.candidateId,
          code: "duplicate-candidate-id",
          detail: "candidate id is already represented by another source",
          sourceId: snapshot.registration.id,
        });
        continue;
      }

      candidatesById.set(candidate.candidateId, routeForFreshness(candidate));
    }
  }

  const ranked = [...candidatesById.values()].sort(
    compareCommandCenterAttention,
  );
  const candidatesByDedupeKey = new Map<
    string,
    CommandCenterAttentionCandidate
  >();

  for (const candidate of ranked) {
    if (!candidatesByDedupeKey.has(candidate.dedupeKey)) {
      candidatesByDedupeKey.set(candidate.dedupeKey, candidate);
    }
  }

  return {
    candidates: [...candidatesByDedupeKey.values()],
    issues,
    projectedAt,
    schemaVersion: 1,
    sources,
  };
}

export function createStaticCommandCenterAttentionSource(
  snapshot: CommandCenterAttentionSourceSnapshot,
): CommandCenterAttentionSource {
  return {
    getSnapshot: () => snapshot,
    registration: snapshot.registration,
    subscribe: () => () => undefined,
  };
}
