import type {
  ProposalDecisionDraft,
  ProposalRouteSelectionDraft,
} from "../../../work-model/proposal-disposition-model.ts";
import type { ProposalHandoffDraft } from "../../../work-model/proposal-handoff-model.ts";
import type { ProposalTriageDraft } from "../../../work-model/proposal-triage-model.ts";
import type { ProposalWorkspaceScenario } from "../../../read-model/proposal-workspace-read-model.ts";
import type { ProposalRepositoryGateResolution } from "../../../../operation-integrations/proposal-repository-request-projection.ts";

export type UseProposalWorkflowSessionControllerParams = {
  decisionDraft: ProposalDecisionDraft | null;
  handoffDraft: ProposalHandoffDraft | null;
  onApplyDispositionDraft: (drafts: {
    decisionDraft: ProposalDecisionDraft;
    routeSelectionDraft: ProposalRouteSelectionDraft | null;
  }) => Promise<void>;
  onApplyHandoffDraft: (draft: ProposalHandoffDraft) => Promise<void>;
  onApplyTriageDraft: (draft: ProposalTriageDraft) => Promise<void>;
  onClose: () => void;
  onInspectProposal: (proposal: ProposalWorkspaceScenario) => void;
  proposal: ProposalWorkspaceScenario | null;
  repositoryGateResolution: ProposalRepositoryGateResolution | null;
  routeSelectionDraft: ProposalRouteSelectionDraft | null;
  triageDraft: ProposalTriageDraft | null;
};
