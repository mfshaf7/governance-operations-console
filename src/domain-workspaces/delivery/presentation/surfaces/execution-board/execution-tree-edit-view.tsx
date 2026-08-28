"use client";

import type { DeliveryComponentType } from "../../../read-model/index.ts";

import {
  BuildTreeEditorTree,
  type BuildTreeEditorTreeAddAction,
} from "@/product-apps/build-tree";
import { TerasActionButton, TerasActionRow, TerasPanelHeader } from "@/teras";
import {
  composeExecutionTreeNodeTitle,
  createExecutionTreeChildNode,
  deleteExecutionTreeNode,
  executionTreeChildCountLabel,
  executionTreeDraftPlaceholder,
  executionTreeEditableTitlePlaceholder,
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

export function ExecutionTreeEditView({
  addMenuNodeId,
  expandedNodeIds,
  onDiscardDraft,
  onDoneEditing,
  onExpandedNodeIdsChange,
  onOpenDetailNodeIdChange,
  onSelectedNodeIdChange,
  onTreeAddMenuNodeIdChange,
  onTreeChange,
  openDetailNodeId,
  selectedNodeId,
  tree,
}: {
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
  selectedNodeId: string;
  tree: ExecutionTreeDraftNode;
}) {
  const expandedNodeIdSet = new Set(expandedNodeIds);

  function toggleNode(nodeId: string) {
    onTreeAddMenuNodeIdChange(null);
    onExpandedNodeIdsChange(
      expandedNodeIdSet.has(nodeId)
        ? expandedNodeIds.filter((expandedNodeId) => expandedNodeId !== nodeId)
        : [...expandedNodeIds, nodeId],
    );
  }

  function selectNode(node: ExecutionTreeDraftNode) {
    onSelectedNodeIdChange(node.id);
    onTreeAddMenuNodeIdChange(null);
  }

  function addChild(
    parent: ExecutionTreeDraftNode,
    kind: DeliveryComponentType,
  ) {
    const child = createExecutionTreeChildNode({ kind, parent });

    onTreeChange(
      updateExecutionTreeNode(tree, parent.id, (node) => ({
        ...node,
        children:
          kind === "Risk" || kind === "Milestone"
            ? [...node.children, child]
            : insertExecutionTreePrimaryNode(node.children, child),
      })),
    );
    onExpandedNodeIdsChange([...new Set([...expandedNodeIds, parent.id])]);
    onOpenDetailNodeIdChange(child.id);
    onSelectedNodeIdChange(child.id);
    onTreeAddMenuNodeIdChange(null);
  }

  function updateNode(
    node: ExecutionTreeDraftNode,
    update: (node: ExecutionTreeDraftNode) => ExecutionTreeDraftNode,
  ) {
    onTreeChange(updateExecutionTreeNode(tree, node.id, update));
  }

  function deleteNode(node: ExecutionTreeDraftNode) {
    if (node.id === tree.id) {
      return;
    }

    const nextTree = deleteExecutionTreeNode(tree, node.id);
    onTreeChange(nextTree);
    onExpandedNodeIdsChange(
      expandedNodeIds.filter((expandedNodeId) => expandedNodeId !== node.id),
    );
    onOpenDetailNodeIdChange(nextTree.id);
    onSelectedNodeIdChange(nextTree.id);
    onTreeAddMenuNodeIdChange(null);
  }

  function getAddActions(
    node: ExecutionTreeDraftNode,
  ): BuildTreeEditorTreeAddAction<ExecutionTreeDraftNode>[] {
    if (node.kind === "Epic" || node.kind === "PI Objective") {
      return [
        {
          label: "Add Feature",
          onSelect: (target) => addChild(target, "Feature"),
        },
        {
          label: "Add Risk",
          onSelect: (target) => addChild(target, "Risk"),
        },
        {
          label: "Add Milestone",
          onSelect: (target) => addChild(target, "Milestone"),
        },
      ];
    }

    if (node.kind === "Feature") {
      return [
        {
          label: "Add Story",
          onSelect: (target) => addChild(target, "User story"),
        },
        {
          label: "Add Task",
          onSelect: (target) => addChild(target, "Task"),
        },
        {
          label: "Add Defect",
          onSelect: (target) => addChild(target, "Defect"),
        },
      ];
    }

    if (node.kind === "User story") {
      return [
        {
          label: "Add Task",
          onSelect: (target) => addChild(target, "Task"),
        },
        {
          label: "Add Defect",
          onSelect: (target) => addChild(target, "Defect"),
        },
      ];
    }

    return [];
  }

  return (
    <>
      <TerasPanelHeader
        actions={
          <TerasActionRow spacing="tight">
            <TerasActionButton onClick={onDiscardDraft} emphasis="secondary">
              Discard Draft
            </TerasActionButton>
            <TerasActionButton onClick={onDoneEditing} emphasis="primary">
              Done Editing
            </TerasActionButton>
          </TerasActionRow>
        }
        actionsLayout="inline"
        kicker="Inline Edit"
        title="Execution Tree Draft"
        description="Edit this selected ART tree, then review and apply accepted changes through the governed Delivery route."
      />
      <BuildTreeEditorTree
        addMenuNodeId={addMenuNodeId}
        canDeleteNode={(node) => node.id.includes("-local-")}
        expandedNodeIds={expandedNodeIds}
        getAddActions={getAddActions}
        getChildCountLabel={executionTreeChildCountLabel}
        getDisplayTitle={executionTreeNodeDisplayTitle}
        getDraftPlaceholder={executionTreeDraftPlaceholder}
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
          onOpenDetailNodeIdChange(node.id);
        }}
        onInlineNodeSelect={(node) => {
          selectNode(node);
          onOpenDetailNodeIdChange(
            openDetailNodeId === node.id ? null : node.id,
          );
        }}
        onOpenScaffold={() => undefined}
        onStructuredGroupSelect={(node) => selectNode(node)}
        onStructuredNodeSelect={(node) => selectNode(node)}
        onToggleAddMenu={(node) =>
          onTreeAddMenuNodeIdChange(addMenuNodeId === node.id ? null : node.id)
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
    </>
  );
}
