import type {
  DeliveryPackageSummary,
  DeliveryRefinementApplyReceipt,
} from "../../read-model/index.ts";
import { deliveryPackageSourceVersion } from "./transition-record.ts";

export function executionPackageIdForRefinementPackage(
  deliveryPackage: Pick<DeliveryPackageSummary, "delivery_package_id">,
) {
  const executionPackageId = deliveryPackage.delivery_package_id.replace(
    /^pkg-refinement-/,
    "pkg-execution-",
  );

  return executionPackageId === deliveryPackage.delivery_package_id
    ? `${deliveryPackage.delivery_package_id}-execution`
    : executionPackageId;
}

export function projectLocalExecutionPackage({
  deliveryPackage,
  executionPackageId = executionPackageIdForRefinementPackage(deliveryPackage),
  receipt,
  targetPI,
}: {
  deliveryPackage: DeliveryPackageSummary;
  executionPackageId?: string;
  receipt: DeliveryRefinementApplyReceipt;
  targetPI?: string;
}): DeliveryPackageSummary {
  const {
    local_workflow_projection: _localWorkflowProjection,
    ...sourcePackage
  } = deliveryPackage;
  const sourcePackageVersion = deliveryPackageSourceVersion(deliveryPackage);

  return {
    ...sourcePackage,
    available_actions: [],
    backend_status: "ready",
    delivery_package_id: executionPackageId,
    execution_handoff: {
      authority: "prototype-local",
      evidence_refs: [
        receipt.receipt_id,
        receipt.source_work_design_receipt_id,
      ],
      handed_off_at: receipt.applied_at,
      source_package_id: deliveryPackage.delivery_package_id,
      source_package_version: sourcePackageVersion,
      source_refinement_receipt_id: receipt.receipt_id,
      tree_snapshot_ref:
        deliveryPackage.refinement_packet?.handoff.tree_snapshot_ref ??
        `tree://delivery/${deliveryPackage.tree_root_id}`,
    },
    package_posture: "Ready",
    refinement_packet: deliveryPackage.refinement_packet
      ? {
          ...deliveryPackage.refinement_packet,
          active_step: "apply_refinement",
          last_saved_at: receipt.applied_at,
          receipt,
          status: "applied",
        }
      : undefined,
    summary:
      "Preparation and PI commitment are recorded. Review the work item’s execution requirements.",
    target_pi: targetPI ?? sourcePackage.target_pi,
    tone: "info",
    workflow_phase: "execution",
  };
}
