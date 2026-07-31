import type { DeliveryPackageSummary } from "../../read-model/index.ts";
import {
  buildTreeExpandedNodeIds,
  buildTreeMetrics,
  buildTreeNodeDisplayTitle,
  buildTreeNodeSummary,
  buildTreeNodeSystemTitle,
  buildTreeNodeTitleParts,
  buildTreeReviewCollapsibleNodeIds,
  buildTreeRootExpandedNodeIds,
  buildTreeStructuredGroupNodeIds,
  buildTreeStructuredNodeLayout,
  composeBuildTreeNodeTitle,
  deleteBuildTreeNode,
  findBuildTreeNode,
  flattenBuildTree,
  insertBuildTreeNodeBeforeSupport,
  updateBuildTreeNode,
} from "../../../../product-apps/build-tree/index.ts";
import type { BuildTreeTitleProfile } from "../../../../product-apps/build-tree/index.ts";

import type {
  WorkDesignNode,
  WorkDesignNodeKind,
} from "../../work-model/work-design/work-design-types.ts";

type WorkDesignGeneratedTreeNode = NonNullable<
  NonNullable<
    DeliveryPackageSummary["work_design_context_session"]
  >["generated_tree"]
>;

const workDesignTitleProfile: BuildTreeTitleProfile<WorkDesignNodeKind> = {
  kindFallbacks: {
    Epic: "Epic",
    Feature: "Feature",
    Risk: "Risk",
    "User story": "User Story",
  },
  normalizePrefix: normalizeWorkDesignTitlePrefix,
  prefixPattern:
    /^((?:Epic #\d+)|(?:Feature \d+)|(?:User Story \d+)|(?:Risk \d+))\s*-\s*(.*)$/i,
};

export type WorkDesignGeneratedSeedMetrics = {
  features: number;
  risks: number;
  stories: number;
  total: number;
};

export function workDesignGeneratedTreeSeedMetrics(
  tree: WorkDesignGeneratedTreeNode | null | undefined,
): WorkDesignGeneratedSeedMetrics {
  if (!tree) {
    return {
      features: 0,
      risks: 0,
      stories: 0,
      total: 0,
    };
  }

  const childMetrics = (
    tree.children ?? []
  ).reduce<WorkDesignGeneratedSeedMetrics>(
    (total, child) => {
      const metrics = workDesignGeneratedTreeSeedMetrics(child);

      return {
        features: total.features + metrics.features,
        risks: total.risks + metrics.risks,
        stories: total.stories + metrics.stories,
        total: total.total + metrics.total,
      };
    },
    {
      features: 0,
      risks: 0,
      stories: 0,
      total: 0,
    },
  );

  const ownMetrics: WorkDesignGeneratedSeedMetrics = {
    features: tree.kind === "Feature" ? 1 : 0,
    risks: tree.kind === "Risk" ? 1 : 0,
    stories: tree.kind === "User story" ? 1 : 0,
    total: tree.kind === "Epic" ? 0 : 1,
  };

  return {
    features: ownMetrics.features + childMetrics.features,
    risks: ownMetrics.risks + childMetrics.risks,
    stories: ownMetrics.stories + childMetrics.stories,
    total: ownMetrics.total + childMetrics.total,
  };
}

export function workDesignGeneratedSeedSummary(
  metrics: WorkDesignGeneratedSeedMetrics,
) {
  if (metrics.total === 0) {
    return "0 confirmed seeds";
  }

  return `${metrics.features} ${metrics.features === 1 ? "Feature" : "Features"} / ${metrics.stories} ${metrics.stories === 1 ? "User story" : "User stories"} / ${metrics.risks} ${metrics.risks === 1 ? "Risk" : "Risks"}`;
}

export function workDesignNodeFromGeneratedTree(
  node: WorkDesignGeneratedTreeNode,
): WorkDesignNode {
  return {
    children: node.children?.map(workDesignNodeFromGeneratedTree),
    description: node.description,
    draftBody: node.draft_body,
    id: node.id,
    kind: node.kind,
    remark: node.remark,
    title: node.title,
    tone: node.tone,
  };
}

export function initialWorkDesignTree(
  deliveryPackage: DeliveryPackageSummary,
): WorkDesignNode {
  const contextSession = deliveryPackage.work_design_context_session;
  const generatedTree =
    contextSession?.decision === "proceed"
      ? contextSession.generated_tree
      : null;

  if (generatedTree) {
    return workDesignNodeFromGeneratedTree(generatedTree);
  }

  if (contextSession?.accepted && contextSession.decision === "proceed") {
    return {
      children: [],
      description:
        "Root Epic shell selected for Work Design. The finalized context brief did not produce confirmed build seeds.",
      draftBody: `## What This Initiative Achieves\nShape ${deliveryPackage.display_name} from the selected Epic shell because the finalized Context Brief did not include confirmed Feature or User story seeds.\n\n## Current Work Design Focus\nCapture design intent only. Refinement decides final PI placement.\n\n## Scope Boundaries\nWork Design starts from the Epic shell and treats the Context Brief snapshot as evidence, not inferred structure.\n\n## Operator Handoff Note\nInspect the finalized brief, then add Feature, User story, and optional Risk branches manually or through the advisor.`,
      id: `${deliveryPackage.delivery_package_id}-epic`,
      kind: "Epic",
      remark:
        "No confirmed build seeds were attached to the finalized Context Brief.",
      title: `Epic #${deliveryPackage.legacy_epic_id} - ${deliveryPackage.display_name}`,
      tone: "info",
    };
  }

  return {
    children: [
      {
        children: [
          {
            description:
              "Draft User story for the first operator-visible outcome.",
            draftBody:
              "## What This Achieves\nCreate one clear operator-visible outcome from this package.\n\n## Why This Matters Now\nThe package needs a concrete story seed before Refinement can materialize execution metadata.\n\n## Evidence Expectation\nThe story outcome and expected proof are understandable before Refinement.",
            id: `${deliveryPackage.delivery_package_id}-story-1`,
            kind: "User story",
            remark: "Capture outcome and acceptance signal.",
            title: "User Story 1 - First Outcome",
            tone: "info",
          },
          {
            description:
              "Draft User story for validation and receipt boundaries.",
            draftBody:
              "## What This Achieves\nSeparate validation and receipt boundaries from tree authoring.\n\n## Why This Matters Now\nThe operator needs to see what will be checked before the draft is applied.\n\n## Evidence Expectation\nDraft review and validation expectations are visible before Apply Draft.",
            id: `${deliveryPackage.delivery_package_id}-story-2`,
            kind: "User story",
            remark: "Keep validation separate from authoring.",
            title: "User Story 2 - Validation Boundary",
            tone: "info",
          },
        ],
        description:
          "Primary Feature branch created from the consumed package shell.",
        draftBody:
          "## What This Achieves\nCreate the first coherent operator workflow slice for this consumed package.\n\n## Benefit Hypothesis\nA focused Feature seed lets Refinement add execution metadata without reshaping the design intent.\n\n## Scope Boundaries\nKeep the Feature focused on the operator-visible workflow slice.\n\n## Evidence Expectation\nThe Feature is ready when its child story seeds and design boundary are clear.\n\n## Operator work notes\nPrimary workflow slice.",
        id: `${deliveryPackage.delivery_package_id}-feature-1`,
        kind: "Feature",
        remark: "Primary workflow slice.",
        title: "Feature 1 - Primary Work Slice",
        tone: "info",
      },
      {
        description:
          "Optional Risk branch for sequence, ownership, or dependency concerns.",
        draftBody:
          "## Risk Event\nSequencing, ownership, or dependency concerns may affect the package before Refinement.\n\n## Impact\nThe draft can reach Refinement with unclear ownership or dependency order.\n\n## Current Handling\nOperator reviews the risk before applying the Work Design draft.",
        id: `${deliveryPackage.delivery_package_id}-risk-1`,
        kind: "Risk",
        remark: "Optional support branch.",
        title: "Risk 1 - Sequencing Risk",
        tone: "warn",
      },
    ],
    description:
      "Root Epic shell created by Intake. Work Design shapes children before refinement.",
    draftBody: `## What This Initiative Achieves\nShape ${deliveryPackage.display_name} into a draft Epic tree before Refinement.\n\n## Current Work Design Focus\nCapture the reason this package should be prepared now; Refinement decides final PI placement.\n\n## Scope Boundaries\nWork Design shapes the draft tree and handoff evidence. Refinement owns execution metadata.\n\n## Operator Handoff Note\nHighlight the work-design intent, known gaps, and anything Refinement should inspect first.`,
    id: `${deliveryPackage.delivery_package_id}-epic`,
    kind: "Epic",
    remark: "Execution metadata belongs to Refinement.",
    title: `Epic #${deliveryPackage.legacy_epic_id} - ${deliveryPackage.display_name}`,
    tone: "info",
  };
}

export function findWorkDesignNode(
  node: WorkDesignNode,
  nodeId: string,
): WorkDesignNode | null {
  return findBuildTreeNode(node, nodeId);
}

export function updateWorkDesignNode(
  node: WorkDesignNode,
  nodeId: string,
  update: (node: WorkDesignNode) => WorkDesignNode,
): WorkDesignNode {
  return updateBuildTreeNode(node, nodeId, update);
}

export function deleteWorkDesignNode(
  node: WorkDesignNode,
  nodeId: string,
): WorkDesignNode {
  return deleteBuildTreeNode(node, nodeId);
}

export function insertWorkDesignPrimaryNode(
  children: WorkDesignNode[],
  node: WorkDesignNode,
) {
  return insertBuildTreeNodeBeforeSupport(
    children,
    node,
    isWorkDesignSupportNode,
  );
}

export function isWorkDesignSupportNode(node: WorkDesignNode) {
  return node.kind === "Risk";
}

export function flattenWorkDesignTree(node: WorkDesignNode): WorkDesignNode[] {
  return flattenBuildTree(node);
}

export function workDesignMetrics(tree: WorkDesignNode): {
  features: number;
  risks: number;
  stories: number;
} {
  return buildTreeMetrics(tree, {
    features: (node) => node.kind === "Feature",
    risks: (node) => node.kind === "Risk",
    stories: (node) => node.kind === "User story",
  });
}

export function workDesignInitialExpandedNodeIds(
  tree: WorkDesignNode,
): string[] {
  return buildTreeExpandedNodeIds(tree);
}

export function workDesignRootExpandedNodeIds(tree: WorkDesignNode): string[] {
  return buildTreeRootExpandedNodeIds(tree);
}

export function workDesignStructuredStoryGroupNodeIds(
  tree: WorkDesignNode,
): string[] {
  return buildTreeStructuredGroupNodeIds(tree, {
    childKind: "User story",
    groupKind: "Feature",
  });
}

export function workDesignReviewCollapsibleNodeIds(
  tree: WorkDesignNode,
): string[] {
  return buildTreeReviewCollapsibleNodeIds(tree, {
    leafKind: "User story",
  });
}

export function workDesignStructuredNodeLayout(node: WorkDesignNode) {
  return buildTreeStructuredNodeLayout(node, {
    groupKind: "Feature",
    isSupportNode: isWorkDesignSupportNode,
    leafKind: "User story",
    rootKind: "Epic",
  });
}

export function workDesignStructuredChildCountLabel(node: WorkDesignNode) {
  const layout = workDesignStructuredNodeLayout(node);

  if (node.kind === "Epic") {
    const count = layout.primaryChildren.length;
    return `${count} Feature ${count === 1 ? "branch" : "branches"}`;
  }

  if (node.kind === "Feature") {
    const count = layout.groupedLeafChildren.length;
    return `${count} User ${count === 1 ? "story" : "stories"}`;
  }

  if (node.kind === "Risk") {
    return "Support branch";
  }

  return "";
}

export function workDesignNodeKindLabel(kind: WorkDesignNodeKind) {
  return kind === "User story" ? "User Story" : kind;
}

export function workDesignNodeIndex(node: WorkDesignNode, position: number) {
  if (node.kind === "Epic") {
    return "E";
  }

  if (node.kind === "Risk") {
    return "R";
  }

  return String(position + 1).padStart(2, "0");
}

export function workDesignNodeSummary(node: WorkDesignNode) {
  const childCount = node.children?.length ?? 0;
  return buildTreeNodeSummary(node, {
    childItemLabel: (count) =>
      `${count} child ${count === 1 ? "item" : "items"}`,
    groupKind: "Feature",
    groupSummary: () =>
      `${childCount} draft User ${childCount === 1 ? "story" : "stories"}`,
    rootKind: "Epic",
    rootSummary: (root) => {
      const featureCount =
        root.children?.filter((child) => child.kind === "Feature").length ?? 0;
      const riskCount =
        root.children?.filter((child) => child.kind === "Risk").length ?? 0;
      return `${featureCount} Feature ${featureCount === 1 ? "branch" : "branches"} / ${riskCount} Risk ${riskCount === 1 ? "branch" : "branches"}`;
    },
  });
}

export function workDesignNodeDisplayTitle(node: WorkDesignNode) {
  return buildTreeNodeDisplayTitle(node, workDesignTitleProfile);
}

export function workDesignNodeTitleParts(node: WorkDesignNode): {
  editable: string;
  locked: string;
} {
  return buildTreeNodeTitleParts(node, workDesignTitleProfile);
}

export function composeWorkDesignNodeTitle(
  node: WorkDesignNode,
  editable: string,
) {
  return composeBuildTreeNodeTitle(node, editable, workDesignTitleProfile);
}

export function workDesignNodeSystemTitle(node: WorkDesignNode) {
  return buildTreeNodeSystemTitle(node, workDesignTitleProfile);
}

export function normalizeWorkDesignTitlePrefix(
  prefix: string,
  kind: WorkDesignNodeKind,
) {
  if (kind === "User story") {
    return prefix.replace(/^user story/i, "User Story");
  }

  return prefix
    .replace(/^epic/i, "Epic")
    .replace(/^feature/i, "Feature")
    .replace(/^risk/i, "Risk");
}

export function workDesignEditableTitlePlaceholder(kind: WorkDesignNodeKind) {
  switch (kind) {
    case "Epic":
      return "Package name";
    case "Feature":
      return "Feature outcome";
    case "Risk":
      return "Risk name";
    case "User story":
      return "Story outcome";
  }
}

export function workDesignDraftPlaceholder(node: WorkDesignNode) {
  switch (node.kind) {
    case "Epic":
      return "Capture initiative achievement, PI focus seed, scope boundaries, and handoff notes. Refinement adds execution context.";
    case "Feature":
      return "Capture achievement or enablement, benefit hypothesis, scope boundaries, evidence expectation, and operator notes.";
    case "Risk":
      return "Capture the risk event, impact, current handling, and review signal. Refinement adds execution context.";
    case "User story":
      return "Capture what this achieves or enables, why it matters now, and the evidence expectation.";
  }
}
