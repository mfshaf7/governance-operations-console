import type { TerasMetadataItem } from "@/teras";

import type { WorkDesignFinalizedBrief } from "../../artifacts/context-brief/index.ts";
import { formatWorkDesignDateTime } from "../../view-model/work-design-display-formatters.ts";

export function workDesignBuildTreeCountLabel(
  count: number,
  singular: string,
  plural = `${singular}s`,
) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function workDesignBuildTreeContextHandoffMetadata({
  contextDecisionLabel,
  contextFinalizedBrief,
  contextSnapshotAttachmentStatusLabel,
  treeMetrics,
}: {
  contextDecisionLabel: string;
  contextFinalizedBrief: WorkDesignFinalizedBrief;
  contextSnapshotAttachmentStatusLabel: string;
  treeMetrics: {
    features: number;
    risks: number;
    stories: number;
  };
}): TerasMetadataItem[] {
  return [
    {
      label: "Brief",
      value: contextFinalizedBrief.finalizedAt
        ? formatWorkDesignDateTime(contextFinalizedBrief.finalizedAt)
        : "Local session",
    },
    {
      label: "Snapshot",
      value: contextSnapshotAttachmentStatusLabel,
    },
    {
      label: "Decision",
      value: contextDecisionLabel,
    },
    {
      label: "Draft Tree",
      value: `${workDesignBuildTreeCountLabel(treeMetrics.features, "Feature")} / ${workDesignBuildTreeCountLabel(treeMetrics.stories, "Story", "Stories")} / ${workDesignBuildTreeCountLabel(treeMetrics.risks, "Risk")}`,
    },
  ];
}
