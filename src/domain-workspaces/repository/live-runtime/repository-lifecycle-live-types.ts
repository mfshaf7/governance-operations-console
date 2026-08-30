export type RepositoryLifecycleArtifactRef = Readonly<{
  digest: string;
  uri: string;
}>;

export type RepositoryLifecycleAction =
  | "archive-provider"
  | "restore-workspace-record"
  | "retire-workspace-record"
  | "transfer-workspace-custody"
  | "unarchive-provider";

export type RepositoryLifecycleBlockerDecision =
  | "accept-risk"
  | "defer"
  | "remove"
  | "workaround";

export type RepositoryLifecycleState = Readonly<{
  custody_state: "linked" | "provisioned";
  custody_version: string;
  provider_lifecycle_state: "active" | "archived" | "unavailable";
  provider_version: string | null;
  workspace_owner_ref: string;
  workspace_record_state: "active" | "retired";
}>;

export type RepositoryLifecycleImpactIntent = Readonly<{
  blockerDecision: RepositoryLifecycleBlockerDecision | null;
  justification: string;
}>;

export type RepositoryLifecycleCommandIntent = Readonly<{
  action: RepositoryLifecycleAction;
  approvalNote: string;
  impact: RepositoryLifecycleImpactIntent;
  provider: "github";
  providerRepositoryId: string;
  repositoryId: string;
  requestedAt: string;
  requestId: string;
  sourceCustodyRequestId: string | null;
  sourceOwnerAcceptanceNote: string;
  targetOwnerAcceptanceNote: string;
  targetWorkspaceOwnerRef: string;
}>;

export type RepositoryLifecycleRequest = Readonly<{
  action: RepositoryLifecycleAction;
  artifact_type: "repository_lifecycle_request";
  authority: Readonly<{
    approval_ref: RepositoryLifecycleArtifactRef;
    policy_profile_ref: RepositoryLifecycleArtifactRef;
    provider_credential_binding_ref: RepositoryLifecycleArtifactRef | null;
    source_owner_acceptance_ref: RepositoryLifecycleArtifactRef | null;
    target_owner_acceptance_ref: RepositoryLifecycleArtifactRef | null;
  }>;
  correlation: Readonly<{
    causation_id: string | null;
    correlation_id: string;
  }>;
  current_state: RepositoryLifecycleState;
  idempotency_key: string;
  impact: Readonly<{
    blocker_disposition: Readonly<{
      decision: RepositoryLifecycleBlockerDecision;
      evidence_ref: RepositoryLifecycleArtifactRef;
      justification: string;
    }> | null;
    blocking_finding_count: number;
    finding_count: number;
    impact_assessment_ref: RepositoryLifecycleArtifactRef;
  }>;
  operator_ref: RepositoryLifecycleArtifactRef;
  repository_identity: Readonly<{
    provider: "github";
    provider_repository_id: string;
  }>;
  request_digest: string;
  request_id: string;
  requested_at: string;
  reversal_of_receipt_ref: RepositoryLifecycleArtifactRef | null;
  schema_version: 1;
  target: Readonly<{
    provider_lifecycle_state: "active" | "archived" | null;
    workspace_owner_ref: string | null;
    workspace_record_state: "active" | "retired" | null;
  }>;
  workflow: Readonly<{
    execution_id: string;
    workflow_id: "repository-lifecycle";
    workflow_version: "1";
  }>;
}>;

export type RepositoryLifecycleFinding = Readonly<{
  code: string;
  severity: "blocking" | "info" | "warning";
  summary: string;
}>;

export type RepositoryLifecycleIntegrity = Readonly<{
  algorithm: "sha256";
  canonicalization: "RFC8785";
  content_digest: string;
}>;

export type RepositoryLifecycleDecision = Readonly<{
  action: RepositoryLifecycleAction;
  approved_target: RepositoryLifecycleRequest["target"] | null;
  artifact_type: "repository_lifecycle_decision";
  current_state: RepositoryLifecycleState;
  decision_id: string;
  evaluated_at: string;
  findings: readonly RepositoryLifecycleFinding[];
  impact: RepositoryLifecycleRequest["impact"] &
    Readonly<{ downstream_mutation: "none" }>;
  integrity: RepositoryLifecycleIntegrity;
  next_action:
    | "apply-workspace-custody"
    | "archive-provider"
    | "request-correction"
    | "restore-workspace-record"
    | "retire-workspace-record"
    | "stop"
    | "unarchive-provider";
  obligations: readonly string[];
  outcome: "allowed" | "denied" | "requires-action";
  policy_version: string;
  request_ref: RepositoryLifecycleArtifactRef;
  required_human_gates: readonly string[];
  schema_version: 1;
}>;

export type RepositoryLifecycleHistoryItem = Readonly<{
  action: RepositoryLifecycleAction;
  completed_at: string;
  outcome: "cancelled" | "denied" | "failed" | "succeeded";
  receipt_ref: RepositoryLifecycleArtifactRef;
  reversal_of_receipt_ref: RepositoryLifecycleArtifactRef | null;
}>;

export type RepositoryLifecycleAudit = Readonly<{
  artifact_type: "repository_lifecycle_audit";
  audit_id: string;
  current_state: RepositoryLifecycleState;
  history: readonly RepositoryLifecycleHistoryItem[];
  impact_summary: Readonly<{
    blocker_disposition: RepositoryLifecycleBlockerDecision | null;
    blocking_finding_count: number;
    finding_count: number;
    latest_assessment_ref: RepositoryLifecycleArtifactRef | null;
  }>;
  integrity: RepositoryLifecycleIntegrity;
  latest_terminal_receipt_ref: RepositoryLifecycleArtifactRef | null;
  mutation: false;
  projected_at: string;
  repository_identity: RepositoryLifecycleRequest["repository_identity"];
  schema_version: 1;
  source_authority: "operator-orchestration-service";
}>;

export type RepositoryLifecycleReceipt = Readonly<{
  action: RepositoryLifecycleAction;
  after: RepositoryLifecycleState;
  artifact_type: "repository_lifecycle_receipt";
  before: RepositoryLifecycleState;
  blocker_disposition: RepositoryLifecycleRequest["impact"]["blocker_disposition"];
  completed_at: string;
  confirmations: Readonly<{
    operator_approval_ref: RepositoryLifecycleArtifactRef;
    provider_credential_binding_ref: RepositoryLifecycleArtifactRef | null;
    source_owner_acceptance_ref: RepositoryLifecycleArtifactRef | null;
    target_owner_acceptance_ref: RepositoryLifecycleArtifactRef | null;
  }>;
  decision_ref: RepositoryLifecycleArtifactRef;
  downstream_mutation: "none";
  findings: readonly string[];
  history_event_ref: RepositoryLifecycleArtifactRef;
  impact_assessment_ref: RepositoryLifecycleArtifactRef;
  integrity: RepositoryLifecycleIntegrity;
  outcome: "cancelled" | "denied" | "failed" | "succeeded";
  provider_readback_ref: RepositoryLifecycleArtifactRef | null;
  receipt_id: string;
  repository_identity: RepositoryLifecycleRequest["repository_identity"];
  request_ref: RepositoryLifecycleArtifactRef;
  reversal_of_receipt_ref: RepositoryLifecycleArtifactRef | null;
  schema_version: 1;
  workflow_status: "cancelled" | "denied" | "failed" | "succeeded";
}>;

export type RepositoryLifecycleWorkflowResult = Readonly<{
  audit: RepositoryLifecycleAudit | null;
  current_state: RepositoryLifecycleState;
  decision: RepositoryLifecycleDecision;
  decision_ref: RepositoryLifecycleArtifactRef;
  execution_id: string;
  failure: Readonly<{
    code: string;
    message: string;
    retryable: boolean;
  }> | null;
  next_action:
    | "await-provider"
    | "await-workspace"
    | "complete"
    | "request-correction"
    | "retry";
  operation: Readonly<{
    attempt_count: number;
    command:
      | "apply-workspace-custody"
      | "archive-provider"
      | "restore-workspace-record"
      | "retire-workspace-record"
      | "unarchive-provider";
    completion_path: "provider" | "recovered" | "workspace" | null;
    state:
      | "command-issued"
      | "not-started"
      | "provider-acknowledged"
      | "recovery-required"
      | "verified"
      | "workspace-acknowledged";
  }>;
  provider_readback: Readonly<{
    coordinates: Readonly<{ name: string; owner: string }>;
    integrity: RepositoryLifecycleIntegrity;
    observed_at: string;
    provider_lifecycle_state: "active" | "archived";
    provider_version: string;
    readback_id: string;
    repository_identity: RepositoryLifecycleRequest["repository_identity"];
  }> | null;
  provider_readback_ref: RepositoryLifecycleArtifactRef | null;
  receipt: RepositoryLifecycleReceipt | null;
  receipt_ref: RepositoryLifecycleArtifactRef | null;
  replayed: boolean;
  request: RepositoryLifecycleRequest;
  retryable: boolean;
  schema_version: 1;
  status: "applying" | "cancelled" | "denied" | "failed" | "succeeded";
  workflow_id: "repository-lifecycle";
  workflow_version: "1";
}>;

export type RepositoryLifecycleLiveSnapshot = Readonly<{
  audit: RepositoryLifecycleAudit | null;
  error: string | null;
  mode: "disconnected-preview" | "live";
  observedAt: string;
  status: "current" | "not-initialized" | "offline";
}>;

export type RepositoryLifecycleLiveApiError = Readonly<{
  code: string;
  error: string;
  mode: "live";
  retryable: boolean;
  status: "offline";
}>;
