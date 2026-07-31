import type { ProposalWorkspaceScenario } from "../domain/proposal-types.ts";
import type { ProposalWorkflowSourceStampedDraft } from "./proposal-source-projection-model.ts";

export type ProposalTriageDraft = ProposalWorkflowSourceStampedDraft & {
  advisorDraft: string;
  advisorPrompt: string;
  proposalId: string;
  summary: string;
};

export function proposalTriageDraftFromProposal(
  proposal: ProposalWorkspaceScenario,
  draft?: ProposalTriageDraft | null,
): ProposalTriageDraft {
  if (draft) {
    return draft;
  }

  return {
    advisorDraft: "",
    advisorPrompt: "",
    proposalId: proposal.id,
    summary:
      proposal.status === "captured"
        ? ""
        : `${proposalTriageStatusLabel(proposal.status)}: ${proposal.bodyPreview}`,
  };
}

function proposalTriageStatusLabel(
  status: ProposalWorkspaceScenario["status"],
) {
  return status
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
