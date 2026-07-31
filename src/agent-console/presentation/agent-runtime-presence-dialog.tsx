"use client";

import { TerasDialog, TerasMetadataList } from "@/teras";

import {
  agentRuntimeGovernanceLabel,
  type AgentRuntimePresence,
  agentRuntimeStateLabel,
} from "../model/agent-runtime-presence";

function formatRuntimeTimestamp(value: string) {
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

function runtimeActivityLabel(runtime: AgentRuntimePresence) {
  if (runtime.state === "working") {
    return runtime.currentOperation ?? "Agent request running";
  }

  if (runtime.state === "failed") {
    return "Provider unavailable";
  }

  if (runtime.state === "waiting") {
    return "Waiting for a fresh provider observation";
  }

  return "No active request";
}

function interactionModeLabel(value: string) {
  return value === "focused"
    ? "Focus"
    : value === "workspace"
      ? "Workspace"
      : value === "general"
        ? "General"
        : value;
}

export function AgentRuntimePresenceDialog({
  onClose,
  open,
  runtime,
}: {
  onClose: () => void;
  open: boolean;
  runtime: AgentRuntimePresence | null;
}) {
  if (!runtime) {
    return null;
  }

  const stateTone =
    runtime.state === "failed"
      ? "danger"
      : runtime.state === "waiting"
        ? "warn"
        : "ok";

  return (
    <TerasDialog
      contentOverflow="auto"
      height="content"
      description="Live runtime identity, ownership, activity, and model-profile linkage."
      kicker="Agent Runtime"
      onClose={onClose}
      open={open}
      title="Runtime Details"
      width="standard"
    >
      <TerasMetadataList
        items={[
          { label: "Runtime", value: runtime.displayName },
          { label: "Runtime ID", value: runtime.runtimeId },
          {
            label: "State",
            tone: stateTone,
            value: agentRuntimeStateLabel[runtime.state],
          },
          { label: "Owner Surface", value: runtime.ownerSurface },
          {
            label: "Interaction Mode",
            value: interactionModeLabel(runtime.interactionMode),
          },
          { label: "Provider", value: runtime.provider },
          { label: "Model", value: runtime.model ?? "Unresolved" },
          {
            detail: runtime.modelProfileVersion
              ? `Version ${runtime.modelProfileVersion}`
              : undefined,
            label: "Model Profile",
            value: runtime.modelProfileRef ?? "No governed profile",
          },
          {
            label: "Governance",
            tone:
              runtime.governancePosture === "governed"
                ? "ok"
                : runtime.governancePosture === "unresolved"
                  ? "warn"
                  : "info",
            value: agentRuntimeGovernanceLabel[runtime.governancePosture],
          },
          {
            label: "Current Activity",
            value: runtimeActivityLabel(runtime),
          },
          {
            label: "Latest Invocation",
            value: runtime.invocationRef ?? "No invocation recorded",
          },
          {
            label: "Durable Run",
            value: runtime.operationRunRef ?? "No durable run",
          },
          { label: "Registration Authority", value: runtime.sourceAuthority },
          { label: "Registration Ref", value: runtime.sourceRef },
          {
            label: "Started",
            value: formatRuntimeTimestamp(runtime.startedAt),
          },
          {
            label: "Last Activity",
            value: formatRuntimeTimestamp(runtime.lastActivityAt),
          },
          {
            label: "Last Heartbeat",
            value: formatRuntimeTimestamp(runtime.lastHeartbeatAt),
          },
        ]}
      />
    </TerasDialog>
  );
}
