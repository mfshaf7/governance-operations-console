import type {
  ProposalDecisionDraft,
  ProposalRouteSelectionDraft,
} from "./proposal-disposition-model.ts";
import type { ProposalHandoffDraft } from "./proposal-handoff-model.ts";
import type { ProposalTriageDraft } from "./proposal-triage-model.ts";

export type ProposalWorkflowCommandStep = "disposition" | "handoff" | "triage";

export type ProposalWorkflowApplyPayload =
  | {
      advisorDraft: string;
      advisorPrompt: string;
      step: "triage";
      summary: string;
    }
  | {
      decision: {
        advisorDraft: string;
        advisorPrompt: string;
        notes: string;
        outcome: ProposalDecisionDraft["outcome"];
      };
      route: {
        rationale: string;
        repoMode: ProposalRouteSelectionDraft["repoMode"];
        repoOwner: string;
        repoRef: string;
        routeTarget: ProposalRouteSelectionDraft["routeTarget"];
      } | null;
      step: "disposition";
    }
  | {
      notes: string;
      result: ProposalHandoffDraft["result"];
      step: "handoff";
    };

export function proposalTriageApplyPayload(
  draft: ProposalTriageDraft,
): ProposalWorkflowApplyPayload {
  return {
    advisorDraft: draft.advisorDraft.trim(),
    advisorPrompt: draft.advisorPrompt.trim(),
    step: "triage",
    summary: draft.summary.trim(),
  };
}

export function proposalDispositionApplyPayload({
  decisionDraft,
  routeSelectionDraft,
}: {
  decisionDraft: ProposalDecisionDraft;
  routeSelectionDraft: ProposalRouteSelectionDraft | null;
}): ProposalWorkflowApplyPayload {
  return {
    decision: {
      advisorDraft: decisionDraft.advisorDraft?.trim() ?? "",
      advisorPrompt: decisionDraft.advisorPrompt?.trim() ?? "",
      notes: decisionDraft.notes.trim(),
      outcome: decisionDraft.outcome,
    },
    route: routeSelectionDraft
      ? {
          rationale: routeSelectionDraft.rationale.trim(),
          repoMode: routeSelectionDraft.repoMode,
          repoOwner: routeSelectionDraft.repoOwner.trim(),
          repoRef: routeSelectionDraft.repoRef.trim(),
          routeTarget: routeSelectionDraft.routeTarget,
        }
      : null,
    step: "disposition",
  };
}

export function proposalHandoffApplyPayload(
  draft: ProposalHandoffDraft,
): ProposalWorkflowApplyPayload {
  return {
    notes: draft.notes.trim(),
    result: draft.result,
    step: "handoff",
  };
}

export function proposalWorkflowApplySummary(
  step: ProposalWorkflowCommandStep,
) {
  switch (step) {
    case "triage":
      return "Prototype-local Proposal triage receipt recorded.";
    case "disposition":
      return "Prototype-local Proposal disposition receipt recorded.";
    case "handoff":
      return "Prototype-local Proposal handoff receipt recorded.";
  }
}
