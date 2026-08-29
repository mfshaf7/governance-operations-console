export type RepositoryRequestDraft = {
  approvalNote: string;
  custodyKind:
    | "dedicated-owner-repo"
    | "external-repo"
    | "incubation-repo"
    | "shared-owner-repo";
  name: string;
  ownerDomain: string;
  purpose: string;
  repoClass: string;
  templateReviewed: boolean;
  visibility: "internal" | "private" | "public";
  workspaceOwnerRef: string;
};

export const emptyRepositoryRequestDraft: RepositoryRequestDraft = {
  approvalNote: "",
  custodyKind: "dedicated-owner-repo",
  name: "",
  ownerDomain: "",
  purpose: "",
  repoClass: "owner-repository",
  templateReviewed: false,
  visibility: "private",
  workspaceOwnerRef: "",
};
