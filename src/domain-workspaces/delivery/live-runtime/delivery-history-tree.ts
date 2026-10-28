import type { ControlBoardTreeNode } from "../../../product-apps/control-board/control-board-model.ts";
import type { DeliveryChangeProjection } from "./delivery-change-live-types.ts";

// Selected-package read, not an inventory expansion. Never bind another
// initiative's tree or substitute an empty tree for unavailable owner data.
export function deliveryHistoryInspectionTree(projection: DeliveryChangeProjection | null, deliveryId: string): ControlBoardTreeNode | null {
  if (!projection) return null;
  const match = /^delivery-([1-9][0-9]*)$/.exec(deliveryId);
  if (!match || projection.delivery_id !== deliveryId || projection.record_ref !== `openproject://work_packages/${match[1]}` || projection.package.execution_tree.id !== Number(match[1])) {
    throw new Error("The tree owner returned a different Delivery package.");
  }
  const seen = new Set<number>();
  const kinds = new Set(["Epic", "Feature", "User story", "Defect", "Task", "PI Objective", "Milestone", "Risk"]);
  function node(value: DeliveryChangeProjection["package"]["execution_tree"], depth = 0): ControlBoardTreeNode {
    if (depth > 32 || seen.size >= 8192 || !Number.isSafeInteger(value.id) || value.id < 1 || seen.has(value.id) || value.record_ref !== `openproject://work_packages/${value.id}` || !kinds.has(value.type)) throw new Error("The selected owner tree has inconsistent or excessive hierarchy.");
    seen.add(value.id);
    const children = value.children.map(child => node(child, depth + 1));
    return { id: `work-item-${value.id}`, title: value.subject, componentType: value.type,
      description: value.description ?? "Owner narrative not projected.", children,
      totalChildCount: children.reduce((count, child) => count + child.totalChildCount + 1, 0) };
  }
  return node(projection.package.execution_tree);
}
