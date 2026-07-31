import type { OperationTone } from "../../operation-contracts/operation-state.ts";

import type { ProposalRepositoryGateResolution } from "../../operation-contracts/proposal-repository-request.ts";
import type { ProposalWorkspaceScenario } from "../domain/proposal-types.ts";
import {
  proposalRouteSelectionHasRepositoryGate,
  type ProposalRouteSelectionDraft,
} from "./proposal-disposition-model.ts";
import type { ProposalWorkflowSourceStampedDraft } from "./proposal-source-projection-model.ts";

export type ProposalHandoffResult = "blocked" | "ready";

export type ProposalHandoffDraft = ProposalWorkflowSourceStampedDraft & {
  notes: string;
  proposalId: string;
  result: ProposalHandoffResult;
};

export function proposalHandoffDraftFromProposal(
  proposal: ProposalWorkspaceScenario,
  routeSelectionDraft: ProposalRouteSelectionDraft,
  draft?: ProposalHandoffDraft | null,
  repositoryGateResolution?: ProposalRepositoryGateResolution | null,
): ProposalHandoffDraft {
  if (draft) {
    return draft;
  }

  const projectedHandoffState =
    proposal.status === "ready-to-route" ||
    proposal.status === "waiting-on-repository";

  return {
    notes: projectedHandoffState
      ? proposal.handoffRule
      : routeSelectionDraft.appliedAt || routeSelectionDraft.rationale.trim()
        ? routeSelectionDraft.rationale
        : "",
    proposalId: proposal.id,
    result: proposalHandoffResultForProposal(
      proposal,
      routeSelectionDraft,
      repositoryGateResolution,
    ),
  };
}

export function proposalHandoffRepositoryGateLocked(
  routeSelectionDraft: ProposalRouteSelectionDraft,
  repositoryGateResolution?: ProposalRepositoryGateResolution | null,
) {
  if (!proposalRouteSelectionHasRepositoryGate(routeSelectionDraft)) {
    return false;
  }

  if (routeSelectionDraft.repoMode === "new") {
    return !repositoryGateResolution;
  }

  return !(
    routeSelectionDraft.repoOwner.trim() && routeSelectionDraft.repoRef.trim()
  );
}

export function proposalHandoffResultForProposal(
  proposal: ProposalWorkspaceScenario,
  routeSelectionDraft?: ProposalRouteSelectionDraft,
  repositoryGateResolution?: ProposalRepositoryGateResolution | null,
): ProposalHandoffResult {
  const repositoryGateResolved = Boolean(repositoryGateResolution);

  if (routeSelectionDraft) {
    if (routeSelectionDraft.routeTarget === "Parked") {
      return "blocked";
    }

    if (
      proposalHandoffRepositoryGateLocked(
        routeSelectionDraft,
        repositoryGateResolution,
      )
    ) {
      return "blocked";
    }
  }

  if (
    !repositoryGateResolved &&
    (proposal.status === "waiting-on-repository" ||
      proposal.repoGate.state === "blocked")
  ) {
    return "blocked";
  }

  return "ready";
}

export function proposalHandoffResultCopy(result: ProposalHandoffResult): {
  handoff: string;
  label: string;
  statusLabel: string;
  title: string;
  tone: OperationTone;
} {
  switch (result) {
    case "blocked":
      return {
        handoff: "Locked",
        label: "blocked",
        statusLabel: "blocked",
        title: "Handoff Blocked",
        tone: "warn",
      };
    case "ready":
      return {
        handoff: "Review clear",
        label: "review",
        statusLabel: "clear",
        title: "Handoff Review",
        tone: "ok",
      };
  }
}
