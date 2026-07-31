"use client";

import { useState } from "react";

import type {
  DeliveryPackageSummary,
  DeliveryReadModel,
} from "../../read-model/index.ts";

import type { WorkDesignApplyReceipt } from "../../work-model/work-design/work-design-types.ts";
import { refinementPackageIdForWorkDesignPackage } from "../../work-model/work-design/work-design-handoff-model.ts";
import type { DeliveryPackageActionState } from "../workflows/shared/package-actions/package-action-types.ts";
import type { DeliverySurfaceId } from "../workspace/workspace-types.ts";
import {
  DeliveryRefinementWorkflowModal,
  refinementSourceWorkDesignPackageId,
} from "../workflows/refinement/index.ts";
import { DeliveryWorkDesignSessionModal } from "../workflows/work-design/index.ts";

export function DeliveryPackageWorkflowRouter({
  model,
  onCloseRefinement,
  onCloseWorkDesign,
  onOpenRefinementPackage,
  onRefreshRegister,
  onWorkDesignApplied,
  packageAction,
}: {
  model: DeliveryReadModel;
  onCloseRefinement: () => void;
  onCloseWorkDesign: () => void;
  onOpenRefinementPackage?: (
    surfaceId: Extract<DeliverySurfaceId, "refinement" | "work-design">,
    packageId: string,
  ) => void;
  onRefreshRegister: () => void;
  onWorkDesignApplied?: (
    deliveryPackage: DeliveryPackageSummary,
    record: WorkDesignApplyReceipt,
  ) => void;
  packageAction: DeliveryPackageActionState | null;
}) {
  const [pendingRefinementPackageId, setPendingRefinementPackageId] = useState<
    string | null
  >(null);

  if (!packageAction) {
    return null;
  }

  if (packageAction.route === "work-design") {
    return (
      <DeliveryWorkDesignSessionModal
        key={packageAction.deliveryPackage.delivery_package_id}
        onApplied={(record) => {
          setPendingRefinementPackageId(
            refinementPackageIdForWorkDesignPackage(
              packageAction.deliveryPackage,
            ),
          );
          onWorkDesignApplied?.(packageAction.deliveryPackage, record);
        }}
        onClose={() => {
          const refinementPackageId = pendingRefinementPackageId;

          onCloseWorkDesign();
          setPendingRefinementPackageId(null);

          if (refinementPackageId) {
            onOpenRefinementPackage?.("refinement", refinementPackageId);
            return;
          }

          onRefreshRegister();
        }}
        workflow={packageAction}
      />
    );
  }

  if (packageAction.route === "refinement") {
    return (
      <DeliveryRefinementWorkflowModal
        key={packageAction.deliveryPackage.delivery_package_id}
        onClose={onCloseRefinement}
        sourceWorkDesignPackage={sourceWorkDesignPackageForRefinement(
          model.packages,
          packageAction.deliveryPackage,
        )}
        workflow={packageAction}
      />
    );
  }

  return null;
}

function sourceWorkDesignPackageForRefinement(
  packages: DeliveryPackageSummary[],
  deliveryPackage: DeliveryPackageSummary,
) {
  const packet = deliveryPackage.refinement_packet;

  if (!packet) {
    return null;
  }

  const sourcePackageId = refinementSourceWorkDesignPackageId(packet);

  if (!sourcePackageId) {
    return null;
  }

  return (
    packages.find(
      (candidate) => candidate.delivery_package_id === sourcePackageId,
    ) ?? null
  );
}
