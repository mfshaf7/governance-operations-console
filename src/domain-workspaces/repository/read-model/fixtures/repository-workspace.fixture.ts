import type { RepositoryWorkspaceReadModel } from "../../domain/repository-types.ts";
import { repositoryActiveRecords } from "./records/repository-active-records.fixture.ts";
import { repositoryContractRecords } from "./records/repository-contract-records.fixture.ts";
import { repositoryProposedRecords } from "./records/repository-proposed-records.fixture.ts";
import { repositoryRetiredRecords } from "./records/repository-retired-records.fixture.ts";
import {
  repositoryWorkspaceSource,
  repositoryWorkspaceStatus,
  repositoryWorkspaceSummary,
} from "./repository-workspace-status.fixture.ts";

export const repositoryWorkspaceFixture: RepositoryWorkspaceReadModel = {
  source: repositoryWorkspaceSource,
  summary: repositoryWorkspaceSummary,
  workspaceStatus: repositoryWorkspaceStatus,
  records: [
    ...repositoryProposedRecords,
    ...repositoryActiveRecords,
    ...repositoryContractRecords,
    ...repositoryRetiredRecords,
  ],
};
