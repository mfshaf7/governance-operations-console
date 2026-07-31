import type { DeliveryPackageSummary } from "../../../../read-model/index.ts";

import type { DeliverySurfaceConfig } from "../../../workspace/workspace-types.ts";

export type DeliveryPackageActionRoute = "refinement" | "work-design";

export type DeliveryPackageActionState = {
  deliveryPackage: DeliveryPackageSummary;
  route: DeliveryPackageActionRoute;
  surface: DeliverySurfaceConfig;
};
