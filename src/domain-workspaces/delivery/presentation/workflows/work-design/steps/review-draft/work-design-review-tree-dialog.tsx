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

import { deliveryTreeTitleParts } from "../../../../../product-adapters/build-tree/delivery-tree-title.ts";

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
  historical: boolean;
  epicNumber: number;
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
  historical,
  epicNumber,
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
      description={historical ? "Open a work item to read its retained notes." : "Open a work item to read its saved draft notes before review."}
      kicker={historical ? "Work Design History" : "Read-Only Draft Tree"}
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
      {open ? <BuildTreeViewer
        collapsedNodeIds={reviewTreeCollapsedNodeIds}
        copy={{
          groupedEmptyDescription: historical ? "No user stories recorded." : "No draft stories captured.",
          groupedItemLabel: "User Stories",
          groupedVisibleDescription: "Open a story to read its notes.",
          groupedVisibleTitle: (count) =>
            `${count} ${historical ? "user" : "draft"} ${count === 1 ? "story" : "stories"}`,
          supportGroupLabel: "Support Branches",
          toolbarKicker: "Tree View",
        }}
        getChildCountLabel={workDesignStructuredChildCountLabel}
        getDisplayTitle={workDesignNodeDisplayTitle}
        getIndex={workDesignNodeIndex}
        getKindLabel={workDesignNodeKindLabel}
        getLayout={workDesignStructuredNodeLayout}
        getSummary={workDesignNodeSummary}
        getTitleParts={node => deliveryTreeTitleParts(node, node.recordedWorkItemNumber ?? (node.kind === "Epic" ? epicNumber : undefined))}
        getItemText={node => {
          const hasDraft = Boolean(node.draftBody.trim());
          const content = hasDraft ? node.draftBody : node.description;
          return {
            label: historical ? "Work item notes" : hasDraft ? "Draft Notes" : "Description",
            content,
            status: historical ? content.trim() ? "notes recorded" : "no notes recorded" : hasDraft ? "drafted" : "needs draft",
          };
        }}
        groupKind="Feature"
        leafKind="User story"
        onToggleAll={onToggleAll}
        onToggleNode={onToggleNode}
        rootKind="Epic"
        tree={tree}
      /> : null}
    </TerasDialog>
  );
}
