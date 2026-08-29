export type RepositoryCustodyArtifactRef = Readonly<{
  digest: string;
  uri: string;
}>;

export type RepositoryCustodyKind =
  | "dedicated-owner-repo"
  | "shared-owner-repo"
  | "incubation-repo"
  | "external-repo";

export type RepositoryVisibility = "internal" | "private" | "public";

export type RepositoryProvisioningSettings = Readonly<{
  description: string | null;
  features: Readonly<{
    discussions: boolean;
    issues: boolean;
    projects: boolean;
    wiki: boolean;
  }>;
  initialize_with_readme: true;
  merge_policy: Readonly<{
    allow_merge_commit: boolean;
    allow_rebase_merge: boolean;
    allow_squash_merge: boolean;
    delete_branch_on_merge: boolean;
  }>;
  visibility: RepositoryVisibility;
}>;

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

export type RepositoryProvisionIntent = Readonly<{
  approvalNote: string;
  custodyKind: RepositoryCustodyKind;
  repositoryDescription: string;
  repositoryName: string;
  repositoryOwner: string;
  requestedAt: string;
  requestId: string;
  templateReviewed: true;
  visibility: RepositoryVisibility;
  workspaceOwnerRef: string;
}>;

type RepositoryCustodyRequestBase = Readonly<{
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
  workflow: Readonly<{
    execution_id: string;
    workflow_id: "repository-custody";
    workflow_version: "1";
  }>;
}>;

export type RepositoryCustodyLinkRequest = RepositoryCustodyRequestBase &
  Readonly<{
    action: "link-existing";
    target: Readonly<{
      name: string;
      owner: string;
      provider: "github";
      provider_host: "github.com";
      provider_repository_id: string;
    }>;
  }>;

export type RepositoryProvisionRequest = RepositoryCustodyRequestBase &
  Readonly<{
    action: "provision-new";
    provisioning: RepositoryProvisioningSettings;
    target: Readonly<{
      name: string;
      owner: string;
      owner_scope: "organization";
      provider: "github";
      provider_host: "github.com";
      provider_repository_id: null;
    }>;
  }>;

export type RepositoryCustodyRequest =
  | RepositoryCustodyLinkRequest
  | RepositoryProvisionRequest;

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

export type RepositoryApprovedProvisioning = Readonly<{
  name: string;
  owner: string;
  owner_scope: "organization";
  provider: "github";
  provider_host: "github.com";
  settings: RepositoryProvisioningSettings;
}>;

export type RepositoryCustodyDecision = Readonly<{
  action: "link-existing" | "provision-new";
  approved_provisioning: RepositoryApprovedProvisioning | null;
  artifact_type: "repository_custody_decision";
  decision_id: string;
  evaluated_at: string;
  findings: readonly RepositoryCustodyFinding[];
  integrity: RepositoryCustodyIntegrity;
  next_action:
    | "apply-custody"
    | "create-provider"
    | "read-provider"
    | "request-correction"
    | "stop";
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
  action: "link-existing" | "provision-new";
  applied_provisioning: Readonly<{
    initialization_state: "initialized";
    owner_scope: "organization";
    settings: RepositoryProvisioningSettings;
  }> | null;
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
  visibility: RepositoryVisibility;
}>;

export type RepositoryCustodyReceipt = Readonly<{
  action: "link-existing" | "provision-new";
  artifact_type: "repository_custody_receipt";
  completed_at: string;
  custody: Readonly<{
    after: "linked" | "provisioned" | "unrecorded";
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

export type RepositoryProviderOperation = Readonly<{
  attempt_count: number;
  command: "create-provider" | "read-provider";
  completion_path: "created" | "read-existing" | "recovered" | null;
  provider_repository_id: string | null;
  state:
    | "not-started"
    | "command-issued"
    | "provider-acknowledged"
    | "recovery-required"
    | "verified";
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
  next_action:
    | "await-provider"
    | "complete"
    | "request-correction"
    | "retry-provider";
  provider_operation: RepositoryProviderOperation;
  provider_readback: RepositoryProviderReadback | null;
  provider_readback_ref: RepositoryCustodyArtifactRef | null;
  receipt: RepositoryCustodyReceipt | null;
  receipt_ref: RepositoryCustodyArtifactRef | null;
  replayed: boolean;
  request: RepositoryCustodyRequest;
  retryable: boolean;
  schema_version: 1;
  status: "applying" | "denied" | "failed" | "succeeded";
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
