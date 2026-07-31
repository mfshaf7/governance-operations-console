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
  metadataLabel: string;
  packageRef: string;
  packageLabel: string;
  receiptLabel: string;
  timestampLabel: string;
  title: string;
  tone: DeliveryTone;
};

export type DeliveryHomeAgentTranscriptLine = {
  id: string;
  role: "advisor" | "operator";
  text: string;
};

export type DeliveryHomeAgentConsole = {
  profileLabel: string;
  statusLabel: string;
  statusTitle: string;
  statusTone: DeliveryTone;
  transcript: DeliveryHomeAgentTranscriptLine[];
};

export type DeliveryHomeViewModel = {
  agentConsole: DeliveryHomeAgentConsole;
  attentionQueue: DeliveryHomeAttentionItem[];
  recentActivity: DeliveryHomeRecentActivity[];
  workspaceStatus: DeliveryHomeWorkspaceStatus;
};
