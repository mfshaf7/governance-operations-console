import type { DeliveryPackageSummary } from "../../../../read-model/index.ts";

export type * from "../../../../work-model/refinement/refinement-types.ts";

export type DeliveryRefinementWorkflow = {
  deliveryPackage: DeliveryPackageSummary;
};
