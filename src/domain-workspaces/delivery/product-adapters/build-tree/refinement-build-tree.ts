import { buildTreeStructuredNodeLayout } from "../../../../product-apps/build-tree/index.ts";
import type { DeliveryRefinementTreeNode } from "../../read-model/index.ts";

export type RefinementBuildTreeNode = DeliveryRefinementTreeNode & { draftBody: string; children: RefinementBuildTreeNode[] };

export function refinementBuildTreeNode(node: DeliveryRefinementTreeNode): RefinementBuildTreeNode {
  return { ...node, draftBody: node.draft_body, children: (node.children ?? []).map(refinementBuildTreeNode) };
}

export function refinementBuildTreeRole(node: RefinementBuildTreeNode) {
  return node.kind === "Epic" ? "root" as const : node.kind === "Feature" ? "group" as const : node.kind === "User story" || node.kind === "Defect" || node.kind === "Task" ? "leaf" as const : "support" as const;
}

export function refinementBuildTreeLayout(node: RefinementBuildTreeNode, visibleIds: string[]) {
  const layout = buildTreeStructuredNodeLayout(node, {
    rootKind: "Epic", groupKind: "Feature", leafKind: "User story",
    isSupportNode: child => child.kind !== "Feature",
  });
  const visible = (child: RefinementBuildTreeNode) => visibleIds.includes(child.id);
  return { ...layout, visibleChildren: layout.visibleChildren.filter(visible),
    groupedLeafChildren: layout.groupedLeafChildren.filter(visible), supportChildren: layout.supportChildren.filter(visible) };
}
