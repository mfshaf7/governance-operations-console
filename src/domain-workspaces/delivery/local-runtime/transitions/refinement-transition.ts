import type { DeliveryReadModel } from "../../read-model/index.ts";
import type { LocalRefinementApplyRecord } from "./transition-record.ts";
import { deliveryPackageSourceVersion } from "./transition-record.ts";
import {
  executionPackageIdForRefinementPackage,
  projectLocalExecutionPackage,
} from "./refinement-execution-transition.ts";

export function applyLocalRefinementReceipts(
  model: DeliveryReadModel,
  receiptsByPackage: Record<string, LocalRefinementApplyRecord>,
): DeliveryReadModel {
  const localEntries = Object.entries(receiptsByPackage);

  if (localEntries.length === 0) {
    return model;
  }

  const sourcePackagesById = new Map(
    model.packages.map((deliveryPackage) => [
      deliveryPackage.delivery_package_id,
      deliveryPackage,
    ]),
  );
  const packages = model.packages.map(
    (deliveryPackage): (typeof model.packages)[number] => {
      const receipt = receiptsByPackage[deliveryPackage.delivery_package_id];

      if (
        !receipt ||
        deliveryPackage.workflow_phase !== "refinement" ||
        receipt.sourceRecordVersion !==
          deliveryPackageSourceVersion(deliveryPackage)
      ) {
        return deliveryPackage;
      }

      const completed = receipt.outcome === "accepted";

      return {
        ...deliveryPackage,
        local_workflow_projection: {
          authority: "prototype-local",
          receipt_id: receipt.receipt_id,
          recorded_at: receipt.applied_at,
          status_label: completed ? "Done" : "Blocked",
          summary: completed
            ? "Local Refinement apply receipt is recorded. Source package status remains unchanged until the backend projection refreshes."
            : "Local Refinement apply did not complete. Review the receipt before retrying.",
          tone: completed ? "ok" : "danger",
          workflow_phase: "refinement",
        },
      };
    },
  );
  const existingPackageIds = new Set(
    packages.map((deliveryPackage) => deliveryPackage.delivery_package_id),
  );
  const executionPackages = localEntries.flatMap(
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
        }),
      ];
    },
  );

  return {
    ...model,
    packages: [...packages, ...executionPackages],
  };
}
