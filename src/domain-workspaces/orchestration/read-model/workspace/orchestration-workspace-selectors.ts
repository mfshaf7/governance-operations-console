import {
  orchestrationDefinitionPosture,
  orchestrationDefinitionRequiredMove,
  orchestrationDefinitionSummary,
} from "../definitions/orchestration-definition-selectors.ts";
import type { OrchestrationDefinitionRecord } from "../../domain/orchestration-definition-types.ts";
import {
  orchestrationAttentionRuns,
  orchestrationInFlightRuns,
  orchestrationMaterialEvents,
  orchestrationRunPosture,
  orchestrationRunRequiredMove,
  orchestrationRunSummary,
} from "../runs/orchestration-run-selectors.ts";
import type { OrchestrationRunRecord } from "../../domain/orchestration-run-types.ts";
import type {
  OrchestrationAttentionCondition,
  OrchestrationAttentionItem,
  OrchestrationHomeSummaryMetric,
  OrchestrationWorkspaceSummary,
} from "./orchestration-workspace-types.ts";

export function orchestrationWorkspaceSummary({
  definitions,
  runs,
}: {
  definitions: readonly OrchestrationDefinitionRecord[];
  runs: readonly OrchestrationRunRecord[];
}): OrchestrationWorkspaceSummary {
  return {
    definitions: orchestrationDefinitionSummary(definitions),
    home: orchestrationHomeSummary(definitions, runs),
    runs: orchestrationRunSummary(runs),
  };
}

export function orchestrationHomeSummary(
  definitions: readonly OrchestrationDefinitionRecord[],
  runs: readonly OrchestrationRunRecord[],
): OrchestrationHomeSummaryMetric[] {
  const definitionWork = definitions.filter((record) =>
    record.lifecycle
      ? [
          "admission-review",
          "candidate",
          "definition-ready",
          "implementation-requested",
          "qualified",
        ].includes(record.lifecycle)
      : record.qualification.status === "in-progress",
  ).length;
  const countRuns = (...states: OrchestrationRunRecord["state"][]) =>
    runs.filter((run) => states.includes(run.state)).length;

  return [
    {
      id: "active-runs",
      label: "Active Runs",
      tone: "info",
      value: String(countRuns("queued", "running")),
    },
    {
      id: "waiting",
      label: "Waiting",
      tone: "warn",
      value: String(countRuns("waiting")),
    },
    {
      id: "blocked",
      label: "Blocked",
      tone: "danger",
      value: String(countRuns("blocked")),
    },
    {
      id: "failed",
      label: "Failed",
      tone: "danger",
      value: String(countRuns("failed")),
    },
    {
      id: "definition-work",
      label: "Definition Work",
      tone: "warn",
      value: String(definitionWork),
    },
  ];
}

export function orchestrationAttentionQueue({
  definitions,
  now,
  runs,
}: {
  definitions: readonly OrchestrationDefinitionRecord[];
  now: string;
  runs: readonly OrchestrationRunRecord[];
}): OrchestrationAttentionItem[] {
  const definitionItems: OrchestrationAttentionItem[] = definitions
    .filter(
      (record) =>
        record.qualification.status === "in-progress" ||
        record.lifecycle === "definition-ready" ||
        record.lifecycle === "implementation-requested" ||
        record.lifecycle === "admission-review",
    )
    .map((record) => {
      const posture = orchestrationDefinitionPosture(record);

      return {
        condition: orchestrationDefinitionAttentionCondition(record),
        detail: posture.detail,
        id: `definition:${record.id}`,
        kind: "definition",
        label: record.title,
        owner: record.executionOwner,
        requiredMove: orchestrationDefinitionRequiredMove(record),
        tone: posture.tone,
        updatedAt: record.updatedAt,
      };
    });
  const runItems: OrchestrationAttentionItem[] = orchestrationAttentionRuns(
    runs,
    now,
  ).map((run) => {
    const posture = orchestrationRunPosture(run);

    return {
      condition: orchestrationRunAttentionCondition(run),
      detail: posture.detail,
      id: `run:${run.id}`,
      kind: "run",
      label: run.runId,
      owner:
        run.nodes.find((node) => node.id === run.currentNodeId)?.owner ??
        run.sourceDomain,
      requiredMove: orchestrationRunRequiredMove(run),
      tone: posture.tone,
      updatedAt: run.updatedAt,
    };
  });

  return [...definitionItems, ...runItems].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

export { orchestrationInFlightRuns, orchestrationMaterialEvents };

function orchestrationDefinitionAttentionCondition(
  record: OrchestrationDefinitionRecord,
): OrchestrationAttentionCondition {
  if (record.qualification.status === "in-progress") {
    return "qualification";
  }

  switch (record.lifecycle) {
    case "admission-review":
      return "admission-review";
    case "definition-ready":
      return "definition-ready";
    case "implementation-requested":
      return "implementation-requested";
    default:
      return "qualification";
  }
}

function orchestrationRunAttentionCondition(
  run: OrchestrationRunRecord,
): OrchestrationAttentionCondition {
  switch (run.state) {
    case "blocked":
    case "failed":
    case "waiting":
      return run.state;
    default:
      throw new Error(
        `Run ${run.id} does not have an attention-owned lifecycle state.`,
      );
  }
}
