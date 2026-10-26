import type {
  DeliveryHomeAgentConsole,
  DeliveryHomeAttentionItem,
  DeliveryHomeRecentActivity,
  DeliveryHomeWorkspaceStatus,
} from "./home-types.ts";

export function getDeliveryHomeAgentConsole({
  attentionQueue,
  recentActivity,
  workspaceStatus,
}: {
  attentionQueue: DeliveryHomeAttentionItem[];
  recentActivity: DeliveryHomeRecentActivity[];
  workspaceStatus: DeliveryHomeWorkspaceStatus;
}): DeliveryHomeAgentConsole {
  const blockedCount = attentionQueue.filter(
    (item) => item.tone === "danger",
  ).length;
  const reviewCount = attentionQueue.filter(
    (item) => item.tone === "warn",
  ).length;
  const readyCount = attentionQueue.filter(
    (item) => item.tone === "info",
  ).length;

  return {
    profileLabel: "Governed Agent Console",
    statusLabel: "manual entry",
    statusTitle:
      "Open the existing Docking Agent; current owner context and provider posture are inspected there before a manual request.",
    statusTone: "info",
    transcript: [
      {
        id: "delivery-home-agent-context",
        role: "advisor",
        text: [
          "Delivery Home context loaded.",
          `workspace: ${workspaceStatus.statusLabel}`,
          `blocked routes: ${blockedCount}`,
          `review routes: ${reviewCount}`,
          `ready routes: ${readyCount}`,
          `audit events: ${recentActivity.length}`,
        ].join("\n"),
      },
      {
        id: "delivery-home-agent-boundary",
        role: "advisor",
        text: "This entry does not generate responses. The shared governed Agent owns manual assistance; workflow mutation stays with the owning surface.",
      },
    ],
  };
}
