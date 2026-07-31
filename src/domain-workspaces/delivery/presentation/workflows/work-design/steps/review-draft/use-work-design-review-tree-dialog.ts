"use client";

import { useState } from "react";

import { toggleBuildTreeStateId } from "@/product-apps/build-tree";

import { workDesignReviewCollapsibleNodeIds } from "../../../../../product-adapters/build-tree/index.ts";
import type { WorkDesignNode } from "../../model/work-design-model.ts";

type UseWorkDesignReviewTreeDialogParams = {
  tree: WorkDesignNode;
};

export function useWorkDesignReviewTreeDialog({
  tree,
}: UseWorkDesignReviewTreeDialogParams) {
  const [reviewTreeDialogOpen, setReviewTreeDialogOpen] = useState(false);
  const [reviewTreeCollapsedNodeIds, setReviewTreeCollapsedNodeIds] = useState<
    string[]
  >([]);

  function openReviewTreeDialog() {
    setReviewTreeCollapsedNodeIds([]);
    setReviewTreeDialogOpen(true);
  }

  function toggleReviewTreeNode(nodeId: string) {
    setReviewTreeCollapsedNodeIds((current) =>
      toggleBuildTreeStateId(current, nodeId),
    );
  }

  function collapseAllReviewTreeNodes() {
    setReviewTreeCollapsedNodeIds(
      workDesignReviewCollapsibleNodeIds(tree).filter(
        (nodeId) => nodeId !== tree.id,
      ),
    );
  }

  function expandAllReviewTreeNodes() {
    setReviewTreeCollapsedNodeIds([]);
  }

  function toggleAllReviewTreeNodes() {
    if (reviewTreeCollapsedNodeIds.length === 0) {
      collapseAllReviewTreeNodes();
      return;
    }

    expandAllReviewTreeNodes();
  }

  return {
    openReviewTreeDialog,
    reviewTreeCollapsedNodeIds,
    reviewTreeDialogOpen,
    setReviewTreeDialogOpen,
    toggleAllReviewTreeNodes,
    toggleReviewTreeNode,
  };
}
