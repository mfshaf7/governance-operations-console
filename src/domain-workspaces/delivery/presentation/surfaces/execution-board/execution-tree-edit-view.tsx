"use client";

import { useMemo, useState, type ReactNode } from "react";

import type { DeliveryComponentType } from "../../../read-model/index.ts";
import { executionTreeChildKinds } from "../../../work-model/execution/execution-tree-change-plan.ts";

import {
  BuildTreeEditorTree,
  type BuildTreeEditorTreeAddAction,
} from "@/product-apps/build-tree";
import { TerasActionButton, TerasActionRow, TerasPanelHeader, TerasUtilityButton } from "@/teras";
import {
  composeExecutionTreeNodeTitle,
  createExecutionTreeChildNode,
  deleteExecutionTreeNode,
  executionTreeChildCountLabel,
  executionTreeDraftPlaceholder,
  executionTreeEditableTitlePlaceholder,
  executionTreeInitialExpandedNodeIds,
  executionTreeNodeDisplayTitle,
  executionTreeNodeIndex,
  executionTreeNodeKindLabel,
  executionTreeNodeRole,
  executionTreeNodeSummary,
  executionTreeNodeTitleParts,
  executionTreeStructuredNodeLayout,
  findExecutionTreeNode,
  insertExecutionTreePrimaryNode,
  updateExecutionTreeNode,
  type ExecutionTreeDraftNode,
} from "./execution-board-view-model.ts";

type ExecutionTreeEditing = {
  addMenuNodeId: string | null;
  expandedNodeIds: string[];
  onDiscardDraft: () => void;
  onDoneEditing: () => void;
  onExpandedNodeIdsChange: (next: string[]) => void;
  onOpenDetailNodeIdChange: (next: string | null) => void;
  onSelectedNodeIdChange: (next: string) => void;
  onTreeAddMenuNodeIdChange: (next: string | null) => void;
  onTreeChange: (next: ExecutionTreeDraftNode) => void;
  openDetailNodeId: string | null;
  planningIssues: string[];
  selectedNodeId: string;
};

export function ExecutionWorkTree({
  actions,
  editing,
  renderItemActions,
  tree,
}: {
  actions?: ReactNode;
  editing?: ExecutionTreeEditing;
  renderItemActions?: (node: ExecutionTreeDraftNode) => ReactNode;
  tree: ExecutionTreeDraftNode;
}) {
  const [collapsedReadIds, setCollapsedReadIds] = useState<string[]>([]);
  const [openReadId, setOpenReadId] = useState<string | null>(null);
  const readBranchIds = useMemo(() => executionTreeInitialExpandedNodeIds(tree), [tree]);
  const openDetailNodeId = editing ? editing.openDetailNodeId : openReadId;
  const expandedNodeIds = editing?.expandedNodeIds ?? readBranchIds.filter(id => !collapsedReadIds.includes(id));
  const selectedNodeId = editing?.selectedNodeId ?? openReadId ?? tree.id;
  const addMenuNodeId = editing?.addMenuNodeId ?? null;

  function toggleNode(nodeId: string) {
    if (!editing) {
      setCollapsedReadIds(current => current.includes(nodeId)
        ? current.filter(id => id !== nodeId)
        : [...current, nodeId]);
      return;
    }
    editing.onTreeAddMenuNodeIdChange(null);
    editing.onExpandedNodeIdsChange(expandedNodeIds.includes(nodeId)
      ? expandedNodeIds.filter(id => id !== nodeId)
      : [...expandedNodeIds, nodeId]);
  }

  function selectNode(node: ExecutionTreeDraftNode) {
    editing?.onSelectedNodeIdChange(node.id);
    editing?.onTreeAddMenuNodeIdChange(null);
  }

  function addChild(
    parent: ExecutionTreeDraftNode,
    kind: DeliveryComponentType,
  ) {
    if (!editing) return;
    const child = createExecutionTreeChildNode({ kind, parent });

    editing.onTreeChange(
      updateExecutionTreeNode(tree, parent.id, (node) => ({
        ...node,
        children:
          kind === "Risk" || kind === "Milestone"
            ? [...node.children, child]
            : insertExecutionTreePrimaryNode(node.children, child),
      })),
    );
    editing.onExpandedNodeIdsChange([...new Set([...expandedNodeIds, parent.id])]);
    editing.onOpenDetailNodeIdChange(child.id);
    editing.onSelectedNodeIdChange(child.id);
    editing.onTreeAddMenuNodeIdChange(null);
  }

  function updateNode(
    node: ExecutionTreeDraftNode,
    update: (node: ExecutionTreeDraftNode) => ExecutionTreeDraftNode,
  ) {
    editing?.onTreeChange(updateExecutionTreeNode(tree, node.id, update));
  }

  function deleteNode(node: ExecutionTreeDraftNode) {
    if (!editing || node.id === tree.id) {
      return;
    }

    const nextTree = deleteExecutionTreeNode(tree, node.id);
    editing.onTreeChange(nextTree);
    editing.onExpandedNodeIdsChange(
      expandedNodeIds.filter((expandedNodeId) => expandedNodeId !== node.id),
    );
    editing.onOpenDetailNodeIdChange(nextTree.id);
    editing.onSelectedNodeIdChange(nextTree.id);
    editing.onTreeAddMenuNodeIdChange(null);
  }

  function getAddActions(
    node: ExecutionTreeDraftNode,
  ): BuildTreeEditorTreeAddAction<ExecutionTreeDraftNode>[] {
    return executionTreeChildKinds(node.kind)
      .filter(kind => kind !== "Feature" || !node.targetPi?.trim())
      .map(kind => ({
        label: kind === "User story" ? "Add Story" : `Add ${kind}`,
        onSelect: target => addChild(target, kind),
      }));
  }

  return (
    <div role="region" aria-label="Work hierarchy">
      <TerasPanelHeader
        actions={
          <TerasActionRow spacing="tight">
            {editing ? (
              <>
                <TerasActionButton onClick={editing.onDiscardDraft} emphasis="secondary">Discard Draft</TerasActionButton>
                <TerasActionButton disabled={editing.planningIssues.length > 0} onClick={editing.onDoneEditing} emphasis="primary">
                  Done Editing
                </TerasActionButton>
              </>
            ) : (
              <>
                <TerasUtilityButton
                  disabled={readBranchIds.length === 0}
                  onClick={() => {
                    setCollapsedReadIds(expandedNodeIds.length ? readBranchIds : []);
                    setOpenReadId(null);
                  }}
                  variant="subtle"
                >
                  {expandedNodeIds.length ? "Collapse All" : "Expand All"}
                </TerasUtilityButton>
                {actions}
              </>
            )}
          </TerasActionRow>
        }
        actionsLayout="inline"
        kicker={editing ? "Inline Edit" : "Inspect"}
        title={editing ? "Execution Tree Draft" : "Work Tree"}
        description={editing ? editing.planningIssues[0] ?? "Edit the work items in this package, then review your changes before saving." : undefined}
      />
      <BuildTreeEditorTree
        addMenuNodeId={addMenuNodeId}
        copy={editing ? undefined : { detailDraftLabel: "Description" }}
        inlineInspection={editing ? undefined : { renderActions: renderItemActions }}
        readOnly={!editing}
        structureLocked={!editing}
        canDeleteNode={(node) => node.id.includes("-local-")}
        expandedNodeIds={expandedNodeIds}
        getAddActions={getAddActions}
        getChildCountLabel={executionTreeChildCountLabel}
        getDisplayTitle={executionTreeNodeDisplayTitle}
        getDraftPlaceholder={editing ? executionTreeDraftPlaceholder : () => "No description recorded."}
        getEditableTitlePlaceholder={(node) =>
          executionTreeEditableTitlePlaceholder(node.kind)
        }
        getIndex={executionTreeNodeIndex}
        getKindLabel={(kind) => executionTreeNodeKindLabel(kind)}
        getNodeRole={executionTreeNodeRole}
        getStructuredLayout={executionTreeStructuredNodeLayout}
        getSummary={executionTreeNodeSummary}
        getTitleParts={executionTreeNodeTitleParts}
        mode="inline"
        onDeleteNode={deleteNode}
        onFocusInlineTitle={(node) => {
          selectNode(node);
          editing?.onOpenDetailNodeIdChange(node.id);
        }}
        onInlineNodeSelect={(node) => {
          const next = openDetailNodeId === node.id ? null : node.id;
          if (editing) {
            selectNode(node);
            editing.onOpenDetailNodeIdChange(next);
          } else {
            setOpenReadId(next);
          }
        }}
        onOpenScaffold={() => undefined}
        onStructuredGroupSelect={(node) => selectNode(node)}
        onStructuredNodeSelect={(node) => selectNode(node)}
        onToggleAddMenu={(node) =>
          editing?.onTreeAddMenuNodeIdChange(addMenuNodeId === node.id ? null : node.id)
        }
        onToggleNode={(node) => toggleNode(node.id)}
        onToggleStructuredGroup={(node) => selectNode(node)}
        onUpdateDraftBody={(node, value) =>
          updateNode(node, (current) => ({ ...current, draftBody: value }))
        }
        onUpdateRemark={(node, value) =>
          updateNode(node, (current) => ({ ...current, remark: value }))
        }
        onUpdateTitle={(node, value) =>
          updateNode(node, (current) => ({
            ...current,
            title: composeExecutionTreeNodeTitle(current, value),
          }))
        }
        openDetailNodeId={openDetailNodeId}
        selectedNodeId={
          findExecutionTreeNode(tree, selectedNodeId)?.id ?? tree.id
        }
        showScaffoldAction={false}
        structuredGroupIds={[]}
        tree={tree}
      />
    </div>
  );
}
