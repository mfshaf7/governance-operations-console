import type { TerasMetadataItem } from "@/teras";

import type { RepositoryAdmissionReceipt } from "../../../local-runtime/repository-runtime.ts";
import type { RepositoryWorkspaceRecord } from "../../../read-model/repository-workspace-read-model.ts";

export function repositoryBlockerSeverityLabel(
  severity: RepositoryWorkspaceRecord["blockers"][number]["severity"],
) {
  return severity === "blocked" ? "blocking" : "review required";
}

export function repositoryBlockerDetail(
  blocker: RepositoryWorkspaceRecord["blockers"][number],
) {
  return `${blocker.detail} Required fix: ${blocker.action} Owner: ${blocker.owner}.`;
}

export function repositoryPostureGroupStateLabel(
  group: RepositoryWorkspaceRecord["admissionPosture"][number],
) {
  const states = group.items.map((item) => item.state);

  if (states.includes("blocked")) {
    return "Blocked";
  }

  if (
    states.some((state) =>
      ["missing", "pending", "ready", "review"].includes(state),
    )
  ) {
    return "Review";
  }

  if (
    states.length > 0 &&
    states.every((state) =>
      ["external", "read-only", "reference", "retired"].includes(state),
    )
  ) {
    return "Reference";
  }

  return "Clear";
}

export function repositoryPostureItemStateLabel(
  state: RepositoryWorkspaceRecord["admissionPosture"][number]["items"][number]["state"],
) {
  switch (state) {
    case "accepted-local":
      return "Accepted";
    case "blocked":
      return "Blocked";
    case "clear":
      return "Clear";
    case "external":
      return "External";
    case "missing":
      return "Needed";
    case "pending":
      return "Pending";
    case "read-only":
      return "Read Only";
    case "ready":
      return "Ready";
    case "reference":
      return "Reference";
    case "retired":
      return "Retired";
    case "review":
      return "Review";
  }
}

export function repositoryAdmissionPostureDialogProjection(
  group: RepositoryWorkspaceRecord["admissionPosture"][number] | null,
) {
  return {
    closeLabel: group
      ? `Close ${group.title} posture details`
      : "Close posture details",
    description: group?.description ?? "",
    kicker: group?.kicker ?? "Admission Posture",
    title: group?.title ?? "Posture Details",
  };
}

export function repositoryAdmissionRunPreflightMetadata(
  repository: RepositoryWorkspaceRecord,
): TerasMetadataItem[] {
  return [
    { label: "Owner", value: repository.owner },
    {
      label: "Mutation",
      value: "prototype-local admission proof",
    },
  ];
}

export function repositoryAdmissionLogMetadata(
  repository: RepositoryWorkspaceRecord,
  receipt?: RepositoryAdmissionReceipt,
): TerasMetadataItem[] {
  return [
    { label: "Repository", value: repository.name },
    { label: "Record", value: repository.id },
    { label: "Owner", value: repository.owner },
    {
      label: "Receipt",
      value: receipt?.receiptId ?? "Not recorded",
    },
    {
      label: "Result",
      value: receipt?.resultState ?? "Not started",
    },
    {
      label: "Source version",
      value: receipt?.sourceRecordVersion ?? "Not recorded",
    },
  ];
}

export function repositoryAdmissionPosturePanelProjection(
  repository: RepositoryWorkspaceRecord,
) {
  const admitted = repository.admissionState === "admitted";
  const ready = repository.admissionState === "ready";

  return {
    description: admitted
      ? "Admitted repository posture from the current control record."
      : "Admission posture groups that must be reviewed before this repository can become active in workspace governance.",
    kicker: admitted ? "Admitted Posture" : "Admission Posture",
    selected: ready,
    title: admitted ? "Repository admitted" : "Admission checks",
    tone: ready ? ("warn" as const) : repository.tone,
  };
}

export function repositoryAdmissionRunReceiptProjection(
  receipt?: RepositoryAdmissionReceipt,
) {
  return {
    description: receipt
      ? `${receipt.receiptId} recorded at ${receipt.recordedAt}.`
      : "Local admission review state until a repository workflow API exists.",
    kicker: receipt ? "Review Receipt" : "Progress Plan",
    selected: Boolean(receipt),
    statusLabel: receipt ? "Recorded" : "Waiting",
    statusTone: receipt ? ("ok" as const) : ("info" as const),
    title: receipt
      ? "Prototype-local admission review"
      : "Controls prepared by run",
    tone: receipt ? ("ok" as const) : ("info" as const),
  };
}

export function repositoryAdmissionRunPreflightProjection(
  receipt?: RepositoryAdmissionReceipt,
) {
  return {
    statusLabel: receipt ? "Complete" : "Ready",
    statusTone: receipt ? ("ok" as const) : ("warn" as const),
    tone: receipt ? ("ok" as const) : ("warn" as const),
  };
}

export function repositoryAdmissionLogPanelProjection(
  receipt?: RepositoryAdmissionReceipt,
) {
  return {
    description: receipt
      ? "Structured local run events returned an admission review receipt."
      : "Run events will appear after the local admission review starts.",
    statusLabel: receipt ? "complete" : "waiting",
    statusTone: receipt ? ("ok" as const) : ("info" as const),
    tone: receipt ? ("ok" as const) : ("info" as const),
  };
}

export function repositoryAdmissionRunSteps(
  receipt?: RepositoryAdmissionReceipt,
) {
  const done = Boolean(receipt);

  return [
    {
      detail: "Queued from Repository Control.",
      label: "Queue workflow",
    },
    {
      detail: "Owner and boundary checked.",
      label: "Validate metadata",
    },
    {
      detail:
        "Admission posture reviewed without mutating workspace contracts.",
      label: "Review admission",
    },
    {
      detail:
        "Runtime lane and security binding left as separate control facts.",
      label: "Preserve boundary",
    },
    {
      detail: "Local receipt recorded.",
      label: "Write receipt",
    },
  ].map((step, index) => ({
    ...step,
    status: done ? "done" : index === 0 ? "ready" : "pending",
    tone: done
      ? ("ok" as const)
      : index === 0
        ? ("warn" as const)
        : ("info" as const),
  }));
}

export function repositoryAdmissionRunEvents(
  _repository: RepositoryWorkspaceRecord,
  receipt?: RepositoryAdmissionReceipt,
) {
  return (receipt?.runEvents ?? []).map((event) => ({
    detail: event.summary,
    formattedTimestamp: event.occurredAt,
    marker: String(event.sequence).padStart(2, "0"),
    timestamp: event.occurredAt,
    tone:
      event.state === "blocked" || event.state === "failed"
        ? ("danger" as const)
        : event.state === "completed"
          ? ("ok" as const)
          : event.state === "running"
            ? ("warn" as const)
            : ("info" as const),
  }));
}
