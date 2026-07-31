import type {
  DeliveryHomeAgentConsole,
  DeliveryHomeAttentionItem,
  DeliveryHomeRecentActivity,
  DeliveryHomeViewModel,
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
    profileLabel: "Delivery Home Agent",
    statusLabel: "mock profile",
    statusTitle:
      "Target profile: governed Delivery Home reasoning model locked to read-model projection. Mock only until authoritative profile truth reports it active.",
    statusTone: "warn",
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
        text: "I can summarize Home routing from the projected read model. Workflow mutation and blocker disposition stay with the owning surface.",
      },
    ],
  };
}

export function deliveryHomeAgentResponse({
  prompt,
  viewModel,
}: {
  prompt: string;
  viewModel: DeliveryHomeViewModel;
}) {
  const normalizedPrompt = prompt.toLowerCase();
  const blockedItems = viewModel.attentionQueue.filter(
    (item) => item.tone === "danger",
  );
  const latestActivity = viewModel.recentActivity[0];

  if (normalizedPrompt.includes("block")) {
    return [
      `${blockedItems.length} unique blocked route(s) are in Attention after intake source/package dedupe.`,
      blockedItems
        .slice(0, 4)
        .map((item) => `- ${item.label}: ${item.title}`)
        .join("\n"),
    ].join("\n");
  }

  if (
    normalizedPrompt.includes("activity") ||
    normalizedPrompt.includes("audit") ||
    normalizedPrompt.includes("receipt")
  ) {
    return latestActivity
      ? `Latest projected activity: ${latestActivity.categoryLabel} ${latestActivity.eventRef} on ${latestActivity.packageRef}; receipt ${latestActivity.receiptLabel}.`
      : "No Delivery audit activity is projected for Home.";
  }

  if (normalizedPrompt.includes("status")) {
    return `${viewModel.workspaceStatus.title}. ${viewModel.workspaceStatus.summary}`;
  }

  return [
    "Home is routing work through Workspace Status, Attention, Recent Activity, and this locked agent console.",
    `${blockedItems.length} blocked route(s), ${viewModel.recentActivity.length} audit event(s), workspace status ${viewModel.workspaceStatus.statusLabel}.`,
  ].join("\n");
}
