import type {
  ProposalDecisionDraft,
  ProposalRouteSelectionDraft,
} from "../../../work-model/proposal-disposition-model.ts";
import type { ProposalWorkflowActiveStep } from "../../../work-model/proposal-workflow-step-model.ts";
import type { ProposalWorkspaceScenario } from "../../../read-model/proposal-workspace-read-model.ts";

export type ProposalWorkflowFooterMove = {
  action: string;
  disabled?: boolean;
  emphasis?: "primary" | "secondary";
  label: string;
  tone: ProposalWorkspaceScenario["tone"];
};

export function proposalWorkflowShellDescription(
  activeWorkflowStep: ProposalWorkflowActiveStep,
) {
  if (activeWorkflowStep === "disposition") {
    return "Accept, park or reject the idea. If accepted, choose its destination and repository.";
  }

  if (activeWorkflowStep === "handoff") {
    return "Check what is ready, resolve any blocker, then hand the proposal over.";
  }

  if (activeWorkflowStep === "history") {
    return "Read-only proposal history.";
  }

  if (activeWorkflowStep === "triage") {
    return "Review the idea and record a useful summary before choosing its direction.";
  }

  return "See the current status, next step and recorded history.";
}

export function proposalWorkflowShellTitle(
  activeWorkflowStep: ProposalWorkflowActiveStep,
) {
  if (activeWorkflowStep === "disposition") {
    return "Proposal Disposition";
  }

  if (activeWorkflowStep === "handoff") {
    return "Proposal Handoff";
  }

  if (activeWorkflowStep === "history") {
    return "Proposal History";
  }

  if (activeWorkflowStep === "triage") {
    return "Proposal Triage";
  }

  return "Proposal Hub";
}

export function proposalWorkflowFooterMove({
  activeDecisionDraft,
  activeRouteSelectionDraft,
  activeWorkflowStep,
  dispositionCanApply,
  dispositionReadOnly,
  dispositionStepAvailable,
  handoffStepAvailable,
  proposalComplete = false,
  sourceReviewRequired,
  triageCanApply,
  triageReadOnly,
}: {
  activeDecisionDraft: ProposalDecisionDraft;
  activeRouteSelectionDraft: ProposalRouteSelectionDraft;
  activeWorkflowStep: ProposalWorkflowActiveStep;
  dispositionCanApply: boolean;
  dispositionReadOnly: boolean;
  dispositionStepAvailable: boolean;
  handoffStepAvailable: boolean;
  proposalComplete?: boolean;
  sourceReviewRequired: boolean;
  triageCanApply: boolean;
  triageReadOnly: boolean;
}): ProposalWorkflowFooterMove | null {
  if (activeWorkflowStep === "hub") {
    return null;
  }

  if (activeWorkflowStep === "history") {
    return {
      action: "return-to-register",
      label: "Back to Register",
      tone: "ok",
    };
  }

  if (sourceReviewRequired) {
    return {
      action: "review-source-projection",
      disabled: true,
      label: "Source Update Required",
      tone: "warn",
    };
  }

  if (proposalComplete) {
    return {
      action: "view-history",
      label: "View History",
      tone: "info",
    };
  }

  if (activeWorkflowStep === "triage") {
    if (
      triageReadOnly ||
      activeDecisionDraft.appliedAt ||
      activeRouteSelectionDraft.appliedAt
    ) {
      return {
        action: "open-disposition",
        disabled: !dispositionStepAvailable,
        label: "Open Disposition",
        tone: dispositionStepAvailable ? "info" : "muted",
      };
    }

    return {
      action: "record-triage-review",
      disabled: !triageCanApply,
      label: triageCanApply
        ? "Record Triage Review"
        : "Complete Required Fields",
      tone: "warn",
    };
  }

  if (activeWorkflowStep === "disposition") {
    const dispositionClosesHandoff =
      activeDecisionDraft.outcome !== "accepted" ||
      activeRouteSelectionDraft.routeTarget === "Parked";

    if (dispositionReadOnly || activeRouteSelectionDraft.appliedAt) {
      return dispositionClosesHandoff
        ? {
            action: "view-history",
            label: "View History",
            tone: "info",
          }
        : {
            action: "open-handoff",
            disabled: !handoffStepAvailable,
            label: "Open Handoff",
            tone: handoffStepAvailable ? "info" : "muted",
          };
    }

    return {
      action: "record-disposition",
      disabled: !dispositionCanApply,
      label: dispositionCanApply
        ? "Record Disposition"
        : "Complete Required Fields",
      tone:
        activeDecisionDraft.outcome === "rejected"
          ? "danger"
          : activeDecisionDraft.outcome === "parked"
            ? "muted"
            : "warn",
    };
  }

  return {
    action: "view-history",
    label: "View History",
    tone: "info",
  };
}
