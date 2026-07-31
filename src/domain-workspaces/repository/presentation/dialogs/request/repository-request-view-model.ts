import type { TerasMetadataItem } from "@/teras";

import type { RepositoryRequestDraft } from "../../../work-model/request/repository-request-model.ts";

export function repositoryRequestBoundaryMetadata(): TerasMetadataItem[] {
  return [
    { label: "Pickup Point", value: "Repository Control" },
    { label: "Source", value: "console / operator" },
    { label: "Mutation", value: "prototype-local request" },
    { label: "Future Route", value: "OOS / WGCF admission" },
  ];
}

export function repositoryRequestDraftDirty(draft: RepositoryRequestDraft) {
  return Object.values(draft).some((value) => value.trim().length > 0);
}

export function repositoryRequestDraftComplete(draft: RepositoryRequestDraft) {
  return (
    draft.name.trim().length > 0 &&
    draft.ownerDomain.trim().length > 0 &&
    draft.purpose.trim().length > 0 &&
    draft.repoClass.trim().length > 0
  );
}
