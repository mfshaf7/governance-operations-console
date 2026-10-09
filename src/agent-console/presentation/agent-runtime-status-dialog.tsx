"use client";

import {
  TerasDialog,
  TerasMetadataList,
} from "@/teras";

import {
  agentProviderSafetyMode,
  deriveAgentProviderReadinessState,
  type AgentProviderStatus,
} from "../model/agent-provider-status";

function formatProviderTimestamp(value: string | null | undefined) {
  if (!value) {
    return "Not observed";
  }

  const timestamp = new Date(value);

  if (Number.isNaN(timestamp.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    second: "2-digit",
    year: "numeric",
  }).format(timestamp);
}

export function AgentRuntimeStatusDialog({
  activeRuntimeCount,
  onClose,
  open,
  providerStatus,
}: {
  activeRuntimeCount: number;
  onClose: () => void;
  open: boolean;
  providerStatus: AgentProviderStatus | null;
}) {
  const readiness = deriveAgentProviderReadinessState(providerStatus);
  const statusLabel =
    readiness === "online"
      ? "Online"
      : readiness === "offline"
        ? "Offline"
        : providerStatus
          ? providerStatus.observedAt
            ? "Stale"
            : "Unavailable"
          : "Probing";
  const statusTone =
    readiness === "online"
      ? "ok"
      : readiness === "offline"
        ? "danger"
        : providerStatus
          ? "warn"
          : "info";

  return (
    <TerasDialog
      contentOverflow="auto"
      height="content"
      description="Aggregate governed path connectivity and live presence for Console agent runtimes. Model profile approval remains owned by Model Operations."
      kicker="Agent Runtime"
      onClose={onClose}
      open={open}
      width="standard"
      title="Agent Runtime Status"
    >
      <TerasMetadataList
        items={[
          { label: "Status", tone: statusTone, value: statusLabel },
          { label: "Provider Path", value: "Governed AI Gateway" },
          { label: "Profile", value: providerStatus?.model ?? "not resolved" },
          { label: "Active Runtimes", value: String(activeRuntimeCount) },
          {
            label: "Request Boundary",
            value:
              providerStatus?.safetyMode === agentProviderSafetyMode
                ? "OOS session / CGG model-safe context / manual requests"
                : providerStatus?.safetyMode ?? "Probing",
          },
          {
            detail: providerStatus?.freshness ?? "No observation",
            label: "Observed",
            value: formatProviderTimestamp(providerStatus?.observedAt),
          },
          {
            label: "Last Check",
            value: formatProviderTimestamp(providerStatus?.checkedAt),
          },
          {
            label: "Profile Linkage",
            tone: "info",
            value: providerStatus?.model ?? "Not resolved",
          },
        ]}
      />
    </TerasDialog>
  );
}
