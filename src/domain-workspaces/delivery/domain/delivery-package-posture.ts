import type { DeliveryPackagePosture, DeliveryTone, DeliveryWorkflowPhase } from "./delivery-common.ts";
import type { DeliveryPackageSummary } from "./delivery-package.ts";
import type { DeliveryRefinementApplyReceipt } from "./delivery-refinement.ts";

export type DeliveryEffectivePackageProjection = {
  posture: DeliveryPackagePosture;
  summary: string;
  tone: DeliveryTone;
};

export function getDeliveryEffectivePackageProjection(
  deliveryPackage: DeliveryPackageSummary,
  {
    refinementReceipt = deliveryPackage.refinement_packet?.receipt ?? null,
  }: {
    refinementReceipt?: DeliveryRefinementApplyReceipt | null;
  } = {},
): DeliveryEffectivePackageProjection {
  const localProjection = deliveryPackage.local_workflow_projection;

  if (
    localProjection &&
    localProjection.workflow_phase === deliveryPackage.workflow_phase
  ) {
    return {
      posture: localProjection.status_label,
      summary: localProjection.summary,
      tone: localProjection.tone,
    };
  }

  if (deliveryPackage.workflow_phase === "refinement" && refinementReceipt) {
    if (refinementReceipt.outcome !== "accepted") {
      return {
        posture: "Blocked",
        summary: `Refinement apply receipt ${refinementReceipt.receipt_id} did not complete. Review the receipt before retrying.`,
        tone: "danger",
      };
    }

    return {
      posture: "Done",
      summary: `Refinement apply receipt ${refinementReceipt.receipt_id} is recorded. This package is complete for the current Refinement pass.`,
      tone: "ok",
    };
  }

  return {
    posture: deliveryPackage.package_posture,
    summary: deliveryPackage.summary,
    tone: deliveryPackage.tone,
  };
}

export function getDeliveryEffectivePackagePosture(
  deliveryPackage: DeliveryPackageSummary,
): DeliveryPackagePosture {
  return getDeliveryEffectivePackageProjection(deliveryPackage).posture;
}

export function deliveryRefinementPackageHasBlocker(
  deliveryPackage: DeliveryPackageSummary,
  posture = getDeliveryEffectivePackagePosture(deliveryPackage),
) {
  return deliveryPackage.execution_navigation
    ? deliveryPackage.backend_status === "blocked" || Boolean(deliveryPackage.active_blocker)
    : posture === "Blocked";
}

export function deliveryPackageMatchesWorkflowPhase(deliveryPackage: DeliveryPackageSummary, workflowPhase: DeliveryWorkflowPhase) {
  if (deliveryPackage.backend_status === "parked") return false;
  const navigation = deliveryPackage.execution_navigation;
  if (workflowPhase === "refinement" && navigation) {
    return Boolean(navigation.refinement_governance_pending || navigation.refinement_work_item_ids.length ||
      (navigation.planning_prepared_work_item_ids === undefined && deliveryPackage.workflow_phase === "refinement"));
  }
  return deliveryPackage.workflow_phase === workflowPhase;
}
