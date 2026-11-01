import type {
  DeliveryAttentionItem,
  DeliveryAttentionTarget,
  DeliveryAuditEvent,
  DeliveryTone,
} from "../../../read-model/index.ts";
import type { OperationSurfaceStatusModel } from "@/domain-workspaces/operation-projections";

import type { DeliveryWorkspaceSurfaceId } from "../../workspace/workspace-types.ts";

export type DeliveryHomeActionSurfaceId = Exclude<
  DeliveryWorkspaceSurfaceId,
  "home" | "catalog"
>;

export type DeliveryHomeTarget = DeliveryAttentionTarget;

export type DeliveryHomeWorkspaceStatus = OperationSurfaceStatusModel;

export type DeliveryHomeAttentionItem = DeliveryAttentionItem;

export type DeliveryHomeRecentActivity = {
  actor: string;
  actorLabel: string;
  category: DeliveryAuditEvent["category"];
  categoryLabel: string;
  detail: string;
  eventRef: string;
  eventId: string;
  packageRef: string;
  packageLabel: string;
  receiptLabel: string;
  timestamp: string;
  timestampLabel: string;
  title: string;
  tone: DeliveryTone;
};

export type DeliveryHomeViewModel = {
  attentionQueue: DeliveryHomeAttentionItem[];
  recentActivity: DeliveryHomeRecentActivity[];
  workspaceStatus: DeliveryHomeWorkspaceStatus;
};
