import {
  buildTreeExpandedNodeIds,
  buildTreeNodeDisplayTitle,
  buildTreeNodeSummary,
  buildTreeNodeTitleParts,
  buildTreeRootExpandedNodeIds,
  buildTreeStructuredNodeLayout,
  composeBuildTreeNodeTitle,
  deleteBuildTreeNode,
  findBuildTreeNode,
  flattenBuildTree,
  insertBuildTreeNodeBeforeSupport,
  updateBuildTreeNode,
  type BuildTreeTitleProfile,
} from "@/product-apps/build-tree";
import type { ControlBoardTreeNode } from "@/product-apps/control-board";
import type { TerasMetadataItem } from "@/teras";

import type {
  DeliveryActiveBlockerProjection,
  DeliveryArtNode,
  DeliveryAvailableAction,
  DeliveryComponentType,
  DeliveryPackageSummary,
  DeliveryTone,
  getChildCounts,
  getPackageDetailsById,
} from "../../../read-model/index.ts";

type ClassValue = string | false | null | undefined;

export function cx(...classes: ClassValue[]) {
  return classes.filter(Boolean).join(" ");
}

export function executionBoardPrimaryAction(
  selectedActions: DeliveryAvailableAction[],
) {
  return (
    selectedActions.find(
      (action) => action.enabled && action.expected_backend_route,
    ) ??
    selectedActions.find((action) => action.enabled) ??
    null
  );
}

export function executionBoardSecondaryActions(
  selectedActions: DeliveryAvailableAction[],
  primaryAction: DeliveryAvailableAction | null,
) {
  return selectedActions.filter((action) => action !== primaryAction);
}

export function executionSelectedPackageMetadata({
  childCounts,
  details,
  packageSummary,
}: {
  childCounts: ReturnType<typeof getChildCounts> | null;
  details: ReturnType<typeof getPackageDetailsById>;
  packageSummary: DeliveryPackageSummary;
}): TerasMetadataItem[] {
  return [
    {
      label: "Target PI",
      value: packageSummary.target_pi ?? "Not committed",
    },
    {
      label: "Owner Repo",
      value: details?.owner_repo ?? "Projected owner unavailable",
    },
    {
      label: "Open Children",
      value: String(
        childCounts?.open_child_count ?? packageSummary.open_child_count,
      ),
    },
    {
      label: "Advisor",
      value:
        details?.advisor_summary ??
        "No advisor packet projected for this package.",
    },
  ];
}

export function executionPackageDetailsMetadata({
  childCounts,
  details,
  packageSummary,
}: {
  childCounts: ReturnType<typeof getChildCounts> | null;
  details: ReturnType<typeof getPackageDetailsById>;
  packageSummary: DeliveryPackageSummary;
}): TerasMetadataItem[] {
  const items: TerasMetadataItem[] = [
    { label: "Source", value: packageSummary.source_ref },
    {
      label: "Target PI",
      value: packageSummary.target_pi ?? "Not committed",
    },
    {
      label: "Owner Repo",
      value: details?.owner_repo ?? "Unavailable",
    },
    {
      label: "Open Children",
      value: String(
        childCounts?.open_child_count ?? packageSummary.open_child_count,
      ),
    },
    {
      label: "Architecture Anchor",
      value: details?.lineage_refs.architecture_anchor_ref ?? "Not projected",
    },
    {
      label: "Required Upstream",
      value: details?.lineage_refs.required_upstream_ref ?? "Not projected",
    },
  ];

  if (packageSummary.active_blocker) {
    items.push(
      {
        label: "Blocker",
        value: packageSummary.active_blocker.statement,
      },
      {
        label: "Blocker Owner",
        value: packageSummary.active_blocker.owner,
      },
    );
  }

  return items;
}

export function executionActiveBlockerMetadata(
  blocker: DeliveryActiveBlockerProjection,
): TerasMetadataItem[] {
  return [
    { label: "Owner", value: blocker.owner },
    {
      label: "Decision Path",
      value: blocker.decision_path.replace("-", " "),
    },
    { label: "Discovered", value: blocker.discovered_on },
    {
      label: "Review",
      value: blocker.review_date ?? "Remove path",
    },
  ];
}

export type ExecutionTreeDraftNode = {
  backendStatus: DeliveryArtNode["backend_status"];
  children: ExecutionTreeDraftNode[];
  description: string;
  draftBody: string;
  id: string;
  kind: DeliveryComponentType;
  legacyWorkPackageId: number | null;
  metadataStatus: DeliveryArtNode["metadata_status"];
  remark: string;
  title: string;
  tone: DeliveryTone;
};

const executionTreeTitleProfile: BuildTreeTitleProfile<DeliveryComponentType> =
  {
    kindFallbacks: {
      Defect: "Defect",
      Epic: "Epic",
      Feature: "Feature",
      Milestone: "Milestone",
      "PI Objective": "PI Objective",
      Risk: "Risk",
      Task: "Task",
      "User story": "User Story",
    },
    normalizePrefix: normalizeExecutionTreeTitlePrefix,
    prefixPattern:
      /^((?:Epic #?\d+)|(?:Feature #?\d+)|(?:User Story #?\d+)|(?:Task #?\d+)|(?:Defect #?\d+)|(?:Risk #?\d+)|(?:Milestone #?\d+)|(?:PI Objective #?\d+))\s*-\s*(.*)$/i,
  };

export function executionTreeDraftFromArtNode(
  node: DeliveryArtNode,
): ExecutionTreeDraftNode {
  return {
    backendStatus: node.backend_status,
    children: node.children.map(executionTreeDraftFromArtNode),
    description: node.description,
    draftBody: node.description,
    id: node.id,
    kind: node.component_type,
    legacyWorkPackageId: node.legacy_work_package_id,
    metadataStatus: node.metadata_status,
    remark:
      node.legacy_work_package_id === null
        ? ""
        : `WP #${node.legacy_work_package_id}`,
    title: node.title,
    tone: node.tone,
  };
}

export function executionTreeDraftToControlBoardTreeNode(
  node: ExecutionTreeDraftNode,
): ControlBoardTreeNode {
  return {
    children: node.children.map(executionTreeDraftToControlBoardTreeNode),
    componentType: node.kind,
    description: node.draftBody || node.description,
    id: node.id,
    title: node.title,
    totalChildCount: Math.max(0, flattenBuildTree(node).length - 1),
  };
}

export function executionTreeInitialExpandedNodeIds(
  tree: ExecutionTreeDraftNode,
): string[] {
  return buildTreeExpandedNodeIds(tree);
}

export function executionTreeRootExpandedNodeIds(
  tree: ExecutionTreeDraftNode,
): string[] {
  return buildTreeRootExpandedNodeIds(tree);
}

export function findExecutionTreeNode(
  tree: ExecutionTreeDraftNode,
  nodeId: string,
): ExecutionTreeDraftNode | null {
  return findBuildTreeNode(tree, nodeId);
}

export function updateExecutionTreeNode(
  tree: ExecutionTreeDraftNode,
  nodeId: string,
  update: (node: ExecutionTreeDraftNode) => ExecutionTreeDraftNode,
): ExecutionTreeDraftNode {
  return updateBuildTreeNode(tree, nodeId, update);
}

export function deleteExecutionTreeNode(
  tree: ExecutionTreeDraftNode,
  nodeId: string,
): ExecutionTreeDraftNode {
  return deleteBuildTreeNode(tree, nodeId);
}

export function insertExecutionTreePrimaryNode(
  children: ExecutionTreeDraftNode[],
  node: ExecutionTreeDraftNode,
): ExecutionTreeDraftNode[] {
  return insertBuildTreeNodeBeforeSupport(
    children,
    node,
    (candidate) => candidate.kind === "Risk" || candidate.kind === "Milestone",
  );
}

export function executionTreeStructuredNodeLayout(
  node: ExecutionTreeDraftNode,
) {
  return buildTreeStructuredNodeLayout(node, {
    groupKind: "Feature",
    isSupportNode: (candidate) =>
      candidate.kind === "Risk" || candidate.kind === "Milestone",
    leafKind: "User story",
    rootKind: "Epic",
  });
}

export function executionTreeChildCountLabel(node: ExecutionTreeDraftNode) {
  const childCount = node.children.length;

  if (node.kind === "Epic" || node.kind === "PI Objective") {
    return `${childCount} child ${childCount === 1 ? "item" : "items"}`;
  }

  if (node.kind === "Feature") {
    const storyCount = node.children.filter(
      (child) => child.kind === "User story",
    ).length;

    return `${storyCount} User ${storyCount === 1 ? "story" : "stories"}`;
  }

  return childCount > 0
    ? `${childCount} child ${childCount === 1 ? "item" : "items"}`
    : "";
}

export function executionTreeNodeDisplayTitle(node: ExecutionTreeDraftNode) {
  return buildTreeNodeDisplayTitle(node, executionTreeTitleProfile);
}

export function executionTreeNodeTitleParts(node: ExecutionTreeDraftNode) {
  return buildTreeNodeTitleParts(node, executionTreeTitleProfile);
}

export function composeExecutionTreeNodeTitle(
  node: ExecutionTreeDraftNode,
  editable: string,
) {
  return composeBuildTreeNodeTitle(node, editable, executionTreeTitleProfile);
}

export function executionTreeEditableTitlePlaceholder(
  kind: DeliveryComponentType,
) {
  switch (kind) {
    case "Epic":
      return "Epic outcome";
    case "Feature":
      return "Feature outcome";
    case "User story":
      return "Story outcome";
    case "Task":
      return "Task name";
    case "Defect":
      return "Defect title";
    case "Risk":
      return "Risk title";
    case "Milestone":
      return "Milestone name";
    case "PI Objective":
      return "PI objective";
  }
}

export function executionTreeDraftPlaceholder(node: ExecutionTreeDraftNode) {
  switch (node.kind) {
    case "Epic":
    case "PI Objective":
      return "Capture the changed execution scope and why the tree needs adjustment.";
    case "Feature":
      return "Capture the feature adjustment, expected outcome, and evidence boundary.";
    case "User story":
      return "Capture the user-visible outcome and acceptance evidence.";
    case "Task":
      return "Capture the task action, owner cue, and proof expected.";
    case "Defect":
      return "Capture the defect, impact, and expected repair evidence.";
    case "Risk":
      return "Capture the risk event, impact, and handling plan.";
    case "Milestone":
      return "Capture the checkpoint and exit condition.";
  }
}

export function executionTreeNodeKindLabel(kind: DeliveryComponentType) {
  return kind === "User story" ? "User Story" : kind;
}

export function executionTreeNodeIndex(
  node: ExecutionTreeDraftNode,
  position: number,
) {
  switch (node.kind) {
    case "Epic":
      return "E";
    case "PI Objective":
      return "PI";
    case "Risk":
      return "R";
    case "Milestone":
      return "M";
    case "Defect":
      return "D";
    case "Task":
      return "T";
    case "Feature":
    case "User story":
      return String(position + 1).padStart(2, "0");
  }
}

export function executionTreeNodeSummary(node: ExecutionTreeDraftNode) {
  const childCount = node.children.length;

  return buildTreeNodeSummary(node, {
    childItemLabel: (count) =>
      `${count} child ${count === 1 ? "item" : "items"} / ${node.backendStatus}`,
    groupKind: "Feature",
    groupSummary: () =>
      `${childCount} child ${childCount === 1 ? "item" : "items"} / ${node.backendStatus}`,
    rootKind: "Epic",
    rootSummary: (root) =>
      `${root.children.length} direct ${root.children.length === 1 ? "child" : "children"} / ${root.backendStatus}`,
  });
}

export function executionTreeNodeRole(node: ExecutionTreeDraftNode) {
  if (node.kind === "Epic" || node.kind === "PI Objective") {
    return "root" as const;
  }

  if (node.kind === "Feature") {
    return "group" as const;
  }

  if (node.kind === "Risk" || node.kind === "Milestone") {
    return "support" as const;
  }

  return "leaf" as const;
}

export function executionTreeNodeAccentRgb(kind: DeliveryComponentType) {
  switch (kind) {
    case "Epic":
    case "PI Objective":
      return "190, 144, 255";
    case "Feature":
      return "139, 181, 255";
    case "User story":
    case "Task":
      return "118, 215, 196";
    case "Risk":
    case "Milestone":
      return "255, 193, 90";
    case "Defect":
      return "255, 106, 61";
  }
}

export function createExecutionTreeChildNode({
  kind,
  parent,
}: {
  kind: DeliveryComponentType;
  parent: ExecutionTreeDraftNode;
}): ExecutionTreeDraftNode {
  const siblingsOfKind = parent.children.filter((child) => child.kind === kind);
  const nextIndex = siblingsOfKind.length + 1;
  const kindLabel = executionTreeNodeKindLabel(kind);

  return {
    backendStatus: "new",
    children: [],
    description:
      "Local execution tree draft. Future live wiring will create this through OOS work-item routes.",
    draftBody: "",
    id: `${parent.id}-${kind.toLowerCase().replace(/\s+/g, "-")}-local-${Date.now()}`,
    kind,
    legacyWorkPackageId: null,
    metadataStatus: "partial",
    remark: "",
    title: `${kindLabel} ${nextIndex} - New ${kindLabel}`,
    tone: kind === "Defect" ? "danger" : kind === "Risk" ? "warn" : "info",
  };
}

export function normalizeExecutionTreeTitlePrefix(
  prefix: string,
  kind: DeliveryComponentType,
) {
  const kindLabel = executionTreeNodeKindLabel(kind);

  return prefix
    .replace(/^user story/i, "User Story")
    .replace(/^pi objective/i, "PI Objective")
    .replace(new RegExp(`^${kindLabel}`, "i"), kindLabel);
}
