import type { TerasMetadataItem } from "@/teras";
import type { RepositoryWorkspaceRecord } from "../../../read-model/repository-workspace-read-model.ts";

export function repositoryBlockerSeverityLabel(
  severity: RepositoryWorkspaceRecord["blockers"][number]["severity"],
) {
  return severity === "blocked" ? "blocking" : "review required";
}

export function repositoryBlockerDetail(
  blocker: RepositoryWorkspaceRecord["blockers"][number],
) {
  return `${blocker.detail} Required fix: ${blocker.action} Responsible component: ${blocker.owner}.`;
}

export function repositoryPostureGroupStateLabel(
  group: RepositoryWorkspaceRecord["admissionPosture"][number],
) {
  if (group.statusLabel) return group.statusLabel;
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
  const setup = group?.id === "provisioning";
  const registration = group?.id === "admission";
  const provider = group?.id === "provider-state";
  return {
    closeLabel: group
      ? `Close ${group.title} posture details`
      : "Close posture details",
    description: setup
      ? "What was recorded when the repository was created or linked."
      : registration
        ? "What this record tells us about workspace registration."
        : provider
          ? "The latest available GitHub check, with earlier observations kept separate."
          : "The recorded checks for this repository.",
    kicker: "Repository record",
    title: registration ? "Workspace registration" : provider ? "GitHub status" : group?.title ?? "Record details",
    facts: group?.items.flatMap((item): TerasMetadataItem[] => {
      if (registration && item.label === "Authority revision") return [];
      let label = item.label;
      let value = item.statusLabel ?? repositoryPostureItemStateLabel(item.state);
      let detail = item.detail;
      if (setup) {
        if (item.label === "Provider identity") {
          label = "Repository identity";
          value = item.value ? "Recorded" : "Not recorded";
          detail = "The original GitHub repository ID is kept in technical details.";
        } else if (item.label === "Settings at that time") {
          label = "Setup checks";
          value = item.value === "verified" ? "Verified at setup" : value;
        } else if (item.label === "Original receipt") {
          label = "Setup confirmation";
          value = item.value ? "Recorded" : "Not recorded";
          detail = "The original confirmation reference is kept in technical details.";
        }
      } else if (registration) {
        if (item.label === "Workspace inventory") {
          label = "Workspace registration";
          value = ({ active: "Registered", retired: "Retired", suspended: "Suspended", unavailable: "Not verified" } as Record<string, string>)[item.value] ?? "Needs review";
          detail = item.value === "active" ? "This repository is included in the managed workspace."
            : item.value === "retired" ? "Its workspace record is retired. This does not indicate whether GitHub is archived."
            : item.value === "suspended" ? "Its workspace record is suspended. Review it in Workspace Registry."
            : "Workspace registration could not be verified from this record.";
        } else if (item.label === "Workspace intake") {
          label = "Registration review";
          value = item.state === "ready" ? "Available" : value;
          detail = "Review whether this repository should join the managed workspace.";
        } else if (item.label === "Active inventory") {
          label = "Workspace registration";
          detail = "This setup record does not prove that workspace registration is complete.";
        }
      } else if (provider) {
        if (item.label === "GitHub status") {
          value = item.statusLabel ?? item.value;
          detail = value === "Active" ? "The latest lookup found the repository active on GitHub."
            : value === "Archived" ? "The latest lookup found the repository archived on GitHub."
            : value === "Refreshing" ? "A GitHub lookup is in progress. Earlier observations are not current confirmation."
            : value === "Unavailable" ? "GitHub status could not be confirmed. Earlier observations remain separate."
            : "No current GitHub check is available here. Open History to check it.";
        } else if (item.label === "Earlier lookup") {
          label = "Previous observation";
          value = item.value;
          detail = "An earlier observation is retained for reference. It does not confirm the current state.";
        } else if (item.label === "Checked at") {
          const date = new Date(item.value);
          value = Number.isNaN(date.getTime()) ? "Time unavailable" : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
          detail = "Time of the GitHub response, shown in your browser’s local time. Exact time is in technical details.";
        }
      }
      return [{ label, value, detail, tone: item.tone }];
    }) ?? [],
    scope: setup ? "This is setup evidence, not a current GitHub health check. Open History for a fresh check."
      : registration ? "Workspace registration is separate from GitHub availability, deployment readiness and Security approval."
      : provider ? "A GitHub lookup does not change workspace registration or authorize repository changes." : null,
    technicalFacts: group ? [
      { label: "Original record description", value: group.description },
      ...group.items.map(item => ({ label: item.label, value: item.value,
        detail: `${item.detail} Recorded status: ${item.statusLabel ?? repositoryPostureItemStateLabel(item.state)}.` })),
    ] : [],
  };
}
