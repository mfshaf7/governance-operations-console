"use client";

import { ChevronDown } from "lucide-react";
import type { CSSProperties } from "react";

import { TerasActionButton, TerasContentTray } from "@/teras";

import type { BuildTreeNodeLike } from "./build-tree-core";
import {
  buildTreeReadOnlyExpansionStateLabel,
  buildTreeReadOnlyToggleAllAriaLabel,
  buildTreeReadOnlyToggleAllLabel,
} from "./build-tree-view-contract";
import type { BuildTreeStructuredNodeLayout } from "./build-tree-view-model";
import styles from "./build-tree-viewer.module.css";

export type BuildTreeViewerCopy = {
  groupedEmptyDescription?: string;
  groupedItemLabel?: string;
  groupedVisibleDescription?: string;
  groupedVisibleTitle?: (count: number) => string;
  supportGroupLabel?: string;
  toolbarKicker?: string;
};

export type BuildTreeViewerProps<TNode extends BuildTreeNodeLike<TNode>> = {
  collapsedNodeIds: string[];
  copy?: BuildTreeViewerCopy;
  getChildCountLabel: (node: TNode) => string;
  getDisplayTitle: (node: TNode) => string;
  getIndex: (node: TNode, position: number) => string;
  getKindLabel: (kind: TNode["kind"]) => string;
  getLayout: (node: TNode) => BuildTreeStructuredNodeLayout<TNode>;
  getSummary: (node: TNode) => string;
  groupKind: TNode["kind"];
  leafKind: TNode["kind"];
  onToggleAll: () => void;
  onToggleNode: (nodeId: string) => void;
  rootKind: TNode["kind"];
  tree: TNode;
};

const defaultViewerCopy = {
  groupedEmptyDescription: "No draft items captured.",
  groupedItemLabel: "Grouped Items",
  groupedVisibleDescription: "Full item stack visible for read-only inspection.",
  supportGroupLabel: "Support Branches",
  toolbarKicker: "Tree View",
};

export function BuildTreeViewer<TNode extends BuildTreeNodeLike<TNode>>({
  collapsedNodeIds,
  copy,
  getChildCountLabel,
  getDisplayTitle,
  getIndex,
  getKindLabel,
  getLayout,
  getSummary,
  groupKind,
  leafKind,
  onToggleAll,
  onToggleNode,
  rootKind,
  tree,
}: BuildTreeViewerProps<TNode>) {
  const resolvedCopy = {
    ...defaultViewerCopy,
    ...copy,
  };

  function buildTreeViewerNodeRole(node: TNode) {
    if (node.kind === rootKind) {
      return "root";
    }

    if (node.kind === groupKind) {
      return "group";
    }

    if (node.kind === leafKind) {
      return "leaf";
    }

    return "support";
  }

  function renderReadOnlyNode(node: TNode, depth = 0, position = 0) {
    const layout = getLayout(node);
    const supportChildren = layout.supportChildren;
    const groupedLeafChildren = layout.groupedLeafChildren;
    const visibleChildren = layout.visibleChildren;
    const collapsed = collapsedNodeIds.includes(node.id);
    const collapsible =
      node.kind !== leafKind &&
      (visibleChildren.length > 0 ||
        supportChildren.length > 0 ||
        groupedLeafChildren.length > 0);
    const displayTitle = getDisplayTitle(node);
    const structuredChildCount = getChildCountLabel(node);
    const nodeRole = buildTreeViewerNodeRole(node);

    return (
      <div className={styles.buildTreeStructuredTreeBranch} key={node.id}>
        <div
          className={`${styles.buildTreeStructuredTreeNode} ${styles.buildTreeViewerStructuredNode}`}
          data-kind={node.kind}
          data-role={nodeRole}
          style={{ "--build-tree-depth": depth } as CSSProperties}
        >
          <div className={styles.buildTreeStructuredTreeSelect}>
            <span className={styles.buildTreeStructuredTreeIndex}>
              {getIndex(node, position)}
            </span>
            <span className={styles.buildTreeStructuredTreeText}>
              <span className={styles.buildTreeStructuredTreeKind}>
                {getKindLabel(node.kind)}
              </span>
              <strong>{displayTitle}</strong>
              <small>{getSummary(node)}</small>
            </span>
          </div>
          {node.kind !== leafKind || collapsible ? (
            <div className={styles.buildTreeViewerTreeNodeControls}>
              {node.kind !== leafKind ? (
                <div className={styles.buildTreeStructuredTreeMeta}>
                  <span>{structuredChildCount}</span>
                  <span>{node.draftBody.trim() ? "drafted" : "needs draft"}</span>
                </div>
              ) : null}
              {collapsible ? (
                <button
                  aria-expanded={!collapsed}
                  aria-label={`${collapsed ? "Expand" : "Collapse"} ${displayTitle}`}
                  className={`${styles.buildTreeTreeToggle} ${styles.buildTreeViewerTreeToggle}`}
                  onClick={() => onToggleNode(node.id)}
                  type="button"
                >
                  <ChevronDown
                    aria-hidden="true"
                    className={!collapsed ? styles.buildTreeTreeToggleOpen : ""}
                  />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        {node.kind === groupKind && !collapsed ? (
          <div className={styles.buildTreeStructuredTreeChildren}>
            <div
              className={`${styles.buildTreeStructuredStoryGroup} ${styles.buildTreeStructuredStoryGroupOpen}`}
            >
              <div className={styles.buildTreeStructuredStoryGroupCard}>
                <div className={styles.buildTreeStructuredStoryGroupButton}>
                  <span className={styles.buildTreeStructuredStoryGroupIndex}>
                    {resolvedCopy.groupedItemLabel
                      .split(" ")
                      .map((word) => word[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                  <span className={styles.buildTreeStructuredStoryGroupText}>
                    <span>{resolvedCopy.groupedItemLabel}</span>
                    <strong>
                      {resolvedCopy.groupedVisibleTitle
                        ? resolvedCopy.groupedVisibleTitle(groupedLeafChildren.length)
                        : `${groupedLeafChildren.length} draft ${groupedLeafChildren.length === 1 ? "item" : "items"}`}
                    </strong>
                    <small>
                      {groupedLeafChildren.length === 0
                        ? resolvedCopy.groupedEmptyDescription
                        : resolvedCopy.groupedVisibleDescription}
                    </small>
                  </span>
                </div>
              </div>
              {groupedLeafChildren.length > 0 ? (
                <div className={styles.buildTreeStructuredStoryList}>
                  {groupedLeafChildren.map((child, childIndex) =>
                    renderReadOnlyNode(child, depth + 2, childIndex),
                  )}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
        {visibleChildren.length > 0 && !collapsed ? (
          <div className={styles.buildTreeStructuredTreeChildren}>
            {visibleChildren.map((child, childIndex) =>
              renderReadOnlyNode(child, depth + 1, childIndex),
            )}
          </div>
        ) : null}
        {node.kind === rootKind && supportChildren.length > 0 && !collapsed ? (
          <div className={styles.buildTreeStructuredSupportGroup}>
            <span>{resolvedCopy.supportGroupLabel}</span>
            <div className={styles.buildTreeStructuredTreeChildren}>
              {supportChildren.map((child, childIndex) =>
                renderReadOnlyNode(child, depth + 1, childIndex),
              )}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <TerasContentTray
        actions={
          <TerasActionButton
            aria-label={buildTreeReadOnlyToggleAllAriaLabel(collapsedNodeIds)}
            onClick={onToggleAll}
            size="table-compact"
            emphasis="secondary"
          >
            {buildTreeReadOnlyToggleAllLabel(collapsedNodeIds)}
          </TerasActionButton>
        }
        kicker={resolvedCopy.toolbarKicker}
        title={buildTreeReadOnlyExpansionStateLabel(collapsedNodeIds)}
      />
      <div className={styles.buildTreeViewerTreeReadOnly}>
        {renderReadOnlyNode(tree)}
      </div>
    </>
  );
}
