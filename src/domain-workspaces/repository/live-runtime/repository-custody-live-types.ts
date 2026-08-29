export type RepositoryCustodyArtifactRef = Readonly<{
  digest: string;
  uri: string;
}>;

export type RepositoryCustodyKind =
  | "dedicated-owner-repo"
  | "shared-owner-repo"
  | "incubation-repo"
  | "external-repo";

export type RepositoryCustodyLinkIntent = Readonly<{
  approvalNote: string;
  custodyKind: RepositoryCustodyKind;
  providerHost: string;
  providerRepositoryId: string;
  repositoryId: string;
  repositoryName: string;
  repositoryOwner: string;
  requestedAt: string;
  requestId: string;
  workspaceOwnerRef: string;
}>;

export type RepositoryCustodyRequest = Readonly<{
  action: "link-existing";
  artifact_type: "repository_custody_request";
  authority: Readonly<{
    approval_ref: RepositoryCustodyArtifactRef;
    credential_binding_ref: RepositoryCustodyArtifactRef;
    policy_profile_ref: RepositoryCustodyArtifactRef;
  }>;
  correlation: Readonly<{
    causation_id: string | null;
    correlation_id: string;
  }>;
  idempotency_key: string;
  operator_ref: RepositoryCustodyArtifactRef;
  request_digest: string;
  request_id: string;
  requested_at: string;
  requested_custody: Readonly<{
    custody_kind: RepositoryCustodyKind;
    workspace_owner_ref: string;
  }>;
  schema_version: 1;
  target: Readonly<{
    name: string;
    owner: string;
    provider: "github";
    provider_host: string;
    provider_repository_id: string;
  }>;
  workflow: Readonly<{
    execution_id: string;
    workflow_id: "repository-custody";
    workflow_version: "1";
  }>;
}>;

export type RepositoryCustodyFinding = Readonly<{
  code: string;
  severity: "blocking" | "info" | "warning";
  summary: string;
}>;

export type RepositoryCustodyIntegrity = Readonly<{
  algorithm: "sha256";
  canonicalization: "RFC8785";
  content_digest: string;
}>;

export type RepositoryCustodyDecision = Readonly<{
  artifact_type: "repository_custody_decision";
  decision_id: string;
  evaluated_at: string;
  findings: readonly RepositoryCustodyFinding[];
  integrity: RepositoryCustodyIntegrity;
  next_action: "apply-custody" | "read-provider" | "request-correction" | "stop";
  obligations: readonly string[];
  outcome: "allowed" | "denied" | "requires-action";
  policy_version: string;
  request_ref: RepositoryCustodyArtifactRef;
  resolved_identity: Readonly<{
    provider: "github";
    provider_repository_id: string;
  }> | null;
  schema_version: 1;
}>;

export type RepositoryProviderReadback = Readonly<{
  artifact_type: "repository_provider_readback";
  canonical_name: string;
  canonical_owner: string;
  canonical_url: string;
  credential_binding_ref: RepositoryCustodyArtifactRef;
  default_branch: string;
  integrity: RepositoryCustodyIntegrity;
  observed_at: string;
  provider_lifecycle_state: "active" | "archived" | "unavailable";
  provider_version: string;
  readback_id: string;
  repository_identity: Readonly<{
    provider: "github";
    provider_repository_id: string;
  }>;
  request_ref: RepositoryCustodyArtifactRef;
  schema_version: 1;
  visibility: "internal" | "private" | "public";
}>;

export type RepositoryCustodyReceipt = Readonly<{
  action: "link-existing";
  artifact_type: "repository_custody_receipt";
  completed_at: string;
  custody: Readonly<{
    after: "linked" | "unrecorded";
    before: "unrecorded";
    workspace_owner_ref: string;
  }>;
  decision_ref: RepositoryCustodyArtifactRef;
  downstream_handoffs: Readonly<{
    active_inventory: string;
    delivery_catalog: string;
    product_admission: string;
    workspace_intake: string;
  }>;
  findings: readonly string[];
  integrity: RepositoryCustodyIntegrity;
  outcome: "denied" | "failed" | "succeeded";
  provider_readback_ref: RepositoryCustodyArtifactRef | null;
  receipt_id: string;
  repository_identity: Readonly<{
    provider: "github";
    provider_repository_id: string;
  }> | null;
  request_ref: RepositoryCustodyArtifactRef;
  schema_version: 1;
  workflow_status: "denied" | "failed" | "succeeded";
}>;

export type RepositoryCustodyWorkflowResult = Readonly<{
  decision: RepositoryCustodyDecision;
  decision_ref: RepositoryCustodyArtifactRef;
  execution_id: string;
  failure: Readonly<{
    code: string;
    message: string;
    retryable: boolean;
  }> | null;
  next_action: "complete" | "request-correction" | "retry-provider";
  provider_readback: RepositoryProviderReadback | null;
  provider_readback_ref: RepositoryCustodyArtifactRef | null;
  receipt: RepositoryCustodyReceipt;
  receipt_ref: RepositoryCustodyArtifactRef;
  replayed: boolean;
  request: RepositoryCustodyRequest;
  retryable: boolean;
  schema_version: 1;
  status: "denied" | "failed" | "succeeded";
  workflow_id: "repository-custody";
  workflow_version: "1";
}>;

export type RepositoryCustodyLiveApiError = Readonly<{
  code: string;
  error: string;
  mode: "live";
  retryable: boolean;
  status: "offline";
}>;
