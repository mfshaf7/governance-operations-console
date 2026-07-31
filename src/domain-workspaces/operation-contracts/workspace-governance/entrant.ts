export type WorkspaceEntrantKind = "component" | "product" | "repository";

export type WorkspaceValidationBehavior = {
  catalogRefs: string[];
  notes: string;
  posture: string;
  wgcfGraphRole: string;
};

type WorkspaceEntrantCandidateBase = {
  candidateRef: string;
  candidateVersion: string;
  canonicalKey: string;
  correlationRef: string;
  evidenceRefs: string[];
  name: string;
  sourceOwnerRef: string;
};

export type WorkspaceRepositoryEntrantCandidate =
  WorkspaceEntrantCandidateBase & {
    entrantKind: "repository";
    intakeMetadata: {
      repoClass: string;
      requiresSecurityBindings: boolean;
      securityOwner: string | null;
      validationBehavior: WorkspaceValidationBehavior;
    };
  };

export type WorkspaceProductEntrantCandidate = WorkspaceEntrantCandidateBase & {
  entrantKind: "product";
  intakeMetadata: {
    intendedEndpoint: string;
    platformOwner: string;
    runtimeOwner: string;
    securityOwner: string;
    sourceOwners: string[];
    validationBehavior: WorkspaceValidationBehavior;
  };
};

export type WorkspaceComponentEntrantCandidate =
  WorkspaceEntrantCandidateBase & {
    entrantKind: "component";
    intakeMetadata: {
      componentClass: string;
      ownerRepo: string;
      product: string | null;
      securityOwner: string;
      validationBehavior: WorkspaceValidationBehavior;
    };
  };

export type WorkspaceEntrantCandidate =
  | WorkspaceComponentEntrantCandidate
  | WorkspaceProductEntrantCandidate
  | WorkspaceRepositoryEntrantCandidate;

export function workspaceEntrantCollection(
  kind: WorkspaceEntrantKind,
): "components" | "products" | "repos" {
  switch (kind) {
    case "component":
      return "components";
    case "product":
      return "products";
    case "repository":
      return "repos";
  }
}
