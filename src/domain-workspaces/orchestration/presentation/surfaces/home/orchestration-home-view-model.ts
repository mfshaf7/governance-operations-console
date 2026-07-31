import type { OperationTone } from "../../../../operation-projections/index.ts";
import {
  orchestrationRunPosture,
  orchestrationRunRequiredMove,
} from "../../../read-model/runs/orchestration-run-selectors.ts";
import type { OrchestrationRunLifecycle } from "@/domain-workspaces/orchestration/domain/orchestration-run-types";
import type {
  OrchestrationAttentionCondition,
  OrchestrationWorkspaceReadModel,
} from "../../../read-model/workspace/orchestration-workspace-read-model.ts";

export type OrchestrationHomeTargetSurface = "definitions" | "runs";

export type OrchestrationHomeAttentionFilters = {
  condition: "all" | OrchestrationAttentionCondition;
  owner: string;
  query: string;
  scope: "all" | "definition" | "run";
};

export type OrchestrationHomeAttentionRow = {
  actionLabel: string;
  condition: OrchestrationAttentionCondition;
  detail: string;
  id: string;
  label: string;
  meta: string;
  owner: string;
  scope: "definition" | "run";
  targetSurfaceId: OrchestrationHomeTargetSurface;
  title: string;
  tone: OperationTone;
};

export type OrchestrationHomeInFlightRow = {
  actionLabel: string;
  detail: string;
  id: string;
  label: string;
  meta: string;
  targetSurfaceId: "runs";
  title: string;
  tone: OperationTone;
};

export type OrchestrationHomeMaterialEventRow = {
  detail: string;
  id: string;
  label: string;
  meta: string;
  title: string;
  tone: OperationTone;
};

export type OrchestrationHomeViewModel = {
  attention: OrchestrationHomeAttentionRow[];
  conditionOptions: Array<{
    label: string;
    value: OrchestrationHomeAttentionFilters["condition"];
  }>;
  inFlightRuns: OrchestrationHomeInFlightRow[];
  materialEvents: OrchestrationHomeMaterialEventRow[];
  ownerOptions: Array<{ label: string; value: string }>;
  workspaceStatus: OrchestrationWorkspaceReadModel["workspaceStatus"];
};

export const defaultOrchestrationHomeAttentionFilters: OrchestrationHomeAttentionFilters =
  {
    condition: "all",
    owner: "all",
    query: "",
    scope: "all",
  };

export const orchestrationHomeScopeOptions: Array<{
  label: string;
  value: OrchestrationHomeAttentionFilters["scope"];
}> = [
  { label: "All scope", value: "all" },
  { label: "Definitions", value: "definition" },
  { label: "Runs", value: "run" },
];

export function getOrchestrationHomeViewModel(
  readModel: OrchestrationWorkspaceReadModel,
): OrchestrationHomeViewModel {
  const attention = readModel.attention.map((item) => ({
    actionLabel: item.kind === "definition" ? "Open Definitions" : "Open Runs",
    condition: item.condition,
    detail: `${sentence(item.detail)} Next: ${sentence(item.requiredMove)}`,
    id: item.id,
    label: `${scopeLabel(item.kind)} / ${conditionLabel(item.condition)}`,
    meta: `${item.owner} / ${formatOrchestrationTimestamp(item.updatedAt)}`,
    owner: item.owner,
    scope: item.kind,
    targetSurfaceId:
      item.kind === "definition" ? ("definitions" as const) : ("runs" as const),
    title: item.label,
    tone: item.tone,
  }));

  return {
    attention,
    conditionOptions: [
      { label: "All conditions", value: "all" },
      ...uniqueValues(attention.map((item) => item.condition)).map((value) => ({
        label: conditionLabel(value),
        value,
      })),
    ],
    inFlightRuns: readModel.inFlightRuns.map((run) => {
      const posture = orchestrationRunPosture(run);
      const currentNode = run.nodes.find(
        (node) => node.id === run.currentNodeId,
      );

      return {
        actionLabel: "Open Runs",
        detail: `${sentence(currentNode?.label ?? "Awaiting scheduling")} Next: ${sentence(orchestrationRunRequiredMove(run))}`,
        id: run.id,
        label: posture.label,
        meta: `${run.definitionId} v${run.definitionVersion} / ${currentNode?.owner ?? run.sourceDomain} / ${formatOrchestrationTimestamp(run.updatedAt)}`,
        targetSurfaceId: "runs",
        title: run.runId,
        tone: posture.tone,
      };
    }),
    materialEvents: readModel.materialEvents.map((event) => ({
      detail: event.summary,
      id: event.eventId,
      label: runStateLabel(event.state),
      meta: [
        event.definitionId,
        `event ${String(event.sequence).padStart(2, "0")}`,
        event.nodeId ? `node ${event.nodeId}` : "run",
        formatOrchestrationTimestamp(event.occurredAt),
      ].join(" / "),
      title: event.runId,
      tone: runStateTone(event.state),
    })),
    ownerOptions: [
      { label: "All owners", value: "all" },
      ...uniqueValues(attention.map((item) => item.owner)).map((value) => ({
        label: value,
        value,
      })),
    ],
    workspaceStatus: readModel.workspaceStatus,
  };
}

export function filterOrchestrationHomeAttention(
  rows: readonly OrchestrationHomeAttentionRow[],
  filters: OrchestrationHomeAttentionFilters,
) {
  const query = filters.query.trim().toLowerCase();

  return rows.filter((row) => {
    const matchesQuery =
      !query ||
      [
        row.condition,
        row.detail,
        row.label,
        row.owner,
        row.scope,
        row.title,
      ].some((value) => value.toLowerCase().includes(query));

    return (
      matchesQuery &&
      (filters.scope === "all" || row.scope === filters.scope) &&
      (filters.condition === "all" || row.condition === filters.condition) &&
      (filters.owner === "all" || row.owner === filters.owner)
    );
  });
}

export function orchestrationHomeAttentionProjection({
  filteredCount,
  rows,
}: {
  filteredCount: number;
  rows: readonly OrchestrationHomeAttentionRow[];
}) {
  const tone: OperationTone = rows.some((row) => row.tone === "danger")
    ? "danger"
    : rows.length > 0
      ? "warn"
      : "ok";

  return {
    statusLabel: `${filteredCount}/${rows.length} shown`,
    tone,
  };
}

export function orchestrationHomeInFlightProjection(runCount: number) {
  return {
    statusLabel: `${runCount} runs`,
    tone: runCount > 0 ? ("info" as const) : ("muted" as const),
  };
}

export function orchestrationHomeMaterialEventsProjection(eventCount: number) {
  return {
    statusLabel: `${eventCount} events`,
    tone: eventCount > 0 ? ("info" as const) : ("muted" as const),
  };
}

function conditionLabel(condition: OrchestrationAttentionCondition) {
  switch (condition) {
    case "admission-review":
      return "Admission Review";
    case "definition-ready":
      return "Definition Ready";
    case "implementation-requested":
      return "Implementation Requested";
    case "qualification":
      return "Qualification";
    default:
      return runStateLabel(condition);
  }
}

function scopeLabel(scope: "definition" | "run") {
  return scope === "definition" ? "Definition" : "Run";
}

function runStateLabel(state: OrchestrationRunLifecycle) {
  return `${state.slice(0, 1).toUpperCase()}${state.slice(1)}`;
}

function runStateTone(state: OrchestrationRunLifecycle): OperationTone {
  switch (state) {
    case "blocked":
    case "failed":
      return "danger";
    case "cancelled":
      return "muted";
    case "completed":
      return "ok";
    case "waiting":
      return "warn";
    default:
      return "info";
  }
}

function formatOrchestrationTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(value));
}

function uniqueValues<Value extends string>(values: readonly Value[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function sentence(value: string) {
  const trimmed = value.trim();

  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}
