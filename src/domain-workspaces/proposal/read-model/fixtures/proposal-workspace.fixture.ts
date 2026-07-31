import type { ProposalWorkspaceReadModel } from "../../domain/proposal-types.ts";
import { proposalWorkspaceActivities } from "./proposal-activities.fixture.ts";
import { proposalWorkspaceScenarioCoverage } from "./proposal-scenario-coverage.fixture.ts";
import { proposalWorkspaceScenarios } from "./proposal-scenarios.fixture.ts";
import { proposalWorkspaceSummary } from "./proposal-summary.fixture.ts";
import { proposalWorkspaceStatus } from "./proposal-workspace-status.fixture.ts";

export const proposalWorkspaceFixture: ProposalWorkspaceReadModel = {
  activities: proposalWorkspaceActivities,
  proposals: proposalWorkspaceScenarios,
  scenarioCoverage: proposalWorkspaceScenarioCoverage,
  summary: proposalWorkspaceSummary,
  workspaceStatus: proposalWorkspaceStatus,
};
