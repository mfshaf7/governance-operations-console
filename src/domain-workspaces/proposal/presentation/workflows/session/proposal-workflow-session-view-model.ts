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
    return "Record the proposal outcome, route, and repository handling in one workflow step.";
  }

  if (activeWorkflowStep === "handoff") {
    return "Review route gate and record the handoff review or block.";
  }

  if (activeWorkflowStep === "history") {
    return "Read-only proposal history.";
  }

  if (activeWorkflowStep === "triage") {
    return "Source review step before bounded disposition.";
  }

  return "Selected proposal workflow hub for status, progress, and history access.";
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
