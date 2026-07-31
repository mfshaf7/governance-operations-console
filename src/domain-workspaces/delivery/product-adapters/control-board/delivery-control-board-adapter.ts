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
import {
  deliveryPostureTerms,
  getDeliveryEffectivePackageProjection,
  getChildCounts,
  getPackageTree,
} from "../../read-model/index.ts";

export const deliveryControlBoardFamilyGroups: ControlBoardFamilyGroup[] = [
  {
    id: "delivery-art-governance-foundations",
    label: "Governance Foundations",
    packageIds: ["pkg-698", "pkg-900"],
  },
  {
    id: "delivery-art-operator-surfaces",
    label: "Operator Surfaces",
    packageIds: ["pkg-714", "pkg-681"],
  },
  {
    id: "governed-ai-control-plane",
    label: "Governed AI Control Plane",
    packageIds: ["pkg-753", "pkg-251"],
  },
  {
    id: "enterprise-cybersecurity-baseline",
    label: "Cybersecurity Baseline",
    packageIds: ["pkg-087"],
  },
  {
    id: "product-prototype-delivery",
    label: "Prototype Delivery",
    packageIds: ["pkg-540"],
  },
];

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
    childCounts?.total_child_count ?? packageSummary.open_child_count,
    packageSummary.open_child_count,
  );
  const completedChildCount = Math.max(
    0,
    totalChildCount - packageSummary.open_child_count,
  );
  const progressPercent =
    totalChildCount > 0
      ? Math.round((completedChildCount / totalChildCount) * 100)
      : 100;

  return {
    displayName: packageSummary.display_name,
    openChildCount: packageSummary.open_child_count,
    packageId: packageSummary.delivery_package_id,
    posture: packageProjection.posture,
    progress: {
      completedChildCount,
      progressPercent,
      totalChildCount,
    },
    sourceRef: packageSummary.source_ref,
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
    title: node.title,
    totalChildCount: getChildCounts(node).total_child_count,
  };
}
