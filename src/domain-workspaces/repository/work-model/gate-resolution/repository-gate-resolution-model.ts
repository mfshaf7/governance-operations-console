import type { OperationOwnerRepoCatalogOption } from "../../../operation-contracts/owner-repository.ts";

import type { RepositoryWorkspaceRecord } from "../../domain/repository-types.ts";

export type RepositoryGateResolutionDraft = {
  notes: string;
  resolvedOwner: string;
  resolvedRepoRef: string;
};

export function repositoryGateResolutionCatalogOptions(
  ownerRepositories: readonly OperationOwnerRepoCatalogOption[],
) {
  return ownerRepositories.map((repo) => ({
    label: `${repo.label} / ${repo.owner}`,
    owner: repo.owner,
    repoRef: repo.repoRef,
    value: repo.repoRef,
  }));
}

export function repositoryGateResolutionCatalogMatch(
  draft: Pick<
    RepositoryGateResolutionDraft,
    "resolvedOwner" | "resolvedRepoRef"
  >,
  ownerRepositories: readonly OperationOwnerRepoCatalogOption[],
) {
  const owner = draft.resolvedOwner.trim();
  const repoRef = draft.resolvedRepoRef.trim();

  return (
    repositoryGateResolutionCatalogOptions(ownerRepositories).find(
      (option) => option.owner === owner && option.repoRef === repoRef,
    ) ?? null
  );
}

export function repositoryGateResolutionSelection(
  repoRef: string,
  ownerRepositories: readonly OperationOwnerRepoCatalogOption[],
) {
  return (
    repositoryGateResolutionCatalogOptions(ownerRepositories).find(
      (option) => option.repoRef === repoRef,
    ) ?? null
  );
}

export function repositoryGateResolutionInitialDraft(
  repository: RepositoryWorkspaceRecord | null,
  ownerRepositories: readonly OperationOwnerRepoCatalogOption[],
): RepositoryGateResolutionDraft {
  const selected = repository?.proposalGate?.resolvedRepoRef
    ? repositoryGateResolutionSelection(
        repository.proposalGate.resolvedRepoRef,
        ownerRepositories,
      )
    : null;

  return {
    notes: "",
    resolvedOwner: selected?.owner ?? "",
    resolvedRepoRef: selected?.repoRef ?? "",
  };
}

export function repositoryGateResolutionDraftComplete({
  draft,
  ownerRepositories,
  repository,
}: {
  draft: RepositoryGateResolutionDraft;
  ownerRepositories: readonly OperationOwnerRepoCatalogOption[];
  repository: RepositoryWorkspaceRecord | null;
}) {
  return Boolean(
    repository?.proposalGate?.status === "pending" &&
    draft.notes.trim() &&
    repositoryGateResolutionCatalogMatch(draft, ownerRepositories),
  );
}

export function assertRepositoryGateResolutionDraft({
  draft,
  ownerRepositories,
  repository,
}: {
  draft: RepositoryGateResolutionDraft;
  ownerRepositories: readonly OperationOwnerRepoCatalogOption[];
  repository: RepositoryWorkspaceRecord;
}) {
  if (repository.proposalGate?.status !== "pending") {
    throw new Error("Repository proposal gate is not pending.");
  }

  if (!draft.notes.trim()) {
    throw new Error("Repository gate resolution notes are required.");
  }

  if (!repositoryGateResolutionCatalogMatch(draft, ownerRepositories)) {
    throw new Error(
      "Repository gate resolution must select an admitted owner repository.",
    );
  }
}
