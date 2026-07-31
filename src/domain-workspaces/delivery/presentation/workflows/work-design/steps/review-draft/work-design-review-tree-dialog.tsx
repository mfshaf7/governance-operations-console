"use client";

import {
  TerasDialog,
  TerasActionButton,
  TerasStatGroup,
  TerasStatItem,
} from "@/teras";
import {
  BuildTreeViewer,
  buildTreeReadOnlyModeLabel,
} from "@/product-apps/build-tree";
import {
  workDesignNodeDisplayTitle,
  workDesignNodeIndex,
  workDesignNodeKindLabel,
  workDesignNodeSummary,
  workDesignStructuredChildCountLabel,
  workDesignStructuredNodeLayout,
} from "../../../../../product-adapters/build-tree/index.ts";
import type { WorkDesignNode } from "../../model/work-design-model.ts";

type WorkDesignReviewTreeMetrics = {
  features: number;
  risks: number;
  stories: number;
};

type WorkDesignReviewTreeDialogProps = {
  metrics: WorkDesignReviewTreeMetrics;
  onClose: () => void;
  onOpenBuildTree: () => void;
  onToggleAll: () => void;
  onToggleNode: (nodeId: string) => void;
  open: boolean;
  packageName: string;
  reviewTreeCollapsedNodeIds: string[];
  tree: WorkDesignNode;
};

export function WorkDesignReviewTreeDialog({
  metrics,
  onClose,
  onOpenBuildTree,
  onToggleAll,
  onToggleNode,
  open,
  packageName,
  reviewTreeCollapsedNodeIds,
  tree,
}: WorkDesignReviewTreeDialogProps) {
  return (
    <TerasDialog
      contentOverflow="hidden"
      height="fill"
      width="large"
      actions={
        <TerasActionButton onClick={onOpenBuildTree}>
          Open Build Tree
        </TerasActionButton>
      }
      closeLabel="Close full tree viewer"
      description="Inspect the complete draft tree that will be reviewed. Edits stay in Build Tree."
      kicker="Read-Only Draft Tree"
      onClose={onClose}
      open={open}
      title={packageName}
    >
      <TerasStatGroup columns={4}>
        <TerasStatItem label="Features" value={metrics.features} />
        <TerasStatItem label="User Stories" value={metrics.stories} />
        <TerasStatItem label="Risks" value={metrics.risks} />
        <TerasStatItem label="Mode" value={buildTreeReadOnlyModeLabel} />
      </TerasStatGroup>
      <BuildTreeViewer
        collapsedNodeIds={reviewTreeCollapsedNodeIds}
        copy={{
          groupedEmptyDescription: "No draft stories captured.",
          groupedItemLabel: "User Stories",
          groupedVisibleDescription:
            "Full story stack visible for read-only inspection.",
          groupedVisibleTitle: (count) =>
            `${count} draft ${count === 1 ? "story" : "stories"}`,
          supportGroupLabel: "Support Branches",
          toolbarKicker: "Tree View",
        }}
        getChildCountLabel={workDesignStructuredChildCountLabel}
        getDisplayTitle={workDesignNodeDisplayTitle}
        getIndex={workDesignNodeIndex}
        getKindLabel={workDesignNodeKindLabel}
        getLayout={workDesignStructuredNodeLayout}
        getSummary={workDesignNodeSummary}
        groupKind="Feature"
        leafKind="User story"
        onToggleAll={onToggleAll}
        onToggleNode={onToggleNode}
        rootKind="Epic"
        tree={tree}
      />
    </TerasDialog>
  );
}
