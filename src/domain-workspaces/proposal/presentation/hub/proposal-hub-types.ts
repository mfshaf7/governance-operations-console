import type { ProposalWorkflowStepProjection } from "../../work-model/proposal-workflow-step-model.ts";
import type { ProposalWorkspaceScenario } from "../../read-model/proposal-workspace-read-model.ts";

export type ProposalHubActionTarget =
  "disposition" | "details" | "handoff" | "history" | "triage";

export type ProposalHubMove = {
  buttonLabel: string;
  description: string;
  statusTitle: string;
  target: ProposalHubActionTarget;
  title: string;
  tone: ProposalWorkspaceScenario["tone"];
};

export type ProposalHubProjection = {
  currentMove: ProposalHubMove;
  history: {
    actionDisabled: boolean;
    actionLabel: string;
    description: string;
    title: string;
    tone: ProposalWorkspaceScenario["tone"];
  };
  progressDescription: string;
  status: {
    description: string;
    facts: Array<{ label: string; value: string }>;
    pillLabel: string;
    title: string;
    tone: ProposalWorkspaceScenario["tone"];
  };
  steps: ProposalWorkflowStepProjection[];
};
