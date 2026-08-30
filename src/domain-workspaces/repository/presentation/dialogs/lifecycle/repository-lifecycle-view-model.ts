import type {
  TerasChoiceOption,
  TerasMetadataItem,
  TerasTone,
  TerasWizardStep,
} from "@/teras";

import type {
  RepositoryLifecycleAction,
  RepositoryLifecycleLiveSnapshot,
  RepositoryLifecycleState,
  RepositoryLifecycleWorkflowResult,
} from "../../../live-runtime/repository-lifecycle-live-types.ts";
import type { RepositoryWorkspaceRecord } from "../../../read-model/repository-workspace-read-model.ts";

export type RepositoryLifecycleStep = "action" | "review" | "result";

export const repositoryLifecycleActionLabels: Record<
  RepositoryLifecycleAction,
  string
> = {
  "archive-provider": "Archive Provider Repository",
  "restore-workspace-record": "Restore Workspace Record",
  "retire-workspace-record": "Retire Workspace Record",
  "transfer-workspace-custody": "Transfer Workspace Custody",
  "unarchive-provider": "Unarchive Provider Repository",
};

export function repositoryLifecycleState(
  repository: RepositoryWorkspaceRecord,
  snapshot?: RepositoryLifecycleLiveSnapshot,
): RepositoryLifecycleState {
  if (snapshot?.audit) return snapshot.audit.current_state;
  return {
    custody_state:
      repository.custody?.state === "provisioned" ? "provisioned" : "linked",
    custody_version: "not-projected",
    provider_lifecycle_state:
      repository.custody?.state === "archived" ? "archived" : "active",
    provider_version: null,
    workspace_owner_ref:
      repository.custody?.workspaceOwnerRef || `repo:${repository.name}`,
    workspace_record_state:
      repository.admissionState === "retired" ? "retired" : "active",
  };
}

export function repositoryLifecycleActionOptions(
  state: RepositoryLifecycleState,
): TerasChoiceOption<RepositoryLifecycleAction>[] {
  const activeRecord = state.workspace_record_state === "active";
  const retiredRecord = state.workspace_record_state === "retired";
  const activeProvider = state.provider_lifecycle_state === "active";
  const archivedProvider = state.provider_lifecycle_state === "archived";
  return [
    {
      disabled: !activeRecord,
      disabledReason: activeRecord ? undefined : "Restore the workspace record first.",
      id: "transfer-workspace-custody",
      label: repositoryLifecycleActionLabels["transfer-workspace-custody"],
      tone: "info",
    },
    {
      disabled: !activeRecord || !activeProvider,
      disabledReason: !activeRecord
        ? "Restore the workspace record first."
        : activeProvider
          ? undefined
          : "The provider repository is not active.",
      id: "archive-provider",
      label: repositoryLifecycleActionLabels["archive-provider"],
      tone: "warn",
    },
    {
      disabled: !activeRecord || !archivedProvider,
      disabledReason: !activeRecord
        ? "Restore the workspace record first."
        : archivedProvider
          ? undefined
          : "The provider repository is already active.",
      id: "unarchive-provider",
      label: repositoryLifecycleActionLabels["unarchive-provider"],
      tone: "ok",
    },
    {
      disabled: !activeRecord,
      disabledReason: activeRecord ? undefined : "The workspace record is already retired.",
      id: "retire-workspace-record",
      label: repositoryLifecycleActionLabels["retire-workspace-record"],
      tone: "danger",
    },
    {
      disabled: !retiredRecord,
      disabledReason: retiredRecord ? undefined : "The workspace record is already active.",
      id: "restore-workspace-record",
      label: repositoryLifecycleActionLabels["restore-workspace-record"],
      tone: "ok",
    },
  ];
}

export function repositoryLifecycleSteps(
  activeStep: RepositoryLifecycleStep,
  actionComplete: boolean,
  result?: RepositoryLifecycleWorkflowResult,
): TerasWizardStep[] {
  return [
    {
      available: true,
      connectsToNext: true,
      id: "action",
      label: "Action",
      stateLabel: activeStep === "action" ? "current" : "done",
      tone: activeStep === "action" ? "warn" : "ok",
    },
    {
      available: actionComplete,
      connectsToNext: false,
      id: "review",
      label: "Review",
      stateLabel:
        activeStep === "review" ? "current" : result ? "done" : "next",
      tone: activeStep === "review" ? "warn" : result ? "ok" : "muted",
    },
    {
      available: Boolean(result),
      connectsToNext: false,
      id: "result",
      label: "Result",
      stateLabel: result ? result.status : "result",
      tone: result ? repositoryLifecycleResultTone(result) : "muted",
    },
  ];
}

export function repositoryLifecycleStateFacts(
  state: RepositoryLifecycleState,
): TerasMetadataItem[] {
  return [
    { label: "Workspace Owner", value: state.workspace_owner_ref },
    { label: "Custody", value: state.custody_state },
    { label: "Provider", value: state.provider_lifecycle_state },
    { label: "Workspace Record", value: state.workspace_record_state },
  ];
}

export function repositoryLifecycleReviewFacts(
  action: RepositoryLifecycleAction,
  state: RepositoryLifecycleState,
  targetWorkspaceOwnerRef: string,
): TerasMetadataItem[] {
  return [
    { label: "Action", value: repositoryLifecycleActionLabels[action] },
    { label: "Current Owner", value: state.workspace_owner_ref },
    {
      label: "Target Owner",
      value:
        action === "transfer-workspace-custody"
          ? targetWorkspaceOwnerRef
          : "unchanged",
    },
    {
      label: "Mutation Owner",
      value: ["archive-provider", "unarchive-provider"].includes(action)
        ? "OOS provider adapter"
        : "OOS workspace lifecycle",
    },
  ];
}

export function repositoryLifecycleResultFacts(
  result: RepositoryLifecycleWorkflowResult,
): TerasMetadataItem[] {
  return [
    { label: "Status", value: result.status },
    { label: "Decision", value: result.decision.outcome },
    { label: "Next Action", value: result.next_action },
    { label: "Replay", value: result.replayed ? "replayed" : "new execution" },
    {
      label: "Receipt",
      title: result.receipt_ref?.uri,
      value: result.receipt_ref?.digest ?? "not issued",
    },
  ];
}

export function repositoryLifecycleResultTone(
  result: RepositoryLifecycleWorkflowResult,
): TerasTone {
  if (result.status === "succeeded") return "ok";
  if (result.status === "applying") return "info";
  if (result.retryable) return "warn";
  return "danger";
}
