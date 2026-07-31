import type {
  DeliveryPackageSummary,
  DeliveryReadModel,
} from "../../read-model/index.ts";
import type { LocalDeliveryCloseoutRecord } from "./transition-record.ts";
import { deliveryPackageSourceVersion } from "./transition-record.ts";

export function applyLocalDeliveryCloseouts(
  model: DeliveryReadModel,
  recordsByPackage: Record<string, LocalDeliveryCloseoutRecord>,
): DeliveryReadModel {
  if (Object.keys(recordsByPackage).length === 0) {
    return model;
  }

  return {
    ...model,
    packages: model.packages.map((deliveryPackage) => {
      const record = recordsByPackage[deliveryPackage.delivery_package_id];

      if (
        !record ||
        deliveryPackage.workflow_phase !== "execution" ||
        record.sourceRecordVersion !==
          deliveryPackageSourceVersion(deliveryPackage)
      ) {
        return deliveryPackage;
      }

      return {
        ...deliveryPackage,
        local_workflow_projection: {
          authority: "prototype-local",
          receipt_id: record.closeoutReceiptRef,
          recorded_at: record.closedAt,
          status_label: "Done",
          summary:
            "Prototype-local closeout is recorded. Canonical Delivery status still requires OOS and OpenProject readback.",
          tone: "ok",
          workflow_phase: "execution",
        },
      };
    }),
  };
}
