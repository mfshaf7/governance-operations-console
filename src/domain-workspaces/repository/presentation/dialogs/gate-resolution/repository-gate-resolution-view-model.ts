import type { TerasMetadataItem } from "@/teras";
import { repositoryOwnerRepoCatalogOptions } from "@/domain-workspaces/operation-integrations/repository-owner-repo-catalog-projection";

import type { RepositoryWorkspaceRecord } from "../../../read-model/repository-workspace-read-model.ts";
import {
  repositoryGateResolutionCatalogMatch,
  repositoryGateResolutionCatalogOptions,
  repositoryGateResolutionDraftComplete,
  repositoryGateResolutionInitialDraft,
  repositoryGateResolutionSelection,
  type RepositoryGateResolutionDraft,
} from "../../../work-model/gate-resolution/repository-gate-resolution-model.ts";

export type { RepositoryGateResolutionDraft };

const ownerRepositories = () => repositoryOwnerRepoCatalogOptions();

export function repositoryGateResolutionOptions() {
  return repositoryGateResolutionCatalogOptions(ownerRepositories());
}

export function repositoryGateResolutionDraftFromRepository(
  repository: RepositoryWorkspaceRecord | null,
) {
  return repositoryGateResolutionInitialDraft(repository, ownerRepositories());
}

export function repositoryGateResolutionOption(repoRef: string) {
  return repositoryGateResolutionSelection(repoRef, ownerRepositories());
}

export function repositoryGateProjectedRequestMetadata(
  repository: RepositoryWorkspaceRecord,
): TerasMetadataItem[] {
  return [
    {
      label: "Proposal",
      value: repository.proposalGate?.proposalId ?? "Unknown",
    },
    {
      label: "Request Ref",
      value: repository.proposalGate?.repoRequestRef ?? repository.githubUrl,
    },
    { label: "Source", value: repository.routeSource },
    { label: "Current Owner", value: repository.owner },
  ];
}

export function repositoryGateResolutionProjection({
  draft,
  repository,
}: {
  draft: RepositoryGateResolutionDraft;
  repository: RepositoryWorkspaceRecord | null;
}) {
  const selectedRepo = repositoryGateResolutionCatalogMatch(
    draft,
    ownerRepositories(),
  );
  const ownerResolved = Boolean(selectedRepo);
  const repoRefResolved = Boolean(selectedRepo);
  const canRecord = repositoryGateResolutionDraftComplete({
    draft,
    ownerRepositories: ownerRepositories(),
    repository,
  });

  return {
    canRecord,
    ownerDetail: ownerResolved ? draft.resolvedOwner.trim() : "owner needed",
    ownerStatusLabel: ownerResolved ? "selected" : "needed",
    ownerTone: ownerResolved ? ("ok" as const) : ("warn" as const),
    receiptStatusLabel: canRecord ? "Ready" : "Incomplete",
    receiptTone: canRecord ? ("ok" as const) : ("warn" as const),
    repoRefDetail: repoRefResolved
      ? draft.resolvedRepoRef.trim()
      : "repo ref needed",
    repoRefStatusLabel: repoRefResolved ? "selected" : "needed",
    repoRefTone: repoRefResolved ? ("ok" as const) : ("warn" as const),
  };
}
