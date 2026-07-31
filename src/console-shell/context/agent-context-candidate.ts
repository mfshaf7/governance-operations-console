export type AgentContextCandidateTone =
  | "danger"
  | "info"
  | "muted"
  | "ok"
  | "stale"
  | "warn";

export type AgentContextSourceMode =
  | "live"
  | "source-projected"
  | "synthetic"
  | "unavailable";

export type AgentContextCandidate = {
  boundary: string;
  displayTone?: AgentContextCandidateTone;
  freshness: string;
  id: string;
  observedAt: string | null;
  projectedAt: string;
  refs: string[];
  safeActions: string[];
  schemaVersion: 1;
  scope: "page" | "workspace";
  signals: string[];
  sourceAuthority: string;
  sourceMode: AgentContextSourceMode;
  status?: string;
  summary: string;
  surfaceKind: string;
  title: string;
};

export function createAgentContextCandidate({
  boundary,
  displayTone,
  freshness = "current prototype projection",
  id,
  observedAt = null,
  projectedAt = new Date().toISOString(),
  refs = [],
  safeActions,
  scope,
  signals,
  sourceAuthority,
  sourceMode,
  status,
  summary,
  surfaceKind,
  title,
}: Omit<
  AgentContextCandidate,
  "freshness" | "observedAt" | "projectedAt" | "refs" | "schemaVersion"
> & {
  freshness?: string;
  observedAt?: string | null;
  projectedAt?: string;
  refs?: string[];
}): AgentContextCandidate {
  return {
    boundary,
    displayTone,
    freshness,
    id,
    observedAt,
    projectedAt,
    refs,
    safeActions,
    schemaVersion: 1,
    scope,
    signals,
    sourceAuthority,
    sourceMode,
    status,
    summary,
    surfaceKind,
    title,
  };
}

export function contextCandidateBadgeLabel(
  candidate: AgentContextCandidate | null,
  fallbackLabel: string,
) {
  if (!candidate) {
    return fallbackLabel;
  }

  return `${candidate.scope === "workspace" ? "Workspace" : "Page"} context / ${candidate.title}`;
}

export function formatAgentContextCandidate(
  candidate: AgentContextCandidate | null,
) {
  if (!candidate) {
    return "No active context candidate is available.";
  }

  return [
    `${candidate.scope.toUpperCase()} CANDIDATE / ${candidate.surfaceKind}`,
    `title: ${candidate.title}`,
    `status: ${candidate.status ?? "not specified"}`,
    `source authority: ${candidate.sourceAuthority}`,
    `source mode: ${candidate.sourceMode}`,
    `freshness: ${candidate.freshness}`,
    `observed: ${candidate.observedAt ?? "not observed"}`,
    `projected: ${candidate.projectedAt}`,
    `summary: ${candidate.summary}`,
    `signals: ${candidate.signals.join(" / ") || "none"}`,
    `safe actions: ${candidate.safeActions.join(" / ") || "none"}`,
    `refs: ${candidate.refs.join(" / ") || "none"}`,
    `boundary: ${candidate.boundary}`,
  ].join("\n");
}
