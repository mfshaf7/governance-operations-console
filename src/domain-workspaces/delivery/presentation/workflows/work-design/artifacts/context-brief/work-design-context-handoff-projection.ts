import { workDesignContextDecisionCopy } from "../../view-model/work-design-context-decision-model.ts";

import type { WorkDesignFinalizedBrief } from "./work-design-context-brief-model.ts";

type WorkDesignContextBoardInventory = {
  summary: string;
};

type WorkDesignBuildSeedMetrics = {
  total: number;
};

export function workDesignContextHandoffProjection({
  contextBoardInventory,
  contextBuildSeedMetrics,
  contextBuildSeedSummary,
  contextFinalizedBrief,
}: {
  contextBoardInventory: WorkDesignContextBoardInventory;
  contextBuildSeedMetrics: WorkDesignBuildSeedMetrics;
  contextBuildSeedSummary: string;
  contextFinalizedBrief: WorkDesignFinalizedBrief;
}) {
  const contextFinalizedBriefTargetTitle =
    contextFinalizedBrief.decision === "proceed"
      ? "Build Tree Inputs"
      : contextFinalizedBrief.decision === "attach"
        ? "Existing Work Link"
        : "Retirement Record";
  const contextFinalizedBriefHandoffLabel =
    contextFinalizedBrief.decision === "proceed"
      ? "Build Tree Handoff"
      : "Decision Handoff";
  const contextFinalizedBriefDescription =
    contextFinalizedBrief.decision === "proceed"
      ? "Read-only handoff evidence carried from the context workspace into Build Tree."
      : contextFinalizedBrief.decision === "attach"
        ? "Read-only context evidence proving this source should attach to existing work."
        : "Read-only context evidence proving this duplicate source should retire without tree building.";
  const contextFinalizedBriefHandoffRows = [
    {
      label: "Canvas Contents",
      value: contextBoardInventory.summary,
    },
    {
      label: "Draft Seeds",
      value: contextBuildSeedSummary,
    },
    {
      label: "Build Tree Start",
      value:
        contextBuildSeedMetrics.total > 0
          ? "Hydrate from confirmed seeds"
          : "Start from selected Epic shell",
    },
  ];
  const contextFinalizedBriefNextSurface =
    contextFinalizedBrief.carriedMetadata.find(
      (item) => item.label === "Next Surface",
    )?.value ?? contextFinalizedBriefTargetTitle;
  const contextFinalizedBriefReceiptRows = [
    {
      label: "Decision",
      value: workDesignContextDecisionCopy(contextFinalizedBrief.decision)
        .label,
    },
    {
      label: "Next Step",
      value: contextFinalizedBriefNextSurface,
    },
    ...contextFinalizedBriefHandoffRows.filter((item) =>
      ["Canvas Contents", "Draft Seeds"].includes(item.label),
    ),
  ];

  return {
    contextFinalizedBriefDescription,
    contextFinalizedBriefHandoffLabel,
    contextFinalizedBriefReceiptRows,
    contextFinalizedBriefTargetTitle,
  };
}
