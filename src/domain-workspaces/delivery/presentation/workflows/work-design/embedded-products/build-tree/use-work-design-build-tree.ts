"use client";

import { useMemo, useState } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";

import type { DeliveryPackageSummary } from "../../../../../read-model/index.ts";
import {
  addBuildTreeStateIds,
  buildTreeDeleteRequest,
  buildTreeScaffoldSectionsByOwner,
  isBuildTreeFullyExpanded,
  removeBuildTreeStateIds,
  toggleBuildTreeStateId,
  updateBuildTreeScaffoldSection,
} from "@/product-apps/build-tree";

import type { WorkDesignFinalizedBrief } from "../../artifacts/context-brief/index.ts";
import {
  deleteWorkDesignNode,
  findWorkDesignNode,
  insertWorkDesignPrimaryNode,
  updateWorkDesignNode,
  workDesignInitialExpandedNodeIds,
  workDesignMetrics,
  workDesignNodeDisplayTitle,
  workDesignRootExpandedNodeIds,
  workDesignStructuredStoryGroupNodeIds,
} from "../../../../../product-adapters/build-tree/index.ts";
import type {
  WorkDesignBuildTreeViewMode,
  WorkDesignNode,
} from "../../model/work-design-model.ts";
import {
  workDesignBuildAdvisorAdapter,
  workDesignBuildAdvisorOpening,
} from "../../../../../product-adapters/build-tree/index.ts";
import type { WorkDesignAdvisorTranscriptLine } from "../../../../../product-adapters/build-tree/index.ts";
import {
  composeWorkDesignScaffoldSections,
  workDesignScaffoldIsTraceSection,
  workDesignScaffoldSectionsForNode,
  workDesignScaffoldSectionsWithDraft,
} from "../../../../../product-adapters/build-tree/index.ts";
import type { WorkDesignScaffoldSection } from "../../../../../product-adapters/build-tree/index.ts";

type UseWorkDesignBuildTreeOptions = {
  applyCompleted: boolean;
  contextFinalizedBrief: WorkDesignFinalizedBrief;
  deliveryPackage: DeliveryPackageSummary;
  initialTree: WorkDesignNode;
  onTreeDirty: () => void;
};

export function useWorkDesignBuildTree({
  applyCompleted,
  contextFinalizedBrief,
  deliveryPackage,
  initialTree,
  onTreeDirty,
}: UseWorkDesignBuildTreeOptions) {
  const [deleteBlockedNode, setDeleteBlockedNode] =
    useState<WorkDesignNode | null>(null);
  const [deleteRequestNode, setDeleteRequestNode] =
    useState<WorkDesignNode | null>(null);
  const [scaffoldNodeId, setScaffoldNodeId] = useState<string | null>(null);
  const [scaffoldSections, setScaffoldSections] = useState<
    WorkDesignScaffoldSection[]
  >([]);
  const [openDetailNodeId, setOpenDetailNodeId] = useState<string | null>(
    initialTree.id,
  );
  const [selectedNodeId, setSelectedNodeId] = useState(initialTree.id);
  const [selectedDraftEditorOpen, setSelectedDraftEditorOpen] = useState(false);
  const [tree, setTree] = useState<WorkDesignNode>(initialTree);
  const [treeAddMenuNodeId, setTreeAddMenuNodeId] = useState<string | null>(
    null,
  );
  const [buildAdvisorPrompt, setBuildAdvisorPrompt] = useState("");
  const [buildAdvisorTurns, setBuildAdvisorTurns] = useState<
    WorkDesignAdvisorTranscriptLine[]
  >([]);
  const [buildTreeViewMode, setBuildTreeViewMode] =
    useState<WorkDesignBuildTreeViewMode>("inline");
  const [expandedNodeIds, setExpandedNodeIds] = useState<string[]>(() =>
    workDesignInitialExpandedNodeIds(initialTree),
  );
  const [structuredStoryGroupIds, setStructuredStoryGroupIds] = useState<
    string[]
  >([]);

  const metrics = useMemo(() => workDesignMetrics(tree), [tree]);
  const selectedNode = useMemo(
    () => findWorkDesignNode(tree, selectedNodeId) ?? tree,
    [selectedNodeId, tree],
  );
  const scaffoldNode = scaffoldNodeId
    ? findWorkDesignNode(tree, scaffoldNodeId)
    : null;
  const scaffoldSectionGroups =
    buildTreeScaffoldSectionsByOwner(scaffoldSections);
  const operatorScaffoldSections = scaffoldSectionGroups.operatorSections;
  const traceScaffoldSections = scaffoldSectionGroups.systemSections.filter(
    workDesignScaffoldIsTraceSection,
  );
  const buildAdvisorTranscript = useMemo(
    () => [
      {
        id: "advisor-work-design-selected",
        role: "advisor" as const,
        text: workDesignBuildAdvisorOpening({
          finalized_brief_ref: contextFinalizedBrief.metadataPacketRef,
          operator_prompt: buildAdvisorPrompt,
          package_ref: deliveryPackage.delivery_package_id,
          request_id: "advisor-build-opening",
          selected_node: selectedNode,
          source_ref: deliveryPackage.source_ref,
          tree_snapshot: tree,
        }),
      },
      {
        id: "advisor-build-guide",
        role: "advisor" as const,
        text: `Guide: ask me about ${workDesignNodeDisplayTitle(selectedNode)} tree shape, scaffold wording, missing stories, or risk branches.`,
      },
      ...buildAdvisorTurns,
    ],
    [
      buildAdvisorPrompt,
      buildAdvisorTurns,
      contextFinalizedBrief.metadataPacketRef,
      deliveryPackage.delivery_package_id,
      deliveryPackage.source_ref,
      selectedNode,
      tree,
    ],
  );

  function markTreeDirty(nextTree: WorkDesignNode) {
    if (applyCompleted) {
      return;
    }

    setTree(nextTree);
    onTreeDirty();
  }

  function selectWorkDesignNode(
    nodeId: string,
    options: { editorOpen?: boolean } = {},
  ) {
    setSelectedNodeId(nodeId);
    setSelectedDraftEditorOpen(Boolean(options.editorOpen));
  }

  function addFeature(parentId = tree.id) {
    const parent = findWorkDesignNode(tree, parentId);
    if (!parent || parent.kind !== "Epic") {
      return;
    }

    const featureNumber = metrics.features + 1;
    const feature: WorkDesignNode = {
      children: [],
      description: "New Feature branch. Add draft User stories before review.",
      draftBody: "",
      id: `feature-local-${Date.now()}`,
      kind: "Feature",
      remark: "",
      title: `Feature ${featureNumber} - New Work Design Branch`,
      tone: "info",
    };

    markTreeDirty(
      updateWorkDesignNode(tree, parentId, (node) => ({
        ...node,
        children: insertWorkDesignPrimaryNode(node.children ?? [], feature),
      })),
    );
    setExpandedNodeIds((current) =>
      addBuildTreeStateIds(current, [tree.id, parentId, feature.id]),
    );
    setOpenDetailNodeId(feature.id);
    selectWorkDesignNode(feature.id, { editorOpen: true });
    setTreeAddMenuNodeId(null);
  }

  function addRiskBranch(parentId = tree.id) {
    const parent = findWorkDesignNode(tree, parentId);
    if (!parent || parent.kind !== "Epic") {
      return;
    }

    const riskNumber = metrics.risks + 1;
    const risk: WorkDesignNode = {
      description:
        "Optional Risk support branch. Keep only when the package needs explicit risk tracking.",
      draftBody: "",
      id: `risk-local-${Date.now()}`,
      kind: "Risk",
      remark: "",
      title: `Risk ${riskNumber} - Work Design Risk`,
      tone: "warn",
    };

    markTreeDirty(
      updateWorkDesignNode(tree, parentId, (node) => ({
        ...node,
        children: [...(node.children ?? []), risk],
      })),
    );
    setExpandedNodeIds((current) =>
      addBuildTreeStateIds(current, [tree.id, parentId]),
    );
    setOpenDetailNodeId(risk.id);
    selectWorkDesignNode(risk.id, { editorOpen: true });
    setTreeAddMenuNodeId(null);
  }

  function addStory(parentId: string) {
    const parent = findWorkDesignNode(tree, parentId);
    if (!parent || parent.kind !== "Feature") {
      return;
    }

    const storyNumber =
      (parent.children ?? []).filter((node) => node.kind === "User story")
        .length + 1;
    const story: WorkDesignNode = {
      description:
        "Draft User story. Fill the operator remark or scaffold before review.",
      draftBody: "",
      id: `story-local-${Date.now()}`,
      kind: "User story",
      remark: "",
      title: `User Story ${storyNumber} - Draft Outcome`,
      tone: "info",
    };

    markTreeDirty(
      updateWorkDesignNode(tree, parentId, (node) => ({
        ...node,
        children: [...(node.children ?? []), story],
      })),
    );
    setExpandedNodeIds((current) =>
      addBuildTreeStateIds(current, [tree.id, parentId]),
    );
    setStructuredStoryGroupIds((current) =>
      addBuildTreeStateIds(current, [parentId]),
    );
    setOpenDetailNodeId(story.id);
    selectWorkDesignNode(story.id, { editorOpen: true });
  }

  function requestDelete(node: WorkDesignNode) {
    const deleteRequest = buildTreeDeleteRequest(node, {
      canDelete: (candidate) =>
        candidate.kind !== "Feature" || (candidate.children ?? []).length === 0,
    });

    setDeleteBlockedNode(deleteRequest.blockedNode);
    setDeleteRequestNode(deleteRequest.requestNode);
  }

  function confirmDelete() {
    if (!deleteRequestNode) {
      return;
    }

    const nextTree = deleteWorkDesignNode(tree, deleteRequestNode.id);
    markTreeDirty(nextTree);
    setExpandedNodeIds((current) =>
      removeBuildTreeStateIds(current, [deleteRequestNode.id]),
    );
    setStructuredStoryGroupIds((current) =>
      removeBuildTreeStateIds(current, [deleteRequestNode.id]),
    );
    setOpenDetailNodeId(nextTree.id);
    selectWorkDesignNode(nextTree.id);
    setDeleteRequestNode(null);
  }

  function updateNodeDraftBody(nodeId: string, value: string) {
    markTreeDirty(
      updateWorkDesignNode(tree, nodeId, (node) => ({
        ...node,
        draftBody: value,
      })),
    );
  }

  function updateNodeRemark(nodeId: string, value: string) {
    markTreeDirty(
      updateWorkDesignNode(tree, nodeId, (node) => ({
        ...node,
        remark: value,
      })),
    );
  }

  function updateNodeTitle(nodeId: string, value: string) {
    markTreeDirty(
      updateWorkDesignNode(tree, nodeId, (node) => ({
        ...node,
        title: value,
      })),
    );
  }

  function submitBuildAdvisorPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = buildAdvisorPrompt.trim();

    if (!prompt) {
      return;
    }

    const node = selectedNode;
    const turnId = Date.now();
    const response = workDesignBuildAdvisorAdapter({
      finalized_brief_ref: contextFinalizedBrief.metadataPacketRef,
      operator_prompt: prompt,
      package_ref: deliveryPackage.delivery_package_id,
      request_id: `build-tree-${turnId}`,
      selected_node: node,
      source_ref: deliveryPackage.source_ref,
      tree_snapshot: tree,
    });

    setBuildAdvisorTurns((current) => [
      ...current,
      {
        id: `operator-build-${turnId}`,
        role: "operator",
        text: prompt,
      },
      {
        id: response.response_id,
        role: "advisor",
        text: response.text,
      },
    ]);
    setBuildAdvisorPrompt("");
  }

  function openScaffold(node = selectedNode) {
    setOpenDetailNodeId(node.id);
    selectWorkDesignNode(node.id, { editorOpen: true });
    setTreeAddMenuNodeId(null);
    setScaffoldNodeId(node.id);
    setScaffoldSections(
      workDesignScaffoldSectionsWithDraft(
        workDesignScaffoldSectionsForNode(
          node,
          deliveryPackage,
          contextFinalizedBrief,
        ),
        node.draftBody,
      ),
    );
  }

  function applyScaffold() {
    if (!scaffoldNodeId) {
      return;
    }

    updateNodeDraftBody(
      scaffoldNodeId,
      composeWorkDesignScaffoldSections(scaffoldSections),
    );
    setScaffoldNodeId(null);
    setScaffoldSections([]);
  }

  function closeScaffold() {
    setScaffoldNodeId(null);
    setScaffoldSections([]);
  }

  function updateScaffoldSection(sectionId: string, value: string) {
    setScaffoldSections((current) =>
      updateBuildTreeScaffoldSection(current, sectionId, value),
    );
  }

  function toggleNodeExpansion(nodeId: string) {
    setTreeAddMenuNodeId(null);
    setExpandedNodeIds((current) => toggleBuildTreeStateId(current, nodeId));
    if (expandedNodeIds.includes(nodeId)) {
      setStructuredStoryGroupIds((current) =>
        removeBuildTreeStateIds(current, [nodeId]),
      );
    }
  }

  function toggleStructuredStoryGroup(nodeId: string) {
    setTreeAddMenuNodeId(null);
    setStructuredStoryGroupIds((current) =>
      toggleBuildTreeStateId(current, nodeId),
    );
  }

  function expandAllTreeNodes() {
    setTreeAddMenuNodeId(null);
    setExpandedNodeIds(workDesignInitialExpandedNodeIds(tree));
    setStructuredStoryGroupIds(
      buildTreeViewMode === "structured"
        ? workDesignStructuredStoryGroupNodeIds(tree)
        : [],
    );
  }

  function collapseAllTreeNodes() {
    setTreeAddMenuNodeId(null);
    setExpandedNodeIds(workDesignRootExpandedNodeIds(tree));
    setStructuredStoryGroupIds([]);
  }

  function isTreeFullyExpanded() {
    return isBuildTreeFullyExpanded({
      expandedNodeIds,
      requiredExpandedNodeIds: workDesignInitialExpandedNodeIds(tree),
      requiredStructuredGroupIds:
        buildTreeViewMode === "structured"
          ? workDesignStructuredStoryGroupNodeIds(tree)
          : undefined,
      structuredGroupIds: structuredStoryGroupIds,
    });
  }

  function toggleAllTreeNodes() {
    if (isTreeFullyExpanded()) {
      collapseAllTreeNodes();
      return;
    }

    expandAllTreeNodes();
  }

  function selectBuildTreeViewMode(mode: WorkDesignBuildTreeViewMode) {
    setBuildTreeViewMode(mode);
    setTreeAddMenuNodeId(null);
    if (mode === "structured") {
      setOpenDetailNodeId(selectedNodeId);
    }
  }

  return {
    addFeature,
    addRiskBranch,
    addStory,
    applyScaffold,
    buildAdvisorPrompt,
    buildAdvisorTranscript,
    buildTreeViewMode,
    closeScaffold,
    confirmDelete,
    deleteBlockedNode,
    deleteRequestNode,
    expandedNodeIds,
    metrics,
    openDetailNodeId,
    openScaffold,
    operatorScaffoldSections,
    requestDelete,
    scaffoldNode,
    selectBuildTreeViewMode,
    selectWorkDesignNode,
    selectedDraftEditorOpen,
    selectedNode,
    selectedNodeId,
    setBuildAdvisorPrompt,
    setBuildTreeViewMode,
    setDeleteBlockedNode,
    setDeleteRequestNode,
    setExpandedNodeIds,
    setOpenDetailNodeId,
    setSelectedDraftEditorOpen,
    setSelectedNodeId,
    setStructuredStoryGroupIds,
    setTree,
    setTreeAddMenuNodeId,
    structuredStoryGroupIds,
    submitBuildAdvisorPrompt,
    toggleAllTreeNodes,
    toggleNodeExpansion,
    toggleStructuredStoryGroup,
    traceScaffoldSections,
    tree,
    treeAddMenuNodeId,
    treeFullyExpanded: isTreeFullyExpanded(),
    updateNodeDraftBody,
    updateNodeRemark,
    updateNodeTitle,
    updateScaffoldSection,
  } satisfies {
    addFeature: (parentId?: string) => void;
    addRiskBranch: (parentId?: string) => void;
    addStory: (parentId: string) => void;
    applyScaffold: () => void;
    buildAdvisorPrompt: string;
    buildAdvisorTranscript: WorkDesignAdvisorTranscriptLine[];
    buildTreeViewMode: WorkDesignBuildTreeViewMode;
    closeScaffold: () => void;
    confirmDelete: () => void;
    deleteBlockedNode: WorkDesignNode | null;
    deleteRequestNode: WorkDesignNode | null;
    expandedNodeIds: string[];
    metrics: ReturnType<typeof workDesignMetrics>;
    openDetailNodeId: string | null;
    openScaffold: (node?: WorkDesignNode) => void;
    operatorScaffoldSections: WorkDesignScaffoldSection[];
    requestDelete: (node: WorkDesignNode) => void;
    scaffoldNode: WorkDesignNode | null;
    selectBuildTreeViewMode: (mode: WorkDesignBuildTreeViewMode) => void;
    selectWorkDesignNode: (
      nodeId: string,
      options?: { editorOpen?: boolean },
    ) => void;
    selectedDraftEditorOpen: boolean;
    selectedNode: WorkDesignNode;
    selectedNodeId: string;
    setBuildAdvisorPrompt: Dispatch<SetStateAction<string>>;
    setBuildTreeViewMode: Dispatch<SetStateAction<WorkDesignBuildTreeViewMode>>;
    setDeleteBlockedNode: Dispatch<SetStateAction<WorkDesignNode | null>>;
    setDeleteRequestNode: Dispatch<SetStateAction<WorkDesignNode | null>>;
    setExpandedNodeIds: Dispatch<SetStateAction<string[]>>;
    setOpenDetailNodeId: Dispatch<SetStateAction<string | null>>;
    setSelectedDraftEditorOpen: Dispatch<SetStateAction<boolean>>;
    setSelectedNodeId: Dispatch<SetStateAction<string>>;
    setStructuredStoryGroupIds: Dispatch<SetStateAction<string[]>>;
    setTree: Dispatch<SetStateAction<WorkDesignNode>>;
    setTreeAddMenuNodeId: Dispatch<SetStateAction<string | null>>;
    structuredStoryGroupIds: string[];
    submitBuildAdvisorPrompt: (event: FormEvent<HTMLFormElement>) => void;
    toggleAllTreeNodes: () => void;
    toggleNodeExpansion: (nodeId: string) => void;
    toggleStructuredStoryGroup: (nodeId: string) => void;
    traceScaffoldSections: WorkDesignScaffoldSection[];
    tree: WorkDesignNode;
    treeAddMenuNodeId: string | null;
    treeFullyExpanded: boolean;
    updateNodeDraftBody: (nodeId: string, value: string) => void;
    updateNodeRemark: (nodeId: string, value: string) => void;
    updateNodeTitle: (nodeId: string, value: string) => void;
    updateScaffoldSection: (sectionId: string, value: string) => void;
  };
}
