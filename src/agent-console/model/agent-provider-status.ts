export const agentProviderSafetyMode =
  "manual-operator-request/prototype-synthetic-context-only";

export type AgentProviderStatus = {
  checkedAt: string;
  endpoint: string | null;
  error?: string;
  freshness: "live" | "stale";
  model: string | null;
  modelCount: number;
  observedAt: string | null;
  provider: "ollama";
  safetyMode: string;
  status: "offline" | "online" | "unavailable";
};

export type AgentProviderReadinessState = "offline" | "online" | "probing";

export function deriveAgentProviderReadinessState(
  providerStatus: AgentProviderStatus | null,
): AgentProviderReadinessState {
  if (
    !providerStatus ||
    providerStatus.freshness === "stale" ||
    providerStatus.status === "unavailable"
  ) {
    return "probing";
  }

  return providerStatus.status;
}

export function retainStaleAgentProviderObservation({
  checkedAt,
  error,
  previous,
}: {
  checkedAt: string;
  error: string;
  previous: AgentProviderStatus | null;
}): AgentProviderStatus {
  if (previous) {
    return {
      ...previous,
      checkedAt,
      error,
      freshness: "stale",
    };
  }

  return {
    checkedAt,
    endpoint: null,
    error,
    freshness: "stale",
    model: null,
    modelCount: 0,
    observedAt: null,
    provider: "ollama",
    safetyMode: agentProviderSafetyMode,
    status: "unavailable",
  };
}

export function isAgentProviderStatus(
  value: unknown,
): value is AgentProviderStatus {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const checkedAtIsValid =
    typeof candidate.checkedAt === "string" &&
    !Number.isNaN(Date.parse(candidate.checkedAt));
  const observedAtIsValid =
    candidate.observedAt === null ||
    (typeof candidate.observedAt === "string" &&
      !Number.isNaN(Date.parse(candidate.observedAt)));
  const freshnessIsValid =
    candidate.freshness === "live" || candidate.freshness === "stale";
  const statusIsValid =
    candidate.status === "offline" ||
    candidate.status === "online" ||
    candidate.status === "unavailable";
  const sourceStateIsCoherent =
    candidate.freshness !== "live" ||
    (candidate.observedAt !== null && candidate.status !== "unavailable");

  return (
    checkedAtIsValid &&
    (candidate.endpoint === null || typeof candidate.endpoint === "string") &&
    (candidate.error === undefined || typeof candidate.error === "string") &&
    freshnessIsValid &&
    (candidate.model === null || typeof candidate.model === "string") &&
    Number.isInteger(candidate.modelCount) &&
    Number(candidate.modelCount) >= 0 &&
    observedAtIsValid &&
    candidate.provider === "ollama" &&
    typeof candidate.safetyMode === "string" &&
    statusIsValid &&
    sourceStateIsCoherent
  );
}
