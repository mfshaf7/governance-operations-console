import type {
  ModelOperationsSummaryMetric,
  ModelProfileAvailability,
  ModelProfileCheckProjection,
  ModelProfileRecord,
  ModelReadinessState,
} from "../types/model-operations-types.ts";

function readinessTone(state: ModelReadinessState) {
  switch (state) {
    case "ready":
      return "ok" as const;
    case "blocked":
      return "danger" as const;
    case "stale":
      return "stale" as const;
    case "suspended":
      return "warn" as const;
    case "unknown":
      return "muted" as const;
  }
}

export function modelProfileAvailability(
  profile: ModelProfileRecord,
): ModelProfileAvailability {
  switch (profile.policy.lifecycle) {
    case "exception":
      return "exception";
    case "retired":
      return "retired";
    case "suspended":
      return "suspended";
    case "active":
      return profile.consumers.some(
        (consumer) => consumer.eligibility === "eligible",
      )
        ? "available"
        : "blocked";
  }
}

export function modelOperationsSummaryFromProfiles(
  profiles: ModelProfileRecord[],
): ModelOperationsSummaryMetric[] {
  const counts = profiles.reduce<Record<ModelProfileAvailability, number>>(
    (current, profile) => {
      current[modelProfileAvailability(profile)] += 1;
      return current;
    },
    {
      available: 0,
      blocked: 0,
      exception: 0,
      retired: 0,
      suspended: 0,
    },
  );

  return [
    {
      id: "available",
      label: "Available",
      tone: "ok",
      value: String(counts.available),
    },
    {
      id: "blocked",
      label: "Blocked",
      tone: "danger",
      value: String(counts.blocked),
    },
    {
      id: "suspended",
      label: "Suspended",
      tone: "warn",
      value: String(counts.suspended),
    },
    {
      id: "exception",
      label: "Exception",
      tone: "warn",
      value: String(counts.exception),
    },
    {
      id: "retired",
      label: "Retired",
      tone: "muted",
      value: String(counts.retired),
    },
  ];
}

export function modelProfileChecks(
  profile: ModelProfileRecord,
): ModelProfileCheckProjection[] {
  const policyState: ModelReadinessState =
    profile.policy.source.freshness === "stale"
      ? "stale"
      : profile.policy.source.freshness === "unknown"
        ? "unknown"
        : profile.policy.lifecycle === "suspended"
          ? "suspended"
          : profile.policy.lifecycle === "active"
            ? "ready"
            : "blocked";
  const consumerState: ModelReadinessState = profile.consumers.some(
    (consumer) => consumer.eligibility === "eligible",
  )
    ? "ready"
    : profile.consumers.some((consumer) => consumer.eligibility === "suspended")
      ? "suspended"
      : profile.consumers.some((consumer) => consumer.eligibility === "stale")
        ? "stale"
        : profile.consumers.length > 0
          ? "blocked"
          : "unknown";

  const checks: Array<Omit<ModelProfileCheckProjection, "tone">> = [
    {
      detail:
        "Canonical lifecycle, purpose, caller allowlist, data scope, output schema, and invocation policy.",
      facts: [
        { label: "Lifecycle", value: profile.policy.lifecycle },
        { label: "Invocation", value: profile.policy.invocationPath },
        { label: "Provider", value: profile.policy.provider },
        { label: "Upstream", value: profile.policy.upstreamModel },
      ],
      id: "profile-policy",
      label: "Profile Policy",
      source: profile.policy.source,
      state: policyState,
    },
    {
      detail:
        "Registered callers are evaluated independently against purpose, data, output, identity, and activation controls.",
      facts: [
        { label: "Registered", value: String(profile.consumers.length) },
        {
          label: "Eligible",
          value: String(
            profile.consumers.filter(
              (consumer) => consumer.eligibility === "eligible",
            ).length,
          ),
        },
        {
          label: "Live use",
          value: profile.consumers.some(
            (consumer) => consumer.liveConsumptionAllowed,
          )
            ? "allowed"
            : "not allowed",
        },
      ],
      id: "consumer-contract",
      label: "Consumer Contract",
      source: profile.consumers[0]?.source ?? profile.policy.source,
      state: consumerState,
    },
    {
      detail:
        "Gateway policy, provider custody, direct-access denial, activation, and audit-sink posture.",
      facts: [
        { label: "Gateway", value: profile.accessPlane.id },
        { label: "Status", value: profile.accessPlane.status },
        {
          label: "Activation",
          value: profile.accessPlane.activationAllowed ? "allowed" : "blocked",
        },
        { label: "Audit sink", value: profile.accessPlane.auditSinkStatus },
      ],
      id: "access-plane",
      label: "Access Plane",
      source: profile.accessPlane.source,
      state: profile.accessPlane.state,
    },
    {
      detail:
        "Runtime activation gates must all pass for the selected profile and caller.",
      facts: [
        { label: "Contract", value: profile.runtime.contractId },
        { label: "Status", value: profile.runtime.status },
        {
          label: "Ready gates",
          value: `${profile.runtime.gates.filter((gate) => gate.state === "ready").length}/${profile.runtime.gates.length}`,
        },
        { label: "Upstream", value: profile.runtime.upstreamModel },
      ],
      id: "runtime-controls",
      label: "Runtime Controls",
      source: profile.runtime.source,
      state: profile.runtime.state,
    },
    {
      detail:
        "Security review must approve the exact live activation scope or record a bounded exception.",
      facts: [
        { label: "Reviews", value: String(profile.security.reviewRefs.length) },
        {
          label: "Exception",
          value: profile.security.exceptionRef ?? "none",
        },
      ],
      id: "security-acceptance",
      label: "Security Acceptance",
      source: profile.security.source,
      state: profile.security.state,
    },
  ];

  return checks.map((check) => ({
    ...check,
    tone: readinessTone(check.state),
  }));
}
