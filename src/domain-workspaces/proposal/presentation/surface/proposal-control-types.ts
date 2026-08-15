import type {
  ProposalDecisionDraft,
  ProposalRouteSelectionDraft,
} from "../../work-model/proposal-disposition-model.ts";
import type { ProposalHandoffDraft } from "../../work-model/proposal-handoff-model.ts";
import type { ProposalTriageDraft } from "../../work-model/proposal-triage-model.ts";
import type {
  ProposalWorkspaceScenario,
  ProposalWorkspaceSummaryMetric,
} from "../../read-model/proposal-workspace-read-model.ts";
import type { ProposalRepositoryGateResolution } from "../../../operation-integrations/proposal-repository-request-projection.ts";
import type { ProposalHubProjection } from "../hub/proposal-hub-view-model.ts";
import type { ProposalWorkflowLocalReceipt } from "../../local-runtime/proposal-runtime.ts";
import {
  proposalStatusFilterOptions,
  type ProposalIngressFilter,
  type ProposalStatusFilter,
} from "../shared/proposal-display-model.ts";
import type { OperationSurfaceStatusModel } from "../../../operation-contracts/surface-status.ts";

export type ProposalControlController = {
  capture: {
    available: boolean;
    canSubmit: boolean;
    close: () => void;
    context: string;
    onContextChange: (value: string) => void;
    onTitleChange: (value: string) => void;
    open: boolean;
    openModal: () => void;
    submit: () => Promise<void>;
    title: string;
  };
  details: {
    close: () => void;
    inspect: (proposal: ProposalWorkspaceScenario) => void;
    proposal: ProposalWorkspaceScenario | null;
  };
  filters: {
    ingress: ProposalIngressFilter;
    onIngressChange: (value: ProposalIngressFilter) => void;
    onSearchChange: (value: string) => void;
    onStatusChange: (value: ProposalStatusFilter) => void;
    search: string;
    status: ProposalStatusFilter;
    statusOptions: ReturnType<typeof proposalStatusFilterOptions>;
  };
  hub: {
    close: () => void;
    decisionDraft: ProposalDecisionDraft | null;
    handoffDraft: ProposalHandoffDraft | null;
    onApplyDispositionDraft: (drafts: {
      decisionDraft: ProposalDecisionDraft;
      routeSelectionDraft: ProposalRouteSelectionDraft | null;
    }) => Promise<void>;
    onApplyHandoffDraft: (draft: ProposalHandoffDraft) => Promise<void>;
    onApplyTriageDraft: (draft: ProposalTriageDraft) => Promise<void>;
    onChangeDecisionDraft: (draft: ProposalDecisionDraft) => void;
    onChangeHandoffDraft: (draft: ProposalHandoffDraft) => void;
    onChangeRouteSelectionDraft: (draft: ProposalRouteSelectionDraft) => void;
    onChangeTriageDraft: (draft: ProposalTriageDraft) => void;
    openSelected: () => void;
    proposal: ProposalWorkspaceScenario | null;
    repositoryGateResolution: ProposalRepositoryGateResolution | null;
    routeSelectionDraft: ProposalRouteSelectionDraft | null;
    triageDraft: ProposalTriageDraft | null;
    workflowReceipts: ProposalWorkflowLocalReceipt[];
  };
  proposals: {
    all: ProposalWorkspaceScenario[];
    filtered: ProposalWorkspaceScenario[];
  };
  register: {
    inspect: (proposal: ProposalWorkspaceScenario) => void;
    select: (proposal: ProposalWorkspaceScenario) => void;
  };
  selectedProposal: ProposalWorkspaceScenario | null;
  selectedProposalHubProjection: ProposalHubProjection | null;
  summary: ProposalWorkspaceSummaryMetric[];
  workspaceStatus: OperationSurfaceStatusModel;
};
