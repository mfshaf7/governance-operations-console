export type RepositoryRequestDraft = {
  name: string;
  ownerDomain: string;
  purpose: string;
  repoClass: string;
};

export const emptyRepositoryRequestDraft: RepositoryRequestDraft = {
  name: "",
  ownerDomain: "",
  purpose: "",
  repoClass: "",
};
