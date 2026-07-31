import {
  proposalDecisionDraftFromProposal,
  proposalRouteSelectionComplete,
  proposalRouteSelectionDraftFromProposal,
  type ProposalDecisionDraft,
  type ProposalRouteSelectionDraft,
} from "../../../work-model/proposal-disposition-model.ts";
import {
  proposalHandoffDraftFromProposal,
  proposalHandoffRepositoryGateLocked,
  type ProposalHandoffDraft,
} from "../../../work-model/proposal-handoff-model.ts";
import { proposalWorkflowSourceReviewRequired } from "../../../work-model/proposal-source-projection-model.ts";
import {
  proposalWorkflowProgressSteps,
  type ProposalWorkflowActiveStep,
  type ProposalWorkflowDrafts,
} from "../../../work-model/proposal-workflow-step-model.ts";
import {
  proposalTriageDraftFromProposal,
  type ProposalTriageDraft,
} from "../../../work-model/proposal-triage-model.ts";
import type { ProposalWorkspaceScenario } from "../../../read-model/proposal-workspace-read-model.ts";
import type { ProposalRepositoryGateResolution } from "../../../../operation-integrations/proposal-repository-request-projection.ts";
import { proposalHubProjection } from "../../hub/proposal-hub-view-model.ts";
import { proposalWorkflowFooterMove } from "./proposal-workflow-session-view-model.ts";

export type ProposalWorkflowSessionState = ReturnType<
  typeof proposalWorkflowSessionState
>;

export function proposalWorkflowSessionState({
  activeWorkflowStep,
  decisionDraft,
  handoffDraft,
  proposal,
  repositoryGateResolution,
  routeSelectionDraft,
  triageDraft,
}: {
  activeWorkflowStep: ProposalWorkflowActiveStep;
  decisionDraft: ProposalDecisionDraft | null;
  handoffDraft: ProposalHandoffDraft | null;
  proposal: ProposalWorkspaceScenario;
  repositoryGateResolution: ProposalRepositoryGateResolution | null;
  routeSelectionDraft: ProposalRouteSelectionDraft | null;
  triageDraft: ProposalTriageDraft | null;
}) {
  const activeTriageDraft = proposalTriageDraftFromProposal(
    proposal,
    triageDraft,
  );
  const activeDecisionDraft = proposalDecisionDraftFromProposal(
    proposal,
    decisionDraft,
  );
  const activeRouteSelectionDraft = proposalRouteSelectionDraftFromProposal(
    proposal,
    routeSelectionDraft,
  );
  const activeHandoffDraft = proposalHandoffDraftFromProposal(
    proposal,
    activeRouteSelectionDraft,
    handoffDraft,
    repositoryGateResolution,
  );
  const workflowDrafts: ProposalWorkflowDrafts = {
    decisionDraft,
    handoffDraft,
    repositoryGateResolution,
    routeSelectionDraft,
    triageDraft,
  };
  const hubProjection = proposalHubProjection(
    proposal,
    triageDraft,
    decisionDraft,
    routeSelectionDraft,
    handoffDraft,
    repositoryGateResolution,
  );
  const progressSteps = proposalWorkflowProgressSteps({
    activeStep: activeWorkflowStep,
    drafts: workflowDrafts,
    presentation: "workflow",
    proposal,
  });
  const sourceReviewRequired = proposalWorkflowSourceReviewRequired(proposal, [
    triageDraft,
    decisionDraft,
    routeSelectionDraft,
    handoffDraft,
  ]);
  const triageReadOnly = Boolean(
    sourceReviewRequired ||
    activeTriageDraft.appliedAt ||
    (!triageDraft &&
      proposal.status !== "captured" &&
      proposal.status !== "waiting-on-source"),
  );
  const dispositionReadOnly = Boolean(
    sourceReviewRequired ||
    (activeDecisionDraft.appliedAt &&
      (activeDecisionDraft.outcome !== "accepted" ||
        activeRouteSelectionDraft.appliedAt)) ||
    (!decisionDraft &&
      !routeSelectionDraft &&
      (proposal.status === "ready-to-route" ||
        proposal.status === "waiting-on-repository")),
  );
  const handoffReadOnly = Boolean(
    sourceReviewRequired || activeHandoffDraft.appliedAt,
  );
  const handoffRepositoryGateLocked = proposalHandoffRepositoryGateLocked(
    activeRouteSelectionDraft,
    repositoryGateResolution,
  );
  const triageCanApply =
    !sourceReviewRequired &&
    !triageReadOnly &&
    activeTriageDraft.summary.trim().length > 0;
  const dispositionCanApply =
    !dispositionReadOnly &&
    activeDecisionDraft.notes.trim().length > 0 &&
    (activeDecisionDraft.outcome !== "accepted" ||
      proposalRouteSelectionComplete(activeRouteSelectionDraft));
  const dispositionStepAvailable =
    progressSteps.find((step) => step.id === "disposition")?.available ?? false;
  const handoffStepAvailable =
    progressSteps.find((step) => step.id === "handoff")?.available ?? false;
  const handoffCanApply =
    !handoffReadOnly &&
    handoffStepAvailable &&
    !handoffRepositoryGateLocked &&
    activeHandoffDraft.notes.trim().length > 0;
  const hasPendingDispositionDraft = Boolean(
    activeWorkflowStep === "disposition" &&
    ((activeDecisionDraft.savedAt && !activeDecisionDraft.appliedAt) ||
      (activeRouteSelectionDraft.savedAt &&
        !activeRouteSelectionDraft.appliedAt)),
  );
  const hasPendingHandoffDraft = Boolean(
    activeWorkflowStep === "handoff" &&
    activeHandoffDraft.savedAt &&
    !activeHandoffDraft.appliedAt,
  );
  const hasPendingTriageDraft = Boolean(
    activeWorkflowStep === "triage" &&
    activeTriageDraft.savedAt &&
    !activeTriageDraft.appliedAt,
  );
  const footerMove = proposalWorkflowFooterMove({
    activeDecisionDraft,
    activeRouteSelectionDraft,
    activeWorkflowStep,
    dispositionCanApply,
    dispositionReadOnly,
    dispositionStepAvailable,
    handoffStepAvailable,
    sourceReviewRequired,
    triageCanApply,
    triageReadOnly,
  });

  return {
    activeDecisionDraft,
    activeHandoffDraft,
    activeRouteSelectionDraft,
    activeTriageDraft,
    dispositionCanApply,
    dispositionReadOnly,
    dispositionStepAvailable,
    footerMove,
    handoffCanApply,
    handoffReadOnly,
    handoffStepAvailable,
    hasPendingDispositionDraft,
    hasPendingHandoffDraft,
    hasPendingTriageDraft,
    hubProjection,
    progressSteps,
    sourceReviewRequired,
    triageCanApply,
    triageReadOnly,
  };
}
