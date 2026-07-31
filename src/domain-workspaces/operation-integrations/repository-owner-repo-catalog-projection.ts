import type { OperationOwnerRepoCatalogOption } from "../operation-contracts/owner-repository.ts";
import { repositoryWorkspaceReadModel } from "../repository/read-model/repository-workspace-read-model.ts";

export type { OperationOwnerRepoCatalogOption } from "../operation-contracts/owner-repository.ts";

export function repositoryOwnerRepoCatalogOptions(): OperationOwnerRepoCatalogOption[] {
  return repositoryWorkspaceReadModel.records
    .filter((record) => record.admissionState === "admitted")
    .map((record) => ({
      admissionState: record.admissionState,
      description: record.purpose,
      id: record.id,
      label: record.name,
      owner: record.owner,
      repoRef: record.githubUrl,
      routeSource: record.routeSource,
      valueKey: record.name,
    }));
}
