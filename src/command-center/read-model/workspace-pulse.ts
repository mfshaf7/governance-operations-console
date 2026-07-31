import type { ConsoleNavigationTarget } from "../../console-architecture";

export type WorkspacePulseTone =
  | "danger"
  | "info"
  | "muted"
  | "ok"
  | "stale"
  | "warn";

export type WorkspacePulseDesignScenario = Readonly<{
  description: string;
  id: string;
  label: string;
  tone: WorkspacePulseTone;
}>;

export type WorkspacePulseSignalId =
  | "active-operations"
  | "blocked-operations"
  | "required-decisions"
  | "source-coverage";

export type WorkspacePulseProjectionMode = "cached" | "live" | "synthetic";

export type WorkspacePulseSourceState =
  | "current"
  | "stale"
  | "unavailable"
  | "unverified";

export type WorkspacePulseSource = Readonly<{
  authority: string;
  id: string;
  intendedAuthority: string;
  label: string;
  mode: WorkspacePulseProjectionMode;
  observedAt: string | null;
  reference: string;
  route: WorkspacePulseRoute | null;
  state: WorkspacePulseSourceState;
}>;

export type WorkspacePulseRoute = Readonly<{
  label: string;
  target: ConsoleNavigationTarget;
}>;

export type WorkspacePulseRecord = Readonly<{
  id: string;
  owner: string;
  route: WorkspacePulseRoute;
  signalId: Exclude<WorkspacePulseSignalId, "source-coverage">;
  sourceId: string;
  stateLabel: string;
  summary: string;
  timingLabel: string;
  title: string;
  tone: WorkspacePulseTone;
}>;

export type WorkspacePulseSignal = Readonly<{
  description: string;
  detail: string;
  id: WorkspacePulseSignalId;
  label: string;
  projectionAuthority: string;
  projectionLabel: string;
  projectionMode: WorkspacePulseProjectionMode;
  records: readonly WorkspacePulseRecord[];
  sourceSummary: string;
  stateLabel: string;
  tone: WorkspacePulseTone;
  value: string;
}>;

export type WorkspacePostureId =
  | "attention"
  | "blocked"
  | "clear"
  | "stale"
  | "unavailable";

export type WorkspacePosture = Readonly<{
  detail: string;
  id: WorkspacePostureId;
  label: string;
  projectionAuthority: string;
  projectionLabel: string;
  projectionMode: WorkspacePulseProjectionMode;
  sourceSummary: string;
  tone: WorkspacePulseTone;
}>;

export type WorkspacePulseSnapshotInput = Readonly<{
  projectionAuthority: string;
  projectedAt: string | null;
  projectionMode: WorkspacePulseProjectionMode;
  records: readonly WorkspacePulseRecord[];
  schemaVersion: 1;
  sources: readonly WorkspacePulseSource[];
}>;

export type WorkspacePulseSnapshot = Readonly<{
  posture: WorkspacePosture;
  projectionAuthority: string;
  projectedAt: string | null;
  projectionLabel: string;
  projectionMode: WorkspacePulseProjectionMode;
  schemaVersion: 1;
  signals: readonly WorkspacePulseSignal[];
  sourceSummary: string;
  sources: readonly WorkspacePulseSource[];
}>;

const signalDefinitions = {
  "active-operations": {
    description: "Governed activity currently running across registered owners.",
    label: "Active operations",
  },
  "blocked-operations": {
    description: "Work that cannot progress without intervention.",
    label: "Blocked operations",
  },
  "required-decisions": {
    description: "Operator choices or reviews waiting for a decision.",
    label: "Required decisions",
  },
  "source-coverage": {
    description: "Whether expected source projections can be trusted.",
    label: "Source coverage",
  },
} as const satisfies Record<
  WorkspacePulseSignalId,
  Readonly<{ description: string; label: string }>
>;

function projectionLabelFor(input: WorkspacePulseSnapshotInput) {
  if (input.projectionMode === "synthetic") {
    return "Prototype-local snapshot";
  }

  if (!input.projectedAt) {
    return input.projectionMode === "live"
      ? "Live projection time unavailable"
      : "Cached projection time unavailable";
  }

  return `${input.projectionMode === "live" ? "Live" : "Cached"} projection · ${input.projectedAt}`;
}

function sourceSummaryFor(input: WorkspacePulseSnapshotInput) {
  const representedCount = input.sources.filter(
    ({ state }) => state !== "unavailable",
  ).length;
  const noun = input.projectionMode === "synthetic" ? "fixture sources" : "sources";

  return `${representedCount}/${input.sources.length} ${noun} represented`;
}

function recordsFor(
  input: WorkspacePulseSnapshotInput,
  signalId: WorkspacePulseRecord["signalId"],
) {
  return input.records.filter((record) => record.signalId === signalId);
}

function operationalSignal(
  input: WorkspacePulseSnapshotInput,
  signalId: WorkspacePulseRecord["signalId"],
  projectionLabel: string,
  sourceSummary: string,
): WorkspacePulseSignal {
  const records = recordsFor(input, signalId);
  const definition = signalDefinitions[signalId];

  if (signalId === "required-decisions") {
    return {
      ...definition,
      detail:
        records.length === 0
          ? "No operator decision is waiting."
          : `${records.length} operator ${records.length === 1 ? "decision needs" : "decisions need"} review.`,
      id: signalId,
      projectionAuthority: input.projectionAuthority,
      projectionLabel,
      projectionMode: input.projectionMode,
      records,
      sourceSummary,
      stateLabel: records.length === 0 ? "CLEAR" : "WAITING",
      tone: records.length === 0 ? "ok" : "warn",
      value: String(records.length),
    };
  }

  if (signalId === "blocked-operations") {
    return {
      ...definition,
      detail:
        records.length === 0
          ? "No registered operation is blocked."
          : `${records.length} ${records.length === 1 ? "operation cannot" : "operations cannot"} progress.`,
      id: signalId,
      projectionAuthority: input.projectionAuthority,
      projectionLabel,
      projectionMode: input.projectionMode,
      records,
      sourceSummary,
      stateLabel: records.length === 0 ? "CLEAR" : "BLOCKED",
      tone: records.length === 0 ? "ok" : "danger",
      value: String(records.length),
    };
  }

  return {
    ...definition,
    detail:
      records.length === 0
        ? "No governed operation is currently active."
        : `${records.length} governed ${records.length === 1 ? "operation is" : "operations are"} in motion.`,
    id: signalId,
    projectionAuthority: input.projectionAuthority,
    projectionLabel,
    projectionMode: input.projectionMode,
    records,
    sourceSummary,
    stateLabel: records.length === 0 ? "QUIET" : "IN MOTION",
    tone: records.length === 0 ? "muted" : "info",
    value: String(records.length),
  };
}

function sourceCoverageSignal(
  input: WorkspacePulseSnapshotInput,
  projectionLabel: string,
  sourceSummary: string,
): WorkspacePulseSignal {
  const unavailable = input.sources.filter(
    ({ state }) => state === "unavailable",
  );
  const uncertain = input.sources.filter(
    ({ state }) => state === "stale" || state === "unverified",
  );
  const representedCount = input.sources.length - unavailable.length;

  if (unavailable.length > 0) {
    return {
      ...signalDefinitions["source-coverage"],
      detail: `${unavailable.length} expected ${unavailable.length === 1 ? "source is" : "sources are"} unavailable.`,
      id: "source-coverage",
      projectionAuthority: input.projectionAuthority,
      projectionLabel,
      projectionMode: input.projectionMode,
      records: [],
      sourceSummary,
      stateLabel: "INCOMPLETE",
      tone: "danger",
      value: `${representedCount}/${input.sources.length}`,
    };
  }

  if (uncertain.length > 0) {
    return {
      ...signalDefinitions["source-coverage"],
      detail: `${uncertain.length} represented ${uncertain.length === 1 ? "source needs" : "sources need"} refresh or verification.`,
      id: "source-coverage",
      projectionAuthority: input.projectionAuthority,
      projectionLabel,
      projectionMode: input.projectionMode,
      records: [],
      sourceSummary,
      stateLabel: "STALE",
      tone: "stale",
      value: `${representedCount}/${input.sources.length}`,
    };
  }

  return {
    ...signalDefinitions["source-coverage"],
    detail:
      input.projectionMode === "synthetic"
        ? "All expected fixture sources are represented."
        : "All expected sources are current.",
    id: "source-coverage",
    projectionAuthority: input.projectionAuthority,
    projectionLabel,
    projectionMode: input.projectionMode,
    records: [],
    sourceSummary,
    stateLabel: input.projectionMode === "synthetic" ? "SYNTHETIC" : "CURRENT",
    tone: input.projectionMode === "synthetic" ? "info" : "ok",
    value: `${representedCount}/${input.sources.length}`,
  };
}

function postureFor(
  input: WorkspacePulseSnapshotInput,
  signals: readonly WorkspacePulseSignal[],
  projectionLabel: string,
  sourceSummary: string,
): WorkspacePosture {
  const sourceCoverage = signals.find(
    ({ id }) => id === "source-coverage",
  ) as WorkspacePulseSignal;
  const blockedCount = Number(
    signals.find(({ id }) => id === "blocked-operations")?.value ?? 0,
  );
  const decisionCount = Number(
    signals.find(({ id }) => id === "required-decisions")?.value ?? 0,
  );

  if (sourceCoverage.stateLabel === "INCOMPLETE") {
    return {
      detail:
        "An expected source is unavailable, so the aggregate cannot claim a complete workspace state.",
      id: "unavailable",
      label: "SIGNAL LOST",
      projectionAuthority: input.projectionAuthority,
      projectionLabel,
      projectionMode: input.projectionMode,
      sourceSummary,
      tone: "danger",
    };
  }

  if (sourceCoverage.stateLabel === "STALE") {
    return {
      detail:
        "A represented source is stale or unverified. Refresh source truth before relying on the aggregate.",
      id: "stale",
      label: "STALE SIGNALS",
      projectionAuthority: input.projectionAuthority,
      projectionLabel,
      projectionMode: input.projectionMode,
      sourceSummary,
      tone: "stale",
    };
  }

  if (blockedCount > 0) {
    return {
      detail: `${blockedCount} ${blockedCount === 1 ? "operation is" : "operations are"} blocked and cannot progress.`,
      id: "blocked",
      label: "HARD STOP",
      projectionAuthority: input.projectionAuthority,
      projectionLabel,
      projectionMode: input.projectionMode,
      sourceSummary,
      tone: "danger",
    };
  }

  if (decisionCount > 0) {
    return {
      detail: `${decisionCount} operator ${decisionCount === 1 ? "decision needs" : "decisions need"} review; no operation is blocked.`,
      id: "attention",
      label: "HEADS UP",
      projectionAuthority: input.projectionAuthority,
      projectionLabel,
      projectionMode: input.projectionMode,
      sourceSummary,
      tone: "warn",
    };
  }

  return {
    detail:
      input.projectionMode === "synthetic"
        ? "The prototype snapshot contains no blocker or waiting operator decision."
        : "No blocker or waiting operator decision is present in the current workspace snapshot.",
    id: "clear",
    label: "CALM / NO FIRE",
    projectionAuthority: input.projectionAuthority,
    projectionLabel,
    projectionMode: input.projectionMode,
    sourceSummary,
    tone: "ok",
  };
}

export function projectWorkspacePulseSnapshot(
  input: WorkspacePulseSnapshotInput,
): WorkspacePulseSnapshot {
  const projectionLabel = projectionLabelFor(input);
  const sourceSummary = sourceSummaryFor(input);
  const signals = [
    operationalSignal(
      input,
      "required-decisions",
      projectionLabel,
      sourceSummary,
    ),
    operationalSignal(
      input,
      "blocked-operations",
      projectionLabel,
      sourceSummary,
    ),
    operationalSignal(
      input,
      "active-operations",
      projectionLabel,
      sourceSummary,
    ),
    sourceCoverageSignal(input, projectionLabel, sourceSummary),
  ] as const;

  return {
    posture: postureFor(input, signals, projectionLabel, sourceSummary),
    projectionAuthority: input.projectionAuthority,
    projectedAt: input.projectedAt,
    projectionLabel,
    projectionMode: input.projectionMode,
    schemaVersion: input.schemaVersion,
    signals,
    sourceSummary,
    sources: input.sources,
  };
}
