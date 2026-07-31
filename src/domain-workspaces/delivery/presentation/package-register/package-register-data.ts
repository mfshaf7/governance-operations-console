import type {
  DeliveryPackageSummary,
  DeliveryReadModel,
} from "../../read-model/index.ts";
import { getDeliveryPackagesByWorkflowPhase } from "../../read-model/index.ts";

import type { DeliverySurfaceConfig } from "../workspace/workspace-types.ts";
import type { DeliveryPackageRegisterPackage } from "./package-register-types.ts";
import { projectWorkDesignRegisterPackage } from "../workflows/work-design/index.ts";
import type { WorkDesignPersistedSession } from "../workflows/work-design/model/work-design-model.ts";

export function getDeliveryPackageRegisterPackages({
  model,
  surface,
  workDesignSessionForPackage,
}: {
  model: DeliveryReadModel;
  surface: DeliverySurfaceConfig;
  workDesignSessionForPackage: (
    deliveryPackageId: string,
  ) => WorkDesignPersistedSession | null;
}): DeliveryPackageRegisterPackage[] {
  if (!surface.workflowPhase) {
    return [];
  }

  return getDeliveryPackagesByWorkflowPhase(surface.workflowPhase, model).map(
    (deliveryPackage) =>
      projectDeliveryPackageRegisterPackage(
        surface,
        deliveryPackage,
        workDesignSessionForPackage(deliveryPackage.delivery_package_id),
      ),
  );
}

export function projectDeliveryPackageRegisterPackage(
  surface: DeliverySurfaceConfig,
  deliveryPackage: DeliveryPackageSummary,
  workDesignSession: WorkDesignPersistedSession | null,
): DeliveryPackageRegisterPackage {
  switch (surface.id) {
    case "work-design":
      return projectWorkDesignRegisterPackage(
        deliveryPackage,
        workDesignSession,
      );
    case "refinement":
      return deliveryPackage;
    default:
      return deliveryPackage;
  }
}
