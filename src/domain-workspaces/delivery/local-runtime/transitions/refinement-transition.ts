import type { DeliveryReadModel } from "../../read-model/index.ts";
import type { LocalRefinementApplyRecord } from "./transition-record.ts";
import { deliveryPackageSourceVersion } from "./transition-record.ts";
import { preparationOnlyPacket, previewPIPlansForEpic, type PreviewPIPlan } from "../projections/pi-planning-preview.ts";
import {
  executionPackageIdForRefinementPackage,
  projectLocalExecutionPackage,
} from "./refinement-execution-transition.ts";

export function applyLocalRefinementReceipts(
  model: DeliveryReadModel,
  receiptsByPackage: Record<string, LocalRefinementApplyRecord>,
  piPlans: Record<string, PreviewPIPlan> = {},
): DeliveryReadModel {
  const localEntries = Object.entries(receiptsByPackage);

  const packages = model.packages.map(
    (deliveryPackage): (typeof model.packages)[number] => {
      const prepared = deliveryPackage.workflow_phase === "refinement" && deliveryPackage.refinement_packet
        ? { ...deliveryPackage, refinement_packet: preparationOnlyPacket(deliveryPackage.refinement_packet) }
        : deliveryPackage;
      const receipt = receiptsByPackage[deliveryPackage.delivery_package_id];

      if (
        !receipt ||
        deliveryPackage.workflow_phase !== "refinement" ||
        receipt.sourceRecordVersion !==
          deliveryPackageSourceVersion(prepared)
      ) {
        return prepared;
      }

      const completed = receipt.outcome === "accepted";

      return {
        ...prepared,
        local_workflow_projection: {
          authority: "prototype-local",
          receipt_id: receipt.receipt_id,
          recorded_at: receipt.applied_at,
          status_label: completed ? "Done" : "Blocked",
          summary: completed
            ? "Preparation recorded. Plan the PI commitment before starting execution."
            : "Local Refinement apply did not complete. Review the receipt before retrying.",
          tone: completed ? "ok" : "danger",
          workflow_phase: "refinement",
        },
      };
    },
  );
  const sourcePackagesById = new Map(packages.map(item => [item.delivery_package_id, item]));
  const existingPackageIds = new Set(
    packages.map((deliveryPackage) => deliveryPackage.delivery_package_id),
  );
  const candidates = new Map(localEntries);
  for (const item of packages) {
    if (item.refinement_packet?.receipt?.outcome === "accepted" &&
      item.workflow_phase === "refinement" && !candidates.has(item.delivery_package_id)) {
      candidates.set(item.delivery_package_id, {
        ...item.refinement_packet.receipt,
        sourceRecordVersion: deliveryPackageSourceVersion(item),
      });
    }
  }
  const executionPackages = [...candidates].flatMap(
    ([sourcePackageId, receipt]) => {
      const sourcePackage = sourcePackagesById.get(sourcePackageId);

      if (
        !sourcePackage ||
        sourcePackage.workflow_phase !== "refinement" ||
        receipt.outcome !== "accepted" ||
        receipt.sourceRecordVersion !==
          deliveryPackageSourceVersion(sourcePackage)
      ) {
        return [];
      }

      const recordedPlans = previewPIPlansForEpic(piPlans, sourcePackage.legacy_epic_id);
      if (recordedPlans.length === 0) return [];
      const executionPackageId =
        executionPackageIdForRefinementPackage(sourcePackage);

      if (existingPackageIds.has(executionPackageId)) {
        return [];
      }

      return [
        projectLocalExecutionPackage({
          deliveryPackage: sourcePackage,
          executionPackageId,
          receipt,
          targetPI: recordedPlans.length === 1 ? recordedPlans[0].pi : sourcePackage.target_pi ?? undefined,
        }),
      ];
    },
  );

  return {
    ...model,
    preview_pi_plans: piPlans,
    packages: [...packages.map(item => {
      const plans = previewPIPlansForEpic(piPlans, item.legacy_epic_id);
      return plans.length === 1 && !item.target_pi ? { ...item, target_pi: plans[0].pi } : item;
    }), ...executionPackages],
  };
}
