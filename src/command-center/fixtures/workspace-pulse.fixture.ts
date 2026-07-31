import {
  projectWorkspacePulseSnapshot,
  type WorkspacePulseDesignScenario,
  type WorkspacePulseRecord,
  type WorkspacePulseSignalId,
  type WorkspacePulseSnapshotInput,
  type WorkspacePulseSource,
  type WorkspacePulseTone,
} from "../read-model/workspace-pulse.ts";

type WorkspacePulseRecordScenario = WorkspacePulseDesignScenario &
  Readonly<{
    records: readonly WorkspacePulseRecord[];
  }>;

type WorkspacePulseSourceScenario = WorkspacePulseDesignScenario &
  Readonly<{
    sources: readonly WorkspacePulseSource[];
  }>;

export type WorkspacePulseScenarioSelections = Partial<
  Record<WorkspacePulseSignalId, string>
>;

const routes = {
  delivery: {
    label: "Open Delivery",
    target: {
      id: "workbench:delivery",
      kind: "workbench-domain",
      surfaceLabel: "DELIVERY",
    },
  },
  devIntegration: {
    label: "Open Dev Integration",
    target: {
      id: "dev-integration",
      kind: "workspace",
      workspaceId: "dev-integration",
    },
  },
  orchestration: {
    label: "Open Orchestration",
    target: {
      id: "workbench:orchestration",
      kind: "workbench-domain",
      surfaceLabel: "ORCHESTRATION",
    },
  },
  prototype: {
    label: "Open Prototype",
    target: {
      id: "workbench:prototype",
      kind: "workbench-domain",
      surfaceLabel: "PROTOTYPE",
    },
  },
  repository: {
    label: "Open Repository",
    target: {
      id: "workbench:repository",
      kind: "workbench-domain",
      surfaceLabel: "REPOSITORY",
    },
  },
} as const;

const baseSources = [
  {
    authority: "workspace-prototype-studio",
    id: "prototype-lifecycle",
    intendedAuthority: "workspace-prototype-studio",
    label: "Prototype lifecycle",
    mode: "synthetic",
    observedAt: null,
    reference: "fixture://workspace-pulse/prototype-lifecycle",
    route: routes.prototype,
    state: "current",
  },
  {
    authority: "workspace-prototype-studio",
    id: "delivery-art",
    intendedAuthority: "operator-orchestration-service + OpenProject",
    label: "Delivery ART",
    mode: "synthetic",
    observedAt: null,
    reference: "fixture://workspace-pulse/delivery-art",
    route: routes.delivery,
    state: "current",
  },
  {
    authority: "workspace-prototype-studio",
    id: "operator-workflows",
    intendedAuthority: "operator-orchestration-service",
    label: "Operator workflows",
    mode: "synthetic",
    observedAt: null,
    reference: "fixture://workspace-pulse/operator-workflows",
    route: routes.orchestration,
    state: "current",
  },
  {
    authority: "workspace-prototype-studio",
    id: "repository-governance",
    intendedAuthority: "workspace-governance-control-fabric",
    label: "Repository governance",
    mode: "synthetic",
    observedAt: null,
    reference: "fixture://workspace-pulse/repository-governance",
    route: routes.repository,
    state: "current",
  },
  {
    authority: "workspace-prototype-studio",
    id: "environment-lifecycle",
    intendedAuthority: "platform-engineering",
    label: "Environment lifecycle",
    mode: "synthetic",
    observedAt: null,
    reference: "fixture://workspace-pulse/environment-lifecycle",
    route: routes.devIntegration,
    state: "current",
  },
  {
    authority: "workspace-prototype-studio",
    id: "governance-readiness",
    intendedAuthority: "workspace-governance-control-fabric",
    label: "Governance readiness",
    mode: "synthetic",
    observedAt: null,
    reference: "fixture://workspace-pulse/governance-readiness",
    route: null,
    state: "current",
  },
] as const satisfies readonly WorkspacePulseSource[];

const requiredDecisionScenarios = [
  {
    description: "One operator decision is waiting.",
    id: "waiting",
    label: "Waiting",
    records: [
      {
        id: "decision:prototype-baseline-disposition",
        owner: "Prototype",
        route: routes.prototype,
        signalId: "required-decisions",
        sourceId: "prototype-lifecycle",
        stateLabel: "DECISION",
        summary:
          "Candidate evidence is ready for an approve, return, or retire decision.",
        timingLabel: "Awaiting operator",
        title: "Prototype baseline disposition",
        tone: "warn",
      },
    ],
    tone: "warn",
  },
  {
    description: "No operator decision is waiting.",
    id: "clear",
    label: "Clear",
    records: [],
    tone: "ok",
  },
] as const satisfies readonly WorkspacePulseRecordScenario[];

const blockedOperationScenarios = [
  {
    description: "No registered operation is blocked.",
    id: "clear",
    label: "Clear",
    records: [],
    tone: "ok",
  },
  {
    description: "A governed release cannot progress.",
    id: "blocked",
    label: "Blocked",
    records: [
      {
        id: "blocker:release-profile-evidence",
        owner: "Governed Releases",
        route: {
          label: "Open Governed Releases",
          target: {
            id: "governed-releases",
            kind: "workspace",
            workspaceId: "governed-releases",
          },
        },
        signalId: "blocked-operations",
        sourceId: "environment-lifecycle",
        stateLabel: "BLOCKED",
        summary:
          "Required environment evidence is unavailable for the selected release profile.",
        timingLabel: "Cannot progress",
        title: "Release profile evidence",
        tone: "danger",
      },
    ],
    tone: "danger",
  },
] as const satisfies readonly WorkspacePulseRecordScenario[];

const activeOperationScenarios = [
  {
    description: "Two governed operations are in motion.",
    id: "active",
    label: "Active",
    records: [
      {
        id: "active:delivery-refinement",
        owner: "Delivery",
        route: routes.delivery,
        signalId: "active-operations",
        sourceId: "delivery-art",
        stateLabel: "ACTIVE",
        summary: "A package is progressing through metadata refinement.",
        timingLabel: "In progress",
        title: "Delivery refinement",
        tone: "info",
      },
      {
        id: "active:prototype-preview",
        owner: "Prototype",
        route: routes.prototype,
        signalId: "active-operations",
        sourceId: "prototype-lifecycle",
        stateLabel: "RUNNING",
        summary: "A prototype-local preview runtime is available for review.",
        timingLabel: "Runtime active",
        title: "Prototype preview",
        tone: "ok",
      },
    ],
    tone: "info",
  },
  {
    description: "No governed operation is active.",
    id: "quiet",
    label: "Quiet",
    records: [],
    tone: "muted",
  },
] as const satisfies readonly WorkspacePulseRecordScenario[];

function sourcesWithState(
  sourceId: WorkspacePulseSource["id"],
  state: WorkspacePulseSource["state"],
) {
  return baseSources.map((source) =>
    source.id === sourceId ? { ...source, state } : source,
  );
}

const sourceCoverageScenarios = [
  {
    description: "Every expected fixture source is represented.",
    id: "represented",
    label: "Represented",
    sources: baseSources,
    tone: "info",
  },
  {
    description: "A represented source needs refresh.",
    id: "stale",
    label: "Stale",
    sources: sourcesWithState("environment-lifecycle", "stale"),
    tone: "stale",
  },
  {
    description: "An expected source is unavailable.",
    id: "unavailable",
    label: "Unavailable",
    sources: sourcesWithState("operator-workflows", "unavailable"),
    tone: "danger",
  },
] as const satisfies readonly WorkspacePulseSourceScenario[];

export const workspacePulseDesignScenarios = {
  "active-operations": activeOperationScenarios,
  "blocked-operations": blockedOperationScenarios,
  "required-decisions": requiredDecisionScenarios,
  "source-coverage": sourceCoverageScenarios,
} as const satisfies Record<
  WorkspacePulseSignalId,
  readonly WorkspacePulseDesignScenario[]
>;

function selectedScenario<TScenario extends WorkspacePulseDesignScenario>(
  scenarios: readonly TScenario[],
  selectedId: string | undefined,
) {
  return (
    scenarios.find(({ id }) => id === selectedId) ??
    scenarios[0]
  );
}

export function resolveWorkspacePulseFixture(
  selections: WorkspacePulseScenarioSelections = {},
) {
  const requiredDecisions = selectedScenario(
    requiredDecisionScenarios,
    selections["required-decisions"],
  );
  const blockedOperations = selectedScenario(
    blockedOperationScenarios,
    selections["blocked-operations"],
  );
  const activeOperations = selectedScenario(
    activeOperationScenarios,
    selections["active-operations"],
  );
  const sourceCoverage = selectedScenario(
    sourceCoverageScenarios,
    selections["source-coverage"],
  );
  const input = {
    projectionAuthority: "workspace-prototype-studio",
    projectedAt: null,
    projectionMode: "synthetic",
    records: [
      ...requiredDecisions.records,
      ...blockedOperations.records,
      ...activeOperations.records,
    ],
    schemaVersion: 1,
    sources: sourceCoverage.sources,
  } satisfies WorkspacePulseSnapshotInput;

  return projectWorkspacePulseSnapshot(input);
}

export const workspacePulseFixture = resolveWorkspacePulseFixture();
