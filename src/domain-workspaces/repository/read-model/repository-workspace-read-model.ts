import { repositoryWorkspaceFixture } from "./fixtures/repository-workspace.fixture.ts";
import type { RepositoryWorkspaceReadModel } from "../domain/repository-types.ts";

export type {
  RepositoryAdmissionState,
  RepositoryWorkspacePostureGroup,
  RepositoryWorkspacePostureItem,
  RepositoryWorkspacePostureItemState,
  RepositoryWorkspaceProposalGate,
  RepositoryWorkspaceReadModel,
  RepositoryWorkspaceRecord,
  RepositoryWorkspaceRecordBlocker,
  RepositoryWorkspaceRecordTone,
  RepositoryWorkspaceRuntimeLane,
  RepositoryWorkspaceRuntimeLaneStatus,
  RepositoryWorkspaceSecurityBinding,
  RepositoryWorkspaceSecurityBindingStatus,
  RepositoryWorkspaceSummaryMetric,
} from "../domain/repository-types.ts";

export {
  repositoryRuntimeLaneStatusLabel,
  repositorySecurityBindingStatusLabel,
} from "./repository-workspace-labels.ts";

export const repositoryWorkspaceReadModel: RepositoryWorkspaceReadModel =
  repositoryWorkspaceFixture;
