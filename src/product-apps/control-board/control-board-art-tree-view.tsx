"use client";

import { useEffect, useMemo, useState } from "react";

import {
  TerasEmptyState,
  TerasUtilityButton,
} from "@/teras";
import {
  BuildTreeNodeCard,
  BuildTreeNodeChildren,
  BuildTreeNodeStack,
  BuildTreeNodeToggle,
} from "@/product-apps/build-tree";

import type { ControlBoardTreeNode } from "./control-board-model";
import styles from "./control-board.module.css";

export function ControlBoardArtTreeView({
  tree,
}: {
  tree: ControlBoardTreeNode | null;
}) {
  const expandableNodeIds = useMemo(
    () => (tree ? collectExpandableTreeNodeIds(tree) : []),
    [tree],
  );
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<string[]>([]);

  useEffect(() => {
    setCollapsedNodeIds((current) =>
      current.filter((nodeId) => expandableNodeIds.includes(nodeId)),
    );
  }, [expandableNodeIds]);

  if (!tree) {
    return (
      <TerasEmptyState fill>
        No projected ART tree is available for this package yet.
      </TerasEmptyState>
    );
  }

  const collapsedNodeIdSet = new Set(collapsedNodeIds);
  const allCollapsed =
    expandableNodeIds.length > 0 &&
    collapsedNodeIds.length === expandableNodeIds.length;

  return (
    <div className={styles.controlBoardTreeSurface}>
      <div className={styles.controlBoardTreeToolbar}>
        <TerasUtilityButton
          disabled={expandableNodeIds.length === 0}
          onClick={() =>
            setCollapsedNodeIds(allCollapsed ? [] : expandableNodeIds)
          }
          variant="subtle"
        >
          {allCollapsed ? "Expand All" : "Collapse All"}
        </TerasUtilityButton>
      </div>
      <BuildTreeNodeStack>
        <TreeNode
          collapsedNodeIds={collapsedNodeIdSet}
          node={tree}
          onToggleNode={(nodeId) =>
            setCollapsedNodeIds((current) =>
              current.includes(nodeId)
                ? current.filter((currentNodeId) => currentNodeId !== nodeId)
                : [...current, nodeId],
            )
          }
          selected
        />
      </BuildTreeNodeStack>
    </div>
  );
}

function TreeNode({
  collapsedNodeIds,
  node,
  onToggleNode,
  selected = false,
}: {
  collapsedNodeIds: Set<string>;
  node: ControlBoardTreeNode;
  onToggleNode: (nodeId: string) => void;
  selected?: boolean;
}) {
  const terminalNode = ["Milestone", "Risk", "User story"].includes(
    node.componentType,
  );
  const expandable = node.children.length > 0;
  const expanded = expandable && !collapsedNodeIds.has(node.id);

  return (
    <BuildTreeNodeStack>
      <BuildTreeNodeCard
        childrenCount={terminalNode ? undefined : node.totalChildCount}
        control={
          expandable ? (
            <BuildTreeNodeToggle
              expanded={expanded}
              label={`${expanded ? "Collapse" : "Expand"} ${node.title}`}
              onClick={() => {
                onToggleNode(node.id);
              }}
            />
          ) : null
        }
        dataKind={node.componentType}
        description={node.description}
        indexLabel={node.componentType.slice(0, 2).toUpperCase()}
        kind={node.componentType}
        selected={selected}
        title={node.title}
      />
      {expanded ? (
        <BuildTreeNodeChildren className={styles.controlBoardTreeChildren}>
          {node.children.map((child) => (
            <TreeNode
              collapsedNodeIds={collapsedNodeIds}
              key={child.id}
              node={child}
              onToggleNode={onToggleNode}
            />
          ))}
        </BuildTreeNodeChildren>
      ) : null}
    </BuildTreeNodeStack>
  );
}

function collectExpandableTreeNodeIds(node: ControlBoardTreeNode): string[] {
  return [
    ...(node.children.length > 0 ? [node.id] : []),
    ...node.children.flatMap(collectExpandableTreeNodeIds),
  ];
}
