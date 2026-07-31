import type { TerasMetadataItem, TerasTone } from "@/teras";

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
  workflowReady,
}: {
  draft: ProposalHandoffDraft;
  readOnly: boolean;
  repositoryGateResolution?: ProposalRepositoryGateResolution | null;
  routeSelectionDraft: ProposalRouteSelectionDraft;
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
  const canApply =
    !handoffRecorded &&
    !workflowBlocked &&
    !repositoryGateBlocked &&
    normalizedNotes.length > 0;
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

  return {
    canApply,
    handoffActionDescription,
    handoffNotesReady,
    handoffPanelTitle,
    handoffRecorded,
    handoffStatusLabel,
    handoffTone,
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
    workflowBlocked,
  };
}
