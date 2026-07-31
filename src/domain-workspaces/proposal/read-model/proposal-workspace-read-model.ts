import { proposalWorkspaceFixture } from "./fixtures/proposal-workspace.fixture.ts";
import type { ProposalWorkspaceReadModel } from "../domain/proposal-types.ts";

export type {
  ProposalIngressKind,
  ProposalWorkspaceActivityItem,
  ProposalWorkspaceReadModel,
  ProposalWorkspaceScenario,
  ProposalWorkspaceScenarioCoverage,
  ProposalWorkspaceScenarioEvidence,
  ProposalWorkspaceScenarioKind,
  ProposalWorkspaceScenarioStatus,
  ProposalWorkspaceSummaryMetric,
} from "../domain/proposal-types.ts";

export const proposalWorkspaceReadModel: ProposalWorkspaceReadModel =
  proposalWorkspaceFixture;
