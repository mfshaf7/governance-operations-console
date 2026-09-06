import type { TerasChoiceOption, TerasTone } from "@/teras";

import type {
  WorkspaceInventoryLifecycleAction,
  WorkspaceInventoryLifecycleResult,
  WorkspaceRegistryRecord,
} from "../model/workspace-registry-types";

export const workspaceInventoryLifecycleActionLabels = {
  restore: "Restore Record",
  retire: "Retire Record",
  suspend: "Suspend Record",
  update: "Update Metadata",
} as const satisfies Record<WorkspaceInventoryLifecycleAction, string>;

export function workspaceInventoryLifecycleActionOptions(
  posture: WorkspaceRegistryRecord["posture"],
): TerasChoiceOption<WorkspaceInventoryLifecycleAction>[] {
  return [
    {
      disabled: posture === "retired",
      disabledReason: "Retired records must be restored before metadata changes.",
      id: "update",
      label: workspaceInventoryLifecycleActionLabels.update,
      tone: "info",
    },
    {
      disabled: posture !== "active",
      disabledReason: "Only active records can be suspended.",
      id: "suspend",
      label: workspaceInventoryLifecycleActionLabels.suspend,
      tone: "warn",
    },
    {
      disabled: posture === "active",
      disabledReason: "Only suspended or retired records can be restored.",
      id: "restore",
      label: workspaceInventoryLifecycleActionLabels.restore,
      tone: "ok",
    },
    {
      disabled: posture === "retired",
      disabledReason: "This record is already retired.",
      id: "retire",
      label: workspaceInventoryLifecycleActionLabels.retire,
      tone: "danger",
    },
  ];
}

export function defaultWorkspaceInventoryLifecycleAction(
  posture: WorkspaceRegistryRecord["posture"],
): WorkspaceInventoryLifecycleAction {
  return posture === "retired" ? "restore" : "update";
}

export function workspaceInventoryLifecycleNextPosture(
  action: WorkspaceInventoryLifecycleAction,
  posture: WorkspaceRegistryRecord["posture"],
) {
  if (action === "suspend") return "suspended";
  if (action === "restore") return "active";
  if (action === "retire") return "retired";
  return posture;
}

export function workspaceInventoryLifecycleResultTone(
  result: WorkspaceInventoryLifecycleResult,
): TerasTone {
  if (result.status === "succeeded") return "ok";
  if (result.status === "blocked" || result.status === "rejected" || result.failure) {
    return "danger";
  }
  if (result.status === "stale" || result.status === "review-required") {
    return "warn";
  }
  return "info";
}
