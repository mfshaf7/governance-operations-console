import type {
  DeliveryArtNode,
  DeliveryPackageFixture,
  DeliveryPackageSummary,
} from "../../../domain/delivery-types.ts";

import { deliveryArtTreeFixture } from "../board/art-tree.fixture.ts";
import { deliveryExecutionPackageFixtures } from "./execution.fixture.ts";
import { deliveryIntakePackageFixtures } from "./intake.fixture.ts";
import { deliveryRefinementPackageFixtures } from "./refinement.fixture.ts";
import { attachSourceCustodyToDeliveryPackages } from "./source-custody.fixture.ts";
import { deliveryWorkDesignPackageFixtures } from "./work-design/work-design.fixture.ts";

const deliveryPackageFixtureRows: DeliveryPackageFixture[] = [
  ...deliveryIntakePackageFixtures,
  ...deliveryWorkDesignPackageFixtures,
  ...deliveryRefinementPackageFixtures,
  ...deliveryExecutionPackageFixtures,
].map(syncTreeDerivedChildCount);

export const deliveryPackageFixtures: DeliveryPackageSummary[] =
  attachSourceCustodyToDeliveryPackages(deliveryPackageFixtureRows);

function syncTreeDerivedChildCount(
  deliveryPackage: DeliveryPackageFixture,
): DeliveryPackageFixture {
  const treeRoot = findTreeNode(
    deliveryPackage.tree_root_id,
    deliveryArtTreeFixture.roots,
  );

  if (!treeRoot) {
    return deliveryPackage;
  }

  return {
    ...deliveryPackage,
    open_child_count: countOpenDescendants(treeRoot),
  };
}

function findTreeNode(
  nodeId: string,
  nodes: DeliveryArtNode[],
): DeliveryArtNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node;
    }

    const childMatch = findTreeNode(nodeId, node.children);

    if (childMatch) {
      return childMatch;
    }
  }

  return null;
}

function countOpenDescendants(node: DeliveryArtNode): number {
  return node.children.reduce((total, child) => {
    const childOpen =
      child.backend_status === "done" || child.backend_status === "retired"
        ? 0
        : 1;

    return total + childOpen + countOpenDescendants(child);
  }, 0);
}
