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
      ? "OOS reachable"
      : readiness === "offline"
        ? "OOS unreachable"
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
      description="Connection checks and open agent panels in this browser. An OOS connection does not prove that the configured model can generate a response. Model Operations owns profile approval."
      kicker="Agent Runtime"
      onClose={onClose}
      open={open}
      width="standard"
      title="Agent Runtime Status"
    >
      <TerasMetadataList
        wrap
        items={[
          { label: "Status", tone: statusTone, value: statusLabel },
          { label: "Provider Path", value: "Governed AI Gateway" },
          { label: "Configured profile", value: providerStatus?.model ?? "not resolved" },
          { label: "Probe coverage", value: "OOS reachability only; provider, profile entitlement and model generation are not probed" },
          { label: "Open agent panels", value: String(activeRuntimeCount) },
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
