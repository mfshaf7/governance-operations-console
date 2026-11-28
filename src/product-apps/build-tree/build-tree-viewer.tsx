"use client";

import { ChevronDown } from "lucide-react";
import { useState, type CSSProperties } from "react";

import { TerasActionButton, TerasContentTray, TerasDocument, TerasReadoutField } from "@/teras";

import type { BuildTreeNodeLike, BuildTreeRowTitle } from "./build-tree-core";
import {
  buildTreeReadOnlyExpansionStateLabel,
  buildTreeReadOnlyToggleAllAriaLabel,
  buildTreeReadOnlyToggleAllLabel,
} from "./build-tree-view-contract";
import type { BuildTreeStructuredNodeLayout } from "./build-tree-view-model";
import styles from "./build-tree-viewer.module.css";
import editorStyles from "./build-tree-editor-tree.module.css";

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
  getTitleParts: (node: TNode) => BuildTreeRowTitle;
  getItemText: (node: TNode) => { label: string; content: string; status: string };
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
  getTitleParts,
  getItemText,
  groupKind,
  leafKind,
  onToggleAll,
  onToggleNode,
  rootKind,
  tree,
}: BuildTreeViewerProps<TNode>) {
  const [openItemId, setOpenItemId] = useState<string | null>(null);
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
    const itemOpen = openItemId === node.id;
    const itemText = getItemText(node);
    const structuredChildCount = getChildCountLabel(node);
    const nodeRole = buildTreeViewerNodeRole(node);

    return (
      <div className={styles.buildTreeStructuredTreeBranch} key={node.id}>
        <div
          className={`${styles.buildTreeStructuredTreeNode} ${styles.buildTreeViewerStructuredNode} ${itemOpen ? styles.buildTreeStructuredTreeNodeSelected : ""}`}
          data-kind={node.kind}
          data-role={nodeRole}
          style={{ "--build-tree-depth": depth } as CSSProperties}
        >
          <button className={styles.buildTreeStructuredTreeSelect} type="button" aria-expanded={itemOpen}
            onClick={() => setOpenItemId(itemOpen ? null : node.id)}>
            <span className={styles.buildTreeStructuredTreeIndex}>
              {getIndex(node, position)}
            </span>
            <span className={styles.buildTreeStructuredTreeText}>
              <span className={styles.buildTreeStructuredTreeKind}>
                {getKindLabel(node.kind)}
              </span>
              <BuildTreeStructuredTitle {...getTitleParts(node)} />
              <small>{getSummary(node)}</small>
            </span>
          </button>
          {node.kind !== leafKind || collapsible ? (
            <div className={styles.buildTreeViewerTreeNodeControls}>
              {node.kind !== leafKind ? (
                <div className={styles.buildTreeStructuredTreeMeta}>
                  <span>{structuredChildCount}</span>
                  <span>{itemText.status}</span>
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
          {itemOpen ? <TerasReadoutField className={`${styles.buildTreeViewerReadout} ${editorStyles.buildTreeEditorTreeReadout}`}
            label={itemText.label} scrollHeight="fill" surface="field"
            value={itemText.content.trim() ? <TerasDocument ariaLabel={itemText.label} content={itemText.content} /> : "No notes recorded."} /> : null}
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
            onClick={() => { setOpenItemId(null); onToggleAll(); }}
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

export function BuildTreeStructuredTitle({ editable, locked, reference }: BuildTreeRowTitle) {
  const prefix = reference ?? locked;
  return <strong>{prefix ? <><span data-work-reference={reference ? true : undefined}>{prefix}</span>{" - "}</> : null}
    {editable || "Untitled"}</strong>;
}
