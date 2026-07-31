import {
  getDeliveryAttentionItems,
  type DeliveryReadModel,
  type DeliveryTone,
} from "../../../read-model/index.ts";

import { getDeliveryHomeAgentConsole } from "./home-agent-model.ts";
import { getDeliveryHomeRecentActivity } from "./home-activity-model.ts";
import { getDeliveryHomeWorkspaceStatus } from "./home-workspace-status-model.ts";
import type { DeliveryHomeViewModel } from "./home-types.ts";

export type DeliveryHomeAttentionFilter =
  "all" | "danger" | "info" | "muted" | "warn";

export { deliveryHomeAgentResponse } from "./home-agent-model.ts";
export type {
  DeliveryHomeActionSurfaceId,
  DeliveryHomeAgentConsole,
  DeliveryHomeAgentTranscriptLine,
  DeliveryHomeAttentionItem,
  DeliveryHomeRecentActivity,
  DeliveryHomeTarget,
  DeliveryHomeViewModel,
  DeliveryHomeWorkspaceStatus,
} from "./home-types.ts";

export function deliveryHomeAttentionPanelProjection({
  filteredCount,
  totalCount,
}: {
  filteredCount: number;
  totalCount: number;
}) {
  const tone: DeliveryTone = totalCount > 0 ? "warn" : "ok";

  return {
    statusLabel: `${filteredCount}/${totalCount} shown`,
    tone,
  };
}

export const deliveryHomeAttentionFilterOptions: Array<{
  label: string;
  value: DeliveryHomeAttentionFilter;
}> = [
  { label: "All priority", value: "all" },
  { label: "Blocked", value: "danger" },
  { label: "Needs review", value: "warn" },
  { label: "Ready", value: "info" },
  { label: "Muted", value: "muted" },
];

export function deliveryHomeRecentActivityPanelProjection(eventCount: number) {
  const tone: DeliveryTone = eventCount > 0 ? "info" : "muted";

  return {
    statusLabel: `${eventCount} events`,
    tone,
  };
}

export function getDeliveryHomeViewModel(
  model: DeliveryReadModel,
): DeliveryHomeViewModel {
  const attentionQueue = getDeliveryAttentionItems(model);
  const recentActivity = getDeliveryHomeRecentActivity(model);
  const workspaceStatus = getDeliveryHomeWorkspaceStatus(model);

  return {
    agentConsole: getDeliveryHomeAgentConsole({
      attentionQueue,
      recentActivity,
      workspaceStatus,
    }),
    attentionQueue,
    recentActivity,
    workspaceStatus,
  };
}
