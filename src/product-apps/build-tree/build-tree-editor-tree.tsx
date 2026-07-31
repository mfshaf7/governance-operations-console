"use client";

import { ChevronDown, Plus, Trash2 } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { TerasActionButton, TerasNoteField } from "@/teras";

import type { BuildTreeNodeLike } from "./build-tree-core";
import type { BuildTreeViewMode } from "./build-tree-model";
import { buildTreeEditorFieldProps } from "./build-tree-view-contract";
import type { BuildTreeStructuredNodeLayout } from "./build-tree-view-model";
import editorStyles from "./build-tree-editor-tree.module.css";
import structuredStyles from "./build-tree-viewer.module.css";

export type BuildTreeEditorTreeRole = "group" | "leaf" | "root" | "support";

export type BuildTreeEditorTreeAddAction<TNode> = {
  label: string;
  onSelect: (node: TNode) => void;
};

export type BuildTreeEditorTreeCopy = {
  detailDraftLabel?: string;
  detailRemarkLabel?: string;
  detailRemarkPlaceholder?: string;
  groupedLeafCollapsedDescription?: string;
  groupedLeafEmptyDescription?: string;
  groupedLeafExpandedDescription?: string;
  groupedLeafIndexLabel?: string;
  groupedLeafLabel?: string;
  groupedLeafTitle?: (count: number) => string;
  scaffoldLabel?: string;
  supportGroupLabel?: string;
};

export type BuildTreeEditorTreeProps<
  TNode extends BuildTreeNodeLike<TNode>,
> = {
  addMenuNodeId: string | null;
  canDeleteNode?: (node: TNode) => boolean;
  copy?: BuildTreeEditorTreeCopy;
  expandedNodeIds: string[];
  getAddActions: (node: TNode) => BuildTreeEditorTreeAddAction<TNode>[];
  getChildCountLabel: (node: TNode) => ReactNode;
  getDisplayTitle: (node: TNode) => string;
  getDraftPlaceholder: (node: TNode) => string;
  getEditableTitlePlaceholder: (node: TNode) => string;
  getIndex: (node: TNode, position: number) => ReactNode;
  getKindLabel: (kind: TNode["kind"], node: TNode) => ReactNode;
  getNodeRole: (node: TNode) => BuildTreeEditorTreeRole;
  getStructuredLayout: (node: TNode) => BuildTreeStructuredNodeLayout<TNode>;
  getSummary: (node: TNode) => ReactNode;
  getTitleParts: (node: TNode) => { editable: string; locked: string };
  mode: BuildTreeViewMode;
  onDeleteNode: (node: TNode) => void;
  onFocusInlineTitle: (node: TNode) => void;
  onInlineNodeSelect: (node: TNode) => void;
  onOpenScaffold: (node: TNode) => void;
  onStructuredGroupSelect: (node: TNode) => void;
  onStructuredNodeSelect: (
    node: TNode,
    options: { expandable: boolean },
  ) => void;
  onToggleAddMenu: (node: TNode) => void;
  onToggleNode: (node: TNode) => void;
  onToggleStructuredGroup: (node: TNode) => void;
  onUpdateDraftBody: (node: TNode, value: string) => void;
  onUpdateRemark: (node: TNode, value: string) => void;
  onUpdateTitle: (node: TNode, value: string) => void;
  openDetailNodeId: string | null;
  selectedNodeId: string;
  showScaffoldAction?: boolean;
  structuredGroupIds: string[];
  tree: TNode;
};

const defaultEditorTreeCopy = {
  detailDraftLabel: "Draft Notes",
  detailRemarkLabel: "Operator Remark",
  detailRemarkPlaceholder:
    "Add a pickup note, concern, or reminder for this draft item.",
  groupedLeafCollapsedDescription:
    "Summary first. Expand to inspect the full item stack.",
  groupedLeafEmptyDescription:
    "No draft items yet. Add the first item from this group.",
  groupedLeafExpandedDescription:
    "Full item stack visible for inspection.",
  groupedLeafIndexLabel: "IT",
  groupedLeafLabel: "Grouped Items",
  scaffoldLabel: "Use Scaffold",
  supportGroupLabel: "Support Branches",
};

export function BuildTreeEditorTree<
  TNode extends BuildTreeNodeLike<TNode>,
>({
  addMenuNodeId,
  canDeleteNode,
  copy,
  expandedNodeIds,
  getAddActions,
  getChildCountLabel,
  getDisplayTitle,
  getDraftPlaceholder,
  getEditableTitlePlaceholder,
  getIndex,
  getKindLabel,
  getNodeRole,
  getStructuredLayout,
  getSummary,
  getTitleParts,
  mode,
  onDeleteNode,
  onFocusInlineTitle,
  onInlineNodeSelect,
  onOpenScaffold,
  onStructuredGroupSelect,
  onStructuredNodeSelect,
  onToggleAddMenu,
  onToggleNode,
  onToggleStructuredGroup,
  onUpdateDraftBody,
  onUpdateRemark,
  onUpdateTitle,
  openDetailNodeId,
  selectedNodeId,
  showScaffoldAction = true,
  structuredGroupIds,
  tree,
}: BuildTreeEditorTreeProps<TNode>) {
  const resolvedCopy = {
    ...defaultEditorTreeCopy,
    ...copy,
  };
  const resolveCanDeleteNode =
    canDeleteNode ?? ((node: TNode) => getNodeRole(node) !== "root");

  function renderAddActions(node: TNode, displayTitle: string) {
    const addActions = getAddActions(node);

    if (addActions.length === 0) {
      return null;
    }

    if (addActions.length === 1) {
      return (
        <button
          aria-label={`${addActions[0].label} under ${displayTitle}`}
          className={editorStyles.buildTreeEditorIconButton}
          onClick={() => addActions[0].onSelect(node)}
          type="button"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      );
    }

    return (
      <span className={editorStyles.buildTreeEditorAddMenuShell}>
        <button
          aria-expanded={addMenuNodeId === node.id}
          aria-haspopup="menu"
          aria-label={`Add child under ${displayTitle}`}
          className={editorStyles.buildTreeEditorIconButton}
          onClick={() => onToggleAddMenu(node)}
          type="button"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        {addMenuNodeId === node.id ? (
          <span className={editorStyles.buildTreeEditorAddMenu} role="menu">
            {addActions.map((action) => (
              <button
                key={action.label}
                onClick={() => action.onSelect(node)}
                role="menuitem"
                type="button"
              >
                {action.label}
              </button>
            ))}
          </span>
        ) : null}
      </span>
    );
  }

  function renderInlineNode(node: TNode, depth = 0, position = 0) {
    const selected = selectedNodeId === node.id;
    const childCount = node.children?.length ?? 0;
    const expanded = expandedNodeIds.includes(node.id);
    const role = getNodeRole(node);
    const expandable = role === "group" || childCount > 0;
    const detailOpen = mode === "inline" && openDetailNodeId === node.id;
    const titleParts = getTitleParts(node);
    const displayTitle = getDisplayTitle(node);

    return (
      <div className={editorStyles.buildTreeEditorTreeBranch} key={node.id}>
        <div
          className={`${editorStyles.buildTreeEditorTreeNode} ${editorNodeRoleClass(role)} ${
            selected ? editorStyles.buildTreeEditorTreeNodeSelected : ""
          } ${addMenuNodeId === node.id ? editorStyles.buildTreeEditorTreeNodeMenuOpen : ""}`}
          style={{ "--build-tree-depth": depth } as CSSProperties}
        >
          <div
            className={editorStyles.buildTreeEditorTreeSelect}
            onClick={() => onInlineNodeSelect(node)}
          >
            <span className={editorStyles.buildTreeEditorTreeIndex}>
              {getIndex(node, position)}
            </span>
            <span className={editorStyles.buildTreeEditorTreeText}>
              <span className={editorStyles.buildTreeEditorTreeKind}>
                {getKindLabel(node.kind, node)}
              </span>
              {mode === "inline" ? (
                <span className={editorStyles.buildTreeEditorTreeTitleRow}>
                  <span className={editorStyles.buildTreeEditorTreeTitlePrefix}>
                    {titleParts.locked}
                  </span>
                  <span className={editorStyles.buildTreeEditorTreeTitleSeparator}>
                    -
                  </span>
                  <input
                    {...buildTreeEditorFieldProps}
                    aria-label={`${getKindLabel(node.kind, node)} draft title`}
                    className={editorStyles.buildTreeEditorTreeTitleInput}
                    onChange={(event) => onUpdateTitle(node, event.target.value)}
                    onClick={(event) => event.stopPropagation()}
                    onFocus={() => onFocusInlineTitle(node)}
                    placeholder={getEditableTitlePlaceholder(node)}
                    size={Math.max(
                      12,
                      Math.min(42, titleParts.editable.length || 16),
                    )}
                    value={titleParts.editable}
                  />
                </span>
              ) : (
                <strong>{displayTitle}</strong>
              )}
              <small>{getSummary(node)}</small>
            </span>
          </div>
          <div className={editorStyles.buildTreeEditorSimpleControlArea}>
            {expandable ? (
              <button
                aria-label={`${expanded ? "Collapse" : "Expand"} ${displayTitle}`}
                aria-expanded={expanded}
                className={editorStyles.buildTreeEditorSimpleToggle}
                onClick={() => onToggleNode(node)}
                type="button"
              >
                <ChevronDown
                  aria-hidden="true"
                  className={
                    expanded ? editorStyles.buildTreeEditorSimpleToggleOpen : ""
                  }
                />
              </button>
            ) : null}
            <div className={editorStyles.buildTreeEditorSimpleActions}>
              {renderAddActions(node, displayTitle)}
              {resolveCanDeleteNode(node) ? (
                <button
                  aria-label={`Delete ${displayTitle}`}
                  className={editorStyles.buildTreeEditorDeleteButton}
                  onClick={() => onDeleteNode(node)}
                  type="button"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>
          {detailOpen ? (
            <div className={editorStyles.buildTreeEditorTreeDetail}>
              <TerasNoteField
                {...buildTreeEditorFieldProps}
                className={editorStyles.buildTreeEditorTreeNoteField}
                label={resolvedCopy.detailDraftLabel}
                onValueChange={(value) => onUpdateDraftBody(node, value)}
                placeholder={getDraftPlaceholder(node)}
                value={node.draftBody}
              />
              <label
                className={`${editorStyles.buildTreeEditorTreeField} ${editorStyles.buildTreeEditorDetailRemarkField}`}
              >
                <span>{resolvedCopy.detailRemarkLabel}</span>
                <input
                  {...buildTreeEditorFieldProps}
                  aria-label={`${getKindLabel(node.kind, node)} operator remark`}
                  onChange={(event) => onUpdateRemark(node, event.target.value)}
                  placeholder={resolvedCopy.detailRemarkPlaceholder}
                  value={node.remark}
                />
              </label>
              {showScaffoldAction ? (
                <div className={editorStyles.buildTreeEditorTreeDetailActions}>
                  <TerasActionButton
                    onClick={() => onOpenScaffold(node)}

                    emphasis="secondary"
                  >
                    {resolvedCopy.scaffoldLabel}
                  </TerasActionButton>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        {node.children?.length && expanded ? (
          <div className={editorStyles.buildTreeEditorTreeChildren}>
            {node.children.map((child, childIndex) =>
              renderInlineNode(child, depth + 1, childIndex),
            )}
          </div>
        ) : null}
      </div>
    );
  }

  function renderStructuredNode(node: TNode, depth = 0, position = 0) {
    const selected = selectedNodeId === node.id;
    const layout = getStructuredLayout(node);
    const childCount = layout.childCount;
    const expanded = expandedNodeIds.includes(node.id);
    const expandable = childCount > 0;
    const role = getNodeRole(node);
    const supportChildren = layout.supportChildren;
    const groupedLeafChildren = layout.groupedLeafChildren;
    const groupExpanded = structuredGroupIds.includes(node.id);
    const visibleChildren = layout.visibleChildren;
    const displayTitle = getDisplayTitle(node);

    return (
      <div className={structuredStyles.buildTreeStructuredTreeBranch} key={node.id}>
        <div
          className={`${structuredStyles.buildTreeStructuredTreeNode} ${
            selected ? structuredStyles.buildTreeStructuredTreeNodeSelected : ""
          } ${addMenuNodeId === node.id ? structuredStyles.buildTreeStructuredTreeNodeMenuOpen : ""}`}
          data-kind={node.kind}
          data-role={role}
          style={{ "--build-tree-depth": depth } as CSSProperties}
        >
          <button
            className={structuredStyles.buildTreeStructuredTreeSelect}
            onClick={() =>
              onStructuredNodeSelect(node, {
                expandable,
              })
            }
            type="button"
          >
            <span className={structuredStyles.buildTreeStructuredTreeIndex}>
              {getIndex(node, position)}
            </span>
            <span className={structuredStyles.buildTreeStructuredTreeText}>
              <span className={structuredStyles.buildTreeStructuredTreeKind}>
                {getKindLabel(node.kind, node)}
              </span>
              <strong>{displayTitle}</strong>
              <small>{getSummary(node)}</small>
            </span>
          </button>
          {role !== "leaf" ? (
            <div className={structuredStyles.buildTreeStructuredTreeMeta}>
              <span>{getChildCountLabel(node)}</span>
              <span>{node.draftBody.trim() ? "drafted" : "needs draft"}</span>
            </div>
          ) : null}
          <div className={structuredStyles.buildTreeTreeControlArea}>
            {expandable ? (
              <button
                aria-label={`${expanded ? "Collapse" : "Expand"} ${displayTitle}`}
                aria-expanded={expanded}
                className={structuredStyles.buildTreeTreeToggle}
                onClick={() => onToggleNode(node)}
                type="button"
              >
                <ChevronDown
                  aria-hidden="true"
                  className={
                    expanded ? structuredStyles.buildTreeTreeToggleOpen : ""
                  }
                />
              </button>
            ) : null}
            <div className={structuredStyles.buildTreeTreeActions}>
              {renderAddActions(node, displayTitle)}
              {resolveCanDeleteNode(node) ? (
                <button
                  aria-label={`Delete ${displayTitle}`}
                  className={editorStyles.buildTreeEditorDeleteButton}
                  onClick={() => onDeleteNode(node)}
                  type="button"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>
        </div>
        {expanded && role === "group" ? (
          <div className={structuredStyles.buildTreeStructuredTreeChildren}>
            <div
              className={`${structuredStyles.buildTreeStructuredStoryGroup} ${
                groupExpanded
                  ? structuredStyles.buildTreeStructuredStoryGroupOpen
                  : ""
              }`}
            >
              <div className={structuredStyles.buildTreeStructuredStoryGroupCard}>
                <button
                  className={structuredStyles.buildTreeStructuredStoryGroupButton}
                  onClick={() => onStructuredGroupSelect(node)}
                  type="button"
                >
                  <span className={structuredStyles.buildTreeStructuredStoryGroupIndex}>
                    {resolvedCopy.groupedLeafIndexLabel}
                  </span>
                  <span className={structuredStyles.buildTreeStructuredStoryGroupText}>
                    <span>{resolvedCopy.groupedLeafLabel}</span>
                    <strong>
                      {resolvedCopy.groupedLeafTitle
                        ? resolvedCopy.groupedLeafTitle(groupedLeafChildren.length)
                        : `${groupedLeafChildren.length} draft ${
                            groupedLeafChildren.length === 1 ? "item" : "items"
                          }`}
                    </strong>
                    <small>
                      {groupedLeafChildren.length === 0
                        ? resolvedCopy.groupedLeafEmptyDescription
                        : groupExpanded
                          ? resolvedCopy.groupedLeafExpandedDescription
                          : resolvedCopy.groupedLeafCollapsedDescription}
                    </small>
                  </span>
                </button>
                <div
                  className={`${structuredStyles.buildTreeTreeControlArea} ${structuredStyles.buildTreeStructuredStoryControls}`}
                >
                  <button
                    aria-label={`${groupExpanded ? "Collapse" : "Expand"} ${resolvedCopy.groupedLeafLabel} under ${displayTitle}`}
                    aria-expanded={groupExpanded}
                    className={structuredStyles.buildTreeTreeToggle}
                    onClick={() => onToggleStructuredGroup(node)}
                    type="button"
                  >
                    <ChevronDown
                      aria-hidden="true"
                      className={
                        groupExpanded
                          ? structuredStyles.buildTreeTreeToggleOpen
                          : ""
                      }
                    />
                  </button>
                  <div className={structuredStyles.buildTreeTreeActions}>
                    {renderAddActions(node, displayTitle)}
                  </div>
                </div>
              </div>
              {groupExpanded ? (
                <div className={structuredStyles.buildTreeStructuredStoryList}>
                  {groupedLeafChildren.map((child, childIndex) =>
                    renderStructuredNode(child, depth + 2, childIndex),
                  )}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
        {visibleChildren.length > 0 && expanded ? (
          <div className={structuredStyles.buildTreeStructuredTreeChildren}>
            {visibleChildren.map((child, childIndex) =>
              renderStructuredNode(child, depth + 1, childIndex),
            )}
          </div>
        ) : null}
        {expanded && role === "root" && supportChildren.length > 0 ? (
          <div className={structuredStyles.buildTreeStructuredSupportGroup}>
            <span>{resolvedCopy.supportGroupLabel}</span>
            <div className={structuredStyles.buildTreeStructuredTreeChildren}>
              {supportChildren.map((child, childIndex) =>
                renderStructuredNode(child, depth + 1, childIndex),
              )}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={editorStyles.buildTreeEditorTree} data-view={mode}>
      {mode === "structured" ? renderStructuredNode(tree) : renderInlineNode(tree)}
    </div>
  );
}

function editorNodeRoleClass(role: BuildTreeEditorTreeRole) {
  switch (role) {
    case "root":
      return editorStyles.buildTreeEditorTreeNodeRoot;
    case "group":
      return editorStyles.buildTreeEditorTreeNodeGroup;
    case "support":
      return editorStyles.buildTreeEditorTreeNodeSupport;
    case "leaf":
      return editorStyles.buildTreeEditorTreeNodeLeaf;
  }
}
