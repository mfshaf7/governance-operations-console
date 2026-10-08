import type { TerasMetadataItem, TerasTone } from "@/teras";
import type { ProposalTargetApplicationResult } from "../../../../live-runtime/proposal-live-types.ts";

import type { ProposalRepositoryGateResolution } from "../../../../../operation-integrations/proposal-repository-request-projection.ts";
import {
  proposalRouteSelectionHasRepositoryGate,
  proposalRouteSelectionRepoModeLabel,
  proposalRouteSelectionRepoLabel,
  proposalRouteSelectionSourceCustody,
  proposalRouteSelectionSourceCustodyLabel,
  type ProposalRouteSelectionDraft,
} from "../../../../work-model/proposal-disposition-model.ts";
import {
  proposalHandoffRepositoryGateLocked,
  proposalHandoffResultCopy,
  type ProposalHandoffDraft,
} from "../../../../work-model/proposal-handoff-model.ts";

export type ProposalHandoffStepProjection = {
  canApply: boolean;
  handoffActionDescription: string;
  handoffNotesReady: boolean;
  handoffPanelTitle: string;
  handoffRecorded: boolean;
  handoffStatusLabel: string;
  handoffTone: TerasTone;
  primaryActionLabel: string;
  normalizedNotes: string;
  repositoryCueAction: string;
  repositoryCueActionTone: TerasTone;
  repositoryCueActionEmphasis: "primary" | "secondary";
  repositoryCueBody: string;
  repositoryCueState: string;
  repositoryCueTitle: string;
  repositoryCueTone: TerasTone;
  repositoryGateBlocked: boolean;
  repositoryGateLabel: string;
  repositoryGateOwner: string;
  repositoryGateRef: string;
  repositoryGateResolved: boolean;
  reviewResultDetail: string;
  reviewResultStatus: string;
  routeHasRepositoryGate: boolean;
  targetApplicationCanCancel: boolean;
  targetApplicationDetail: string;
  targetApplicationStatus: string;
  targetApplicationTone: TerasTone;
  workflowBlocked: boolean;
};

export function proposalHandoffRepositoryGateMetadata({
  proposalId,
  repositoryCueAction,
  repositoryCueState,
  repositoryGateRef,
}: {
  proposalId: string;
  repositoryCueAction: string;
  repositoryCueState: string;
  repositoryGateRef: string;
}): TerasMetadataItem[] {
  return [
    { label: "Proposal", value: proposalId },
    { label: "Required Repo", value: repositoryGateRef },
    { label: "Current State", value: repositoryCueState },
    { label: "Required Action", value: repositoryCueAction },
  ];
}

export function proposalHandoffRouteStateMetadata({
  repositoryGateLabel,
  repositoryGateOwner,
  repositoryGateResolved,
  routeSelectionDraft,
}: {
  repositoryGateLabel: string;
  repositoryGateOwner: string;
  repositoryGateResolved: boolean;
  routeSelectionDraft: ProposalRouteSelectionDraft;
}): TerasMetadataItem[] {
  const sourceCustody =
    proposalRouteSelectionSourceCustody(routeSelectionDraft);

  return [
    {
      label: "Route Target",
      value: routeSelectionDraft.routeTarget,
    },
    {
      label: "Source Custody",
      value: proposalRouteSelectionSourceCustodyLabel(sourceCustody),
    },
    { label: "Dispatch Mode", value: "Prototype-local packet" },
    { label: "Repository Gate", value: repositoryGateLabel },
    {
      label: "Repo Mode",
      value: repositoryGateResolved
        ? "Resolved repo"
        : proposalRouteSelectionRepoModeLabel(routeSelectionDraft.repoMode),
    },
    { label: "Owner Repo", value: repositoryGateOwner },
  ];
}

export function proposalHandoffStepProjection({
  draft,
  readOnly,
  repositoryGateResolution,
  routeSelectionDraft,
  targetApplication,
  targetApplicationError,
  targetApplicationPending = false,
  workflowReady,
}: {
  draft: ProposalHandoffDraft;
  readOnly: boolean;
  repositoryGateResolution?: ProposalRepositoryGateResolution | null;
  routeSelectionDraft: ProposalRouteSelectionDraft;
  targetApplication?: ProposalTargetApplicationResult | null;
  targetApplicationError?: string | null;
  targetApplicationPending?: boolean;
  workflowReady: boolean;
}): ProposalHandoffStepProjection {
  const normalizedNotes = draft.notes.trim();
  const handoffRecorded = Boolean(draft.appliedAt);
  const sourceReviewBlocked = readOnly && !handoffRecorded;
  const handoffCopy = proposalHandoffResultCopy(draft.result);
  const routeHasRepositoryGate =
    proposalRouteSelectionHasRepositoryGate(routeSelectionDraft);
  const repositoryGateResolved = Boolean(repositoryGateResolution);
  const repositoryGateBlocked = proposalHandoffRepositoryGateLocked(
    routeSelectionDraft,
    repositoryGateResolution,
  );
  const repositoryGateLabel = repositoryGateResolved
    ? "Repo Resolved"
    : proposalRouteSelectionRepoLabel(routeSelectionDraft);
  const repositoryGateOwner =
    repositoryGateResolution?.resolvedOwner ||
    routeSelectionDraft.repoOwner ||
    (routeHasRepositoryGate ? "Not resolved" : "Not required");
  const repositoryGateRef =
    repositoryGateResolution?.resolvedRepoRef ||
    routeSelectionDraft.repoRef ||
    (routeHasRepositoryGate ? "Not resolved" : "Not required");
  const workflowBlocked = !workflowReady || sourceReviewBlocked;
  const handoffNotesReady =
    !workflowBlocked && !repositoryGateBlocked && normalizedNotes.length > 0;
  const prototypeTarget = routeSelectionDraft.routeTarget === "Prototype";
  const targetTerminalFailure = new Set([
    "cancelled",
    "rejected",
    "requires-action",
  ]).has(targetApplication?.status ?? "");
  const canApply =
    !handoffRecorded &&
    !workflowBlocked &&
    !repositoryGateBlocked &&
    normalizedNotes.length > 0 &&
    !targetApplicationPending &&
    !(prototypeTarget && targetTerminalFailure);
  const handoffTone: TerasTone = handoffRecorded
    ? handoffCopy.tone
    : workflowBlocked
      ? "warn"
      : repositoryGateBlocked
        ? "warn"
        : handoffNotesReady
          ? "ok"
          : "warn";
  const handoffPanelTitle = handoffRecorded
    ? draft.result === "blocked"
      ? "Handoff Block Recorded"
      : "Handoff Review Recorded"
    : sourceReviewBlocked
      ? "Source Review Required"
      : workflowBlocked
        ? "Previous Step Incomplete"
        : repositoryGateBlocked
          ? "Handoff Locked"
          : "Apply Handoff";
  const handoffStatusLabel = handoffRecorded
    ? handoffCopy.statusLabel
    : sourceReviewBlocked
      ? "source review"
      : workflowBlocked
        ? "locked"
        : repositoryGateBlocked
          ? "locked"
          : handoffNotesReady
            ? "ready to apply"
            : "notes needed";
  const handoffActionDescription = handoffRecorded
    ? draft.result === "blocked"
      ? "Handoff block is recorded. Reopen History for review."
      : "Handoff review is recorded. Reopen History for review."
    : sourceReviewBlocked
      ? "Review the source proposal before applying Handoff."
      : workflowBlocked
        ? "Complete Triage and Disposition before applying handoff."
        : repositoryGateBlocked
          ? "Resolve the repository gate before writing notes or applying the handoff."
          : handoffNotesReady
            ? "Record the review and dispatch a prototype-local packet to the selected route."
            : "Add handoff notes before applying the handoff.";
  const repositoryCueTitle = !routeHasRepositoryGate
    ? "Repository not required"
    : repositoryGateBlocked
      ? "Resolve repository before handoff"
      : repositoryGateResolved
        ? "Repository gate resolved"
        : "Repository selected";
  const repositoryCueBody = !routeHasRepositoryGate
    ? "This route does not require repository ownership before handoff."
    : repositoryGateBlocked
      ? "The selected repository handling requires a repository decision before Proposal can apply this handoff."
      : repositoryGateResolved
        ? "Repository Control recorded the owner and repository reference. Handoff can now be applied from the gate panel."
        : "The selected owner repository is available for handoff review.";
  const repositoryCueState = !routeHasRepositoryGate
    ? "Not required"
    : repositoryGateBlocked
      ? "Blocked"
      : repositoryGateResolved
        ? "Resolved"
        : "Selected";
  const repositoryCueAction = !routeHasRepositoryGate
    ? "No repository action"
    : repositoryGateBlocked
      ? "Resolve in Repository Control"
      : "Review handoff";
  const repositoryCueTone: TerasTone = !routeHasRepositoryGate
    ? "info"
    : repositoryGateBlocked
      ? "warn"
      : "ok";
  const repositoryCueActionTone: TerasTone = repositoryGateResolved
    ? "info"
    : "warn";
  const repositoryCueActionEmphasis = repositoryGateResolved
    ? "secondary"
    : "primary";
  const targetApplicationStatus = !prototypeTarget
    ? "not required"
    : targetApplicationPending
      ? "working"
      : targetApplicationError
        ? "failed"
        : targetApplication?.status === "review-required"
          ? "review required"
          : targetApplication?.status ?? "not started";
  const targetApplicationDetail = !prototypeTarget
    ? "Delivery uses its existing target adapter."
    : targetApplicationError
      ? targetApplicationError
      : targetApplication?.status === "review-required"
        ? `${targetApplication.review?.repository ?? "workspace-prototype-studio"} #${targetApplication.review?.number ?? "?"} / ${(targetApplication.review?.head_commit ?? "head unavailable").slice(0, 12)}`
        : targetApplication?.status === "succeeded"
          ? targetApplication.target_result?.receipt.target_record_ref ??
            "Target receipt recorded"
          : targetApplication
            ? targetApplication.next_action
            : "Prepare the exact Prototype target and open its review.";
  const targetApplicationTone: TerasTone = !prototypeTarget
    ? "info"
    : targetApplicationError || targetTerminalFailure
      ? "warn"
      : targetApplication?.status === "succeeded"
        ? "ok"
        : targetApplication?.status === "review-required"
          ? "warn"
          : "info";
  const primaryActionLabel = !prototypeTarget
    ? "Apply Handoff"
    : targetApplicationPending
      ? "Working…"
      : targetApplication?.status === "review-required"
        ? "Check Target Review"
        : targetApplication?.status === "succeeded"
          ? "Target Applied"
          : targetApplication
            ? "Continue Target Application"
            : "Start Target Application";

  return {
    canApply,
    handoffActionDescription,
    handoffNotesReady,
    handoffPanelTitle,
    handoffRecorded,
    handoffStatusLabel,
    handoffTone,
    primaryActionLabel,
    normalizedNotes,
    repositoryCueAction,
    repositoryCueActionTone,
    repositoryCueActionEmphasis,
    repositoryCueBody,
    repositoryCueState,
    repositoryCueTitle,
    repositoryCueTone,
    repositoryGateBlocked,
    repositoryGateLabel,
    repositoryGateOwner,
    repositoryGateRef,
    repositoryGateResolved,
    reviewResultDetail: handoffCopy.handoff,
    reviewResultStatus: handoffCopy.statusLabel,
    routeHasRepositoryGate,
    targetApplicationCanCancel:
      prototypeTarget &&
      !targetApplicationPending &&
      new Set(["accepted", "preparing", "review-required"]).has(
        targetApplication?.status ?? "",
      ),
    targetApplicationDetail,
    targetApplicationStatus,
    targetApplicationTone,
    workflowBlocked,
  };
}
