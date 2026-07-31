import type {
  DeliveryPackageSummary,
  DeliveryReadModel,
} from "../../read-model/index.ts";

import type { LocalWorkDesignApplyRecord } from "./transition-record.ts";
import { deliveryPackageSourceVersion } from "./transition-record.ts";
import { projectLocalRefinementPackage } from "./refinement-handoff-transition.ts";
import { refinementPackageIdForWorkDesignPackage } from "../../work-model/work-design/work-design-handoff-model.ts";

export function applyLocalWorkDesignApplies(
  model: DeliveryReadModel,
  localRecords: Record<string, LocalWorkDesignApplyRecord>,
): DeliveryReadModel {
  const localEntries = Object.entries(localRecords);

  if (localEntries.length === 0) {
    return model;
  }

  const sourcePackagesById = new Map(
    model.packages.map((deliveryPackage) => [
      deliveryPackage.delivery_package_id,
      deliveryPackage,
    ]),
  );
  const packages = model.packages.map((deliveryPackage) => {
    const localRecord = localRecords[deliveryPackage.delivery_package_id];

    if (
      !localRecord ||
      localRecord.sourceRecordVersion !==
        deliveryPackageSourceVersion(deliveryPackage)
    ) {
      return deliveryPackage;
    }

    return projectLocalAppliedWorkDesignPackage(deliveryPackage, localRecord);
  });
  const existingPackageIds = new Set(
    packages.map((deliveryPackage) => deliveryPackage.delivery_package_id),
  );
  const refinementPackages = localEntries.flatMap(
    ([sourcePackageId, localRecord]) => {
      const sourcePackage = sourcePackagesById.get(sourcePackageId);

      if (!sourcePackage) {
        return [];
      }

      if (
        localRecord.sourceRecordVersion !==
        deliveryPackageSourceVersion(sourcePackage)
      ) {
        return [];
      }

      const refinementPackageId =
        refinementPackageIdForWorkDesignPackage(sourcePackage);

      if (existingPackageIds.has(refinementPackageId)) {
        return [];
      }

      return [
        projectLocalRefinementPackage(
          sourcePackage,
          localRecord,
          refinementPackageId,
        ),
      ];
    },
  );

  return {
    ...model,
    packages: [...packages, ...refinementPackages],
  };
}

function projectLocalAppliedWorkDesignPackage(
  deliveryPackage: DeliveryPackageSummary,
  record: LocalWorkDesignApplyRecord,
): DeliveryPackageSummary {
  return {
    ...deliveryPackage,
    local_workflow_projection: {
      authority: "prototype-local",
      receipt_id: record.receiptId,
      recorded_at: record.appliedAt,
      status_label: "Done",
      summary:
        "Local Work Design apply receipt is recorded. Source package status remains unchanged until the backend projection refreshes.",
      tone: "ok",
      workflow_phase: "work_design",
    },
  };
}
