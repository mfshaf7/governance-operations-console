"use client";

import { TerasSegmentedControl, TerasStatusPill } from "@/teras";
import { BuildTreeTargetSelector } from "@/product-apps/build-tree";
import type { DeliveryRefinementTreeNode } from "../../../../../read-model/index.ts";

import {
  refinementMetadataTargetNodeSharedMeta,
  refinementMetadataTargetSelectedNodeIds,
  refinementMetadataTargetSelectionMode,
  type RefinementMetadataTarget,
} from "../../view-model/refinement-metadata-model.ts";
import type {
  RefinementMetadataFieldResolutionMap,
  RefinementMetadataSelectionMode,
} from "../../model/refinement-model.ts";

const metadataSelectionModeOptions: Array<{
  label: string;
  value: RefinementMetadataSelectionMode;
}> = [
  { value: "single", label: "Single" },
  { value: "shared", label: "Shared" },
];

export function MetadataSelectionModeSwitch({
  mode,
  onSelectMode,
}: {
  mode: RefinementMetadataSelectionMode;
  onSelectMode: (mode: RefinementMetadataSelectionMode) => void;
}) {
  return (
    <TerasSegmentedControl
      ariaLabel="Metadata target selection mode"
      onValueChange={onSelectMode}
      options={metadataSelectionModeOptions}
      value={mode}
    />
  );
}

export function MetadataTargetTree({
  metadataSelectionMode,
  metadataFieldResolutions,
  node,
  onSelectMetadataField,
  onToggleMetadataBulkNode,
  position,
  selectedBulkNodeIds,
  selectedNodeId,
  targets,
}: {
  metadataSelectionMode: RefinementMetadataSelectionMode;
  metadataFieldResolutions: RefinementMetadataFieldResolutionMap;
  node: DeliveryRefinementTreeNode;
  onSelectMetadataField: (fieldKey: string) => void;
  onToggleMetadataBulkNode: (nodeId: string) => void;
  position: number;
  selectedBulkNodeIds: string[];
  selectedNodeId: string;
  targets: RefinementMetadataTarget[];
}) {
  const selectedNodeIds = refinementMetadataTargetSelectedNodeIds({
    metadataSelectionMode,
    selectedBulkNodeIds,
    selectedNodeId,
  });

  function targetStats(targetNode: DeliveryRefinementTreeNode) {
    const nodeTargets = targets.filter(
      (target) => target.node.id === targetNode.id,
    );
    const openTargets = nodeTargets.filter(
      (target) =>
        target.status !== "complete" &&
        target.status !== "blocked" &&
        !metadataFieldResolutions[target.key],
    );
    const blockedTargets = nodeTargets.filter(
      (target) => target.status === "blocked",
    );
    const actionableTargets = nodeTargets.filter(
      (target) => target.status !== "complete",
    );

    return {
      actionableTargets,
      blockedTargets,
      firstTarget: openTargets[0] ?? actionableTargets[0] ?? nodeTargets[0],
      nodeTargets,
      openTargets,
    };
  }

  function metadataTargetNodeMeta(targetNode: DeliveryRefinementTreeNode) {
    const { actionableTargets, blockedTargets, openTargets } =
      targetStats(targetNode);
    const bulkSelected = selectedBulkNodeIds.includes(targetNode.id);

    if (metadataSelectionMode === "shared") {
      const sharedMeta = refinementMetadataTargetNodeSharedMeta({
        bulkSelected,
      });

      return (
        <TerasStatusPill tone={sharedMeta.tone}>
          {sharedMeta.label}
        </TerasStatusPill>
      );
    }

    return (
      <TerasStatusPill
        tone={metadataTargetNodeTone({
          actionableCount: actionableTargets.length,
          blockedCount: blockedTargets.length,
          openCount: openTargets.length,
        })}
      >
        {metadataTargetNodeLabel({
          actionableCount: actionableTargets.length,
          blockedCount: blockedTargets.length,
          openCount: openTargets.length,
        })}
      </TerasStatusPill>
    );
  }

  function selectMetadataTargetNode(targetNode: DeliveryRefinementTreeNode) {
    if (metadataSelectionMode === "shared") {
      onToggleMetadataBulkNode(targetNode.id);
      return;
    }

    const { firstTarget } = targetStats(targetNode);

    if (firstTarget) {
      onSelectMetadataField(firstTarget.key);
    }
  }

  return (
    <BuildTreeTargetSelector
      getIndex={metadataTargetNodeIndex}
      getMeta={metadataTargetNodeMeta}
      onSelectNode={selectMetadataTargetNode}
      rootPosition={position}
      selectedNodeIds={selectedNodeIds}
      selectionMode={refinementMetadataTargetSelectionMode(
        metadataSelectionMode,
      )}
      tree={node}
    />
  );
}

function metadataTargetNodeIndex(
  node: DeliveryRefinementTreeNode,
  position: number,
) {
  if (node.kind === "Epic") {
    return "E";
  }

  if (node.kind === "Risk") {
    return "R";
  }

  return String(position + 1).padStart(2, "0");
}

function metadataTargetNodeTone({
  actionableCount,
  blockedCount,
  openCount,
}: {
  actionableCount: number;
  blockedCount: number;
  openCount: number;
}) {
  if (blockedCount > 0) {
    return "danger" as const;
  }

  if (openCount > 0) {
    return "warn" as const;
  }

  if (actionableCount > 0) {
    return "ok" as const;
  }

  return "info" as const;
}

function metadataTargetNodeLabel({
  actionableCount,
  blockedCount,
  openCount,
}: {
  actionableCount: number;
  blockedCount: number;
  openCount: number;
}) {
  if (blockedCount > 0) {
    return `${blockedCount} blocked`;
  }

  if (openCount > 0) {
    return `${openCount} open`;
  }

  if (actionableCount > 0) {
    return "clear";
  }

  return "ready";
}
