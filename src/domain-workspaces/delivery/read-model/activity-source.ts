import {
  getDeliveryWorkspaceProjectionSnapshot,
  subscribeDeliveryWorkspaceProjection,
} from "../local-runtime/index.ts";
import { getDeliveryReadModel } from "./selectors/workflow-package-selectors.ts";

export const deliveryActivitySource = {
  auditEvents: getDeliveryReadModel().audit_events,
  getRuntimeSnapshot: getDeliveryWorkspaceProjectionSnapshot,
  subscribeRuntime: subscribeDeliveryWorkspaceProjection,
} as const;
