import type {
  ControlBoardFamilyGroup,
  ControlBoardPackage,
  ControlBoardPackageTreeById,
  ControlBoardPostureTerms,
  ControlBoardTreeNode,
} from "../../../../product-apps/control-board/index.ts";

import type {
  DeliveryArtNode,
  DeliveryPackageSummary,
  DeliveryReadModel,
} from "../../read-model/index.ts";
import { deliveryWorkItemStatus } from "../../domain/delivery-execution.ts";
import {
  deliveryPostureTerms,
  getDeliveryEffectivePackageProjection,
  getChildCounts,
  getPackageTree,
} from "../../read-model/index.ts";

export function deliveryControlBoardFamilyGroups(model: DeliveryReadModel, packages: DeliveryPackageSummary[]): ControlBoardFamilyGroup[] {
  const groups = new Map<string, ControlBoardFamilyGroup>();
  for (const item of packages) {
    // Fixtures remain an explicitly disconnected presentation source. Live
    // membership uses only the recorded family, never example IDs or prose.
    const fixture = model.source_truth !== "OpenProject-backed OOS"
      ? model.family_map.groups.find(group => group.packages.some(p => p.delivery_package_id === item.delivery_package_id)) : null;
    const family = item.initiative_family?.trim();
    const id = family ? `family:${family}` : fixture?.id ?? "family:unassigned";
    const label = family ? family.split(/[-_]/).map(word => word === "ai" ? "AI" : word.charAt(0).toUpperCase() + word.slice(1)).join(" ") : fixture?.label ?? "Unassigned";
    if (!groups.has(id)) groups.set(id, { id, label, packageIds: [] });
    groups.get(id)!.packageIds.push(item.delivery_package_id);
  }
  return [...groups.values()].sort((a, b) => a.id === "family:unassigned" ? 1 : b.id === "family:unassigned" ? -1 : a.label.localeCompare(b.label));
}

export const deliveryControlBoardPostureTerms =
  deliveryPostureTerms as ControlBoardPostureTerms;

export function deliveryPackagesToControlBoardPackages({
  model,
  packages,
}: {
  model: DeliveryReadModel;
  packages: DeliveryPackageSummary[];
}): ControlBoardPackage[] {
  return packages.map((deliveryPackage) =>
    deliveryPackageToControlBoardPackage({
      packageSummary: deliveryPackage,
      packageTree: getPackageTree(deliveryPackage.delivery_package_id, model),
    }),
  );
}

export function deliveryControlBoardTreeByPackageId({
  model,
  packages,
}: {
  model: DeliveryReadModel;
  packages: DeliveryPackageSummary[];
}): ControlBoardPackageTreeById {
  return Object.fromEntries(
    packages.map((deliveryPackage) => [
      deliveryPackage.delivery_package_id,
      deliveryArtNodeToControlBoardTreeNode(
        getPackageTree(deliveryPackage.delivery_package_id, model),
      ),
    ]),
  );
}

function deliveryPackageToControlBoardPackage({
  packageSummary,
  packageTree,
}: {
  packageSummary: DeliveryPackageSummary;
  packageTree: DeliveryArtNode | null;
}): ControlBoardPackage {
  const childCounts = packageTree ? getChildCounts(packageTree) : null;
  const packageProjection =
    getDeliveryEffectivePackageProjection(packageSummary);
  const totalChildCount = Math.max(
    childCounts?.total_child_count ?? packageSummary.open_child_count ?? 0,
    packageSummary.open_child_count ?? 0,
  );
  const descendants = (node: DeliveryArtNode): DeliveryArtNode[] => node.children.flatMap(child => [child, ...descendants(child)]);
  const nodes = packageTree ? descendants(packageTree) : null;
  const completedChildCount = nodes?.filter(node => node.backend_status === "done").length ?? 0;
  const retiredChildCount = nodes?.filter(node => node.backend_status === "retired").length ?? 0;
  const progressPercent =
    totalChildCount > 0
      ? Math.round((completedChildCount / totalChildCount) * 100)
      : 0;

  return {
    displayName: packageSummary.display_name,
    openChildCount: packageSummary.open_child_count,
    packageId: packageSummary.delivery_package_id,
    posture: packageProjection.posture,
    progress: nodes === null ? null : {
      completedChildCount,
      retiredChildCount,
      progressPercent,
      totalChildCount,
    },
    sourceRef: packageSummary.source_ref,
    sourceLabel: `Epic ${packageSummary.legacy_epic_id}`,
    tone: packageProjection.tone,
  };
}

function deliveryArtNodeToControlBoardTreeNode(
  node: DeliveryArtNode | null,
): ControlBoardTreeNode | null {
  if (!node) {
    return null;
  }

  return {
    children: node.children
      .map((child) => deliveryArtNodeToControlBoardTreeNode(child))
      .filter((child): child is ControlBoardTreeNode => Boolean(child)),
    componentType: node.component_type,
    description: node.description,
    id: node.id,
    workItemId: node.legacy_work_package_id ?? undefined,
    status: deliveryWorkItemStatus(node),
    sourceLabel: node.legacy_work_package_id ? `${node.component_type} ${node.legacy_work_package_id}` : undefined,
    title: node.title,
    totalChildCount: getChildCounts(node).total_child_count,
  };
}
