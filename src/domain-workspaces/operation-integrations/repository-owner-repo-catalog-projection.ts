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

// Live selection uses current Inventory only; the static catalogue above is for disconnected preview.
export function repositoryCurrentOwnerRepoCatalogOptions(projection: import("../../workspace-continuity/workspace-continuity-types.ts").WorkspaceContinuityProjection | null) {
  return (projection?.inventory ?? []).filter(record => record.kind === "repo" && record.posture === "active" && !record.retired_collection)
    .map(record => ({label: record.name, owner: record.record_id, value: `repo://${record.name}`}));
}
