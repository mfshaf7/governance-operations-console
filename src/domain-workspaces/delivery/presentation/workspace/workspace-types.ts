import type { DeliveryTone, DeliveryWorkflowPhase } from "../../read-model/index.ts";

export type DeliverySurfaceId =
  "execution-board" | "intake" | "refinement" | "work-design";

export type DeliveryWorkspaceSurfaceId = "home" | DeliverySurfaceId | "catalog";

export type DeliverySurfaceConfig = {
  description: string;
  id: DeliverySurfaceId;
  kicker: string;
  workflowPhase?: DeliveryWorkflowPhase;
  title: string;
  tone: DeliveryTone;
};

export type DeliveryWorkspaceSurfaceConfig = {
  description: string;
  id: DeliveryWorkspaceSurfaceId;
  kicker: string;
  workflowPhase?: DeliveryWorkflowPhase;
  title: string;
  tone: DeliveryTone;
};

export type DeliveryPackageRegisterFocus = {
  packageId: string;
  surfaceId: Extract<DeliverySurfaceId, "refinement" | "work-design">;
  token: number;
};
