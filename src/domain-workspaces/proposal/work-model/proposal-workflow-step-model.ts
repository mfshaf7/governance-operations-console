import type { OperationTone } from "../../operation-contracts/operation-state.ts";

import {
  proposalRouteSelectionComplete,
  proposalRouteSelectionNeedsRepositoryResolution,
} from "./proposal-disposition-model.ts";
import type {
  ProposalDecisionDraft,
  ProposalRouteSelectionDraft,
} from "./proposal-disposition-model.ts";
import type { ProposalHandoffDraft } from "./proposal-handoff-model.ts";
import type { ProposalTriageDraft } from "./proposal-triage-model.ts";
import type { ProposalWorkflowNavigationTarget } from "./proposal-workflow-navigation.ts";
import { proposalWorkflowSourceReviewRequired } from "./proposal-source-projection-model.ts";
import type { ProposalWorkspaceScenario } from "../domain/proposal-types.ts";
import type { ProposalRepositoryGateResolution } from "../../operation-contracts/proposal-repository-request.ts";

export type ProposalWorkflowActiveStep =
  "hub" | ProposalWorkflowNavigationTarget;

export type ProposalWorkflowProgressPresentation = "hub" | "workflow";

export type ProposalWorkflowStepProjection = {
  available: boolean;
  connectsToNext: boolean;
  current: boolean;
  detail: string;
  id: ProposalWorkflowNavigationTarget;
  label: string;
  stateLabel: "Archive" | "Current" | "Done" | "Locked" | "Next";
  tone: OperationTone;
};

export type ProposalWorkflowDrafts = {
  decisionDraft: ProposalDecisionDraft | null;
  handoffDraft: ProposalHandoffDraft | null;
  repositoryGateResolution?: ProposalRepositoryGateResolution | null;
  routeSelectionDraft: ProposalRouteSelectionDraft | null;
  triageDraft: ProposalTriageDraft | null;
};

type ProposalWorkflowStepBase = Omit<
  ProposalWorkflowStepProjection,
  "connectsToNext" | "current" | "detail"
> & {
  hubDetail: string;
  workflowDetail: string;
};

const proposalWorkflowStepOrder: ProposalWorkflowNavigationTarget[] = [
  "triage",
  "disposition",
  "handoff",
  "history",
];

export function proposalWorkflowProgressSteps({
  activeStep,
  drafts,
  presentation,
  proposal,
}: {
  activeStep: ProposalWorkflowActiveStep;
  drafts: ProposalWorkflowDrafts;
  presentation: ProposalWorkflowProgressPresentation;
  proposal: ProposalWorkspaceScenario;
}): ProposalWorkflowStepProjection[] {
  const baseSteps = proposalWorkflowStepBases({
    drafts,
    proposal,
  });
  const visibleSteps =
    presentation === "hub"
      ? baseSteps.filter((step) => step.id !== "history")
      : baseSteps;

  return visibleSteps.map((step, index) => {
    const nextStep = visibleSteps[index + 1];
    const workflowCurrent =
      presentation === "workflow" && activeStep !== "hub"
        ? step.id === activeStep
        : step.stateLabel === "Current";
    return {
      available: step.available,
      connectsToNext: nextStep ? nextStep.id !== "history" : false,
      current: workflowCurrent,
      detail: presentation === "hub" ? step.hubDetail : step.workflowDetail,
      id: step.id,
      label: step.label,
      stateLabel: step.stateLabel,
      tone: step.tone,
    };
  });
}

function proposalWorkflowStepBases({
  drafts,
  proposal,
}: {
  drafts: ProposalWorkflowDrafts;
  proposal: ProposalWorkspaceScenario;
}): ProposalWorkflowStepBase[] {
  const {
    decisionDraft,
    handoffDraft,
    repositoryGateResolution,
    routeSelectionDraft,
    triageDraft,
  } = drafts;
  const sourceReviewRequired = proposalWorkflowSourceReviewRequired(proposal, [
    triageDraft,
    decisionDraft,
    routeSelectionDraft,
    handoffDraft,
  ]);
  const triageRequired =
    proposal.status === "captured" || proposal.status === "waiting-on-source";
  const triageApplied = Boolean(triageDraft?.appliedAt);
  const triageSavedOnly = Boolean(
    triageDraft?.savedAt && !triageDraft.appliedAt,
  );
  const triageProjectedDone =
    !triageRequired ||
    Boolean(decisionDraft) ||
    Boolean(routeSelectionDraft) ||
    Boolean(handoffDraft);
  const triageDone = triageApplied || triageProjectedDone;
  const triageCurrent =
    sourceReviewRequired || triageSavedOnly || (!triageDone && triageRequired);

  const decisionApplied = Boolean(decisionDraft?.appliedAt);
  const decisionSavedOnly = Boolean(
    decisionDraft?.savedAt && !decisionDraft.appliedAt,
  );
  const sourceParked = proposal.status === "parked";
  const decisionProjectedDone =
    proposal.status === "ready-to-route" ||
    proposal.status === "waiting-on-repository";
  const decisionTerminal =
    decisionApplied &&
    (decisionDraft?.outcome === "parked" ||
      decisionDraft?.outcome === "rejected");
  const decisionDone = decisionApplied || decisionProjectedDone;
  const decisionCurrent =
    decisionSavedOnly ||
    (sourceParked && !decisionApplied && !sourceReviewRequired) ||
    (!decisionDone &&
      !sourceReviewRequired &&
      (triageApplied || triageProjectedDone));
  const decisionAvailable =
    decisionCurrent ||
    decisionDone ||
    Boolean(decisionDraft) ||
    (!sourceReviewRequired && triageDone);

  const decisionAccepted =
    (decisionApplied && decisionDraft?.outcome === "accepted") ||
    (!decisionDraft &&
      (proposal.status === "ready-to-route" ||
        proposal.status === "waiting-on-repository"));
  const routeSelectionApplied = Boolean(routeSelectionDraft?.appliedAt);
  const routeSelectionSavedOnly = Boolean(
    routeSelectionDraft?.savedAt && !routeSelectionDraft.appliedAt,
  );
  const routeSelectionProjectedDone =
    proposal.status === "ready-to-route" ||
    proposal.status === "waiting-on-repository";
  const routeSelectionDone =
    routeSelectionApplied || routeSelectionProjectedDone;
  const routeSelectionComplete = routeSelectionDraft
    ? proposalRouteSelectionComplete(routeSelectionDraft)
    : routeSelectionProjectedDone;
  const routeSelectionNeedsRepositoryResolution = Boolean(
    routeSelectionDraft &&
    proposalRouteSelectionNeedsRepositoryResolution(routeSelectionDraft) &&
    !repositoryGateResolution,
  );
  const routeSelectionCurrent =
    routeSelectionSavedOnly ||
    (!routeSelectionDone && decisionAccepted && !decisionTerminal);
  const routeSelectionClosesHandoff =
    (sourceParked && !decisionApplied) ||
    routeSelectionDraft?.routeTarget === "Parked" ||
    decisionTerminal;
  const routeSelectionAvailable =
    !decisionTerminal &&
    (routeSelectionCurrent ||
      routeSelectionDone ||
      Boolean(routeSelectionDraft) ||
      decisionAccepted);
  const dispositionDone =
    decisionTerminal || (decisionAccepted && routeSelectionDone);
  const dispositionCurrent =
    decisionSavedOnly ||
    routeSelectionSavedOnly ||
    decisionCurrent ||
    routeSelectionCurrent;
  const dispositionAvailable =
    decisionAvailable ||
    routeSelectionAvailable ||
    Boolean(routeSelectionDraft);
  const dispositionTone: OperationTone = dispositionDone
    ? decisionTerminal
      ? proposalDecisionStepTone(decisionDraft, proposal)
      : proposalRouteSelectionTone(routeSelectionDraft, proposal)
    : dispositionCurrent
      ? "warn"
      : "muted";

  const handoffApplied = Boolean(handoffDraft?.appliedAt);
  const handoffSavedOnly = Boolean(
    handoffDraft?.savedAt && !handoffDraft.appliedAt,
  );
  const handoffReady = handoffApplied && handoffDraft?.result === "ready";
  const handoffBlocked = handoffApplied && handoffDraft?.result === "blocked";
  const handoffProjectedCurrent =
    proposal.status === "ready-to-route" ||
    proposal.status === "waiting-on-repository";
  const handoffGateCurrent =
    routeSelectionNeedsRepositoryResolution &&
    routeSelectionDone &&
    !routeSelectionClosesHandoff;
  const handoffDone = handoffReady && proposal.status === "done";
  const handoffCurrent =
    handoffSavedOnly ||
    handoffProjectedCurrent ||
    handoffGateCurrent ||
    ((handoffBlocked || !handoffDone) &&
      !routeSelectionNeedsRepositoryResolution &&
      !routeSelectionClosesHandoff &&
      routeSelectionComplete &&
      routeSelectionDone);
  const handoffAvailable =
    !decisionTerminal &&
    !routeSelectionClosesHandoff &&
    (handoffCurrent ||
      handoffDone ||
      Boolean(handoffDraft) ||
      handoffGateCurrent ||
      (routeSelectionDone && !routeSelectionNeedsRepositoryResolution) ||
      (routeSelectionComplete && !routeSelectionNeedsRepositoryResolution) ||
      handoffProjectedCurrent);
  const receiptAvailable = true;

  return proposalWorkflowStepOrder.map((stepId) => {
    switch (stepId) {
      case "triage":
        return {
          available: true,
          hubDetail: sourceReviewRequired ? "source review" : "source",
          id: "triage",
          label: "Triage",
          stateLabel: triageCurrent ? "Current" : "Done",
          tone: triageCurrent ? "warn" : "ok",
          workflowDetail: sourceReviewRequired ? "source review" : "source",
        };
      case "disposition":
        return {
          available: dispositionAvailable,
          hubDetail: sourceReviewRequired
            ? "blocked"
            : decisionTerminal
              ? "closed"
              : "outcome + route",
          id: "disposition",
          label: "Disposition",
          stateLabel: dispositionDone
            ? "Done"
            : dispositionCurrent
              ? "Current"
              : triageCurrent
                ? "Next"
                : "Locked",
          tone: dispositionTone,
          workflowDetail: decisionTerminal ? "closed" : "outcome + route",
        };
      case "handoff":
        return {
          available: handoffAvailable,
          hubDetail: routeSelectionClosesHandoff ? "closed" : "handoff",
          id: "handoff",
          label: "Handoff",
          stateLabel: handoffDone
            ? "Done"
            : handoffCurrent
              ? "Current"
              : routeSelectionDone || routeSelectionCurrent
                ? "Next"
                : "Locked",
          tone: handoffDone
            ? handoffBlocked
              ? "warn"
              : "ok"
            : handoffCurrent || handoffSavedOnly || handoffProjectedCurrent
              ? "warn"
              : "muted",
          workflowDetail: "Route gate",
        };
      case "history":
        return {
          available: receiptAvailable,
          hubDetail: "Open the read-only receipt archive.",
          id: "history",
          label: "History",
          stateLabel: "Archive",
          tone: "info",
          workflowDetail: "Receipt archive",
        };
    }
  });
}

function proposalDecisionStepTone(
  decisionDraft: ProposalDecisionDraft | null,
  proposal: ProposalWorkspaceScenario,
): OperationTone {
  if (decisionDraft?.outcome === "parked" || proposal.status === "parked") {
    return "muted";
  }

  if (decisionDraft?.outcome === "rejected") {
    return "danger";
  }

  return "ok";
}

function proposalRouteSelectionTone(
  routeSelectionDraft: ProposalRouteSelectionDraft | null,
  proposal: ProposalWorkspaceScenario,
): OperationTone {
  if (
    routeSelectionDraft &&
    proposalRouteSelectionComplete(routeSelectionDraft)
  ) {
    return routeSelectionDraft.routeTarget === "Parked" ? "muted" : "ok";
  }

  if (
    !routeSelectionDraft &&
    (proposal.status === "ready-to-route" ||
      proposal.status === "waiting-on-repository")
  ) {
    return "ok";
  }

  return "warn";
}
