export type WorkspaceIntakeTargetKind = "component" | "product" | "repo";

export type WorkspaceIntakeDecision =
  | "admitted"
  | "out-of-scope"
  | "proposed";

export type WorkspaceIntakeTarget = Readonly<{
  kind: WorkspaceIntakeTargetKind;
  name: string;
  record_id: string;
}>;

export type WorkspaceIntakeExpectedState = Readonly<{
  record_digest: string | null;
  record_version: number | null;
  register_digest: string;
}>;

export type WorkspaceIntakePreparation = Readonly<{
  authority_revision: string;
  canonical_authority: Readonly<{
    branch: "main";
    path: "contracts/intake-register.yaml";
    repo: "workspace-governance";
  }>;
  canonical_mutation: false;
  expected_state: WorkspaceIntakeExpectedState;
  schema_version: 1;
  target: WorkspaceIntakeTarget;
  workflow_id: "workspace-intake";
}>;

export type WorkspaceIntakeSource = Readonly<{
  class: "delivery" | "direct" | "prototype" | "repository-custody";
  digest: string;
  ref: string;
}>;

export type WorkspaceIntakeValidationBehavior = Readonly<{
  catalog_refs: readonly string[];
  notes: string;
  posture: string;
  wgcf_graph_role: string;
}>;

export type WorkspaceIntakeRequestedRecord =
  | Readonly<{
      kind: "repo";
      notes: string;
      repo_class: string | null;
      requires_security_bindings: boolean | null;
      security_owner: string | null;
      validation_behavior?: WorkspaceIntakeValidationBehavior;
    }>
  | Readonly<{
      intended_endpoint: string | null;
      kind: "product";
      notes: string;
      platform_owner: string | null;
      runtime_owner: string | null;
      security_owner: string | null;
      source_owners: readonly string[];
      validation_behavior?: WorkspaceIntakeValidationBehavior;
    }>
  | Readonly<{
      component_class: string | null;
      kind: "component";
      notes: string;
      owner_repo: string | null;
      product: string | null;
      security_owner: string | null;
      validation_behavior?: WorkspaceIntakeValidationBehavior;
    }>;

export type WorkspaceIntakeCandidate = Readonly<{
  evidence_refs: readonly string[];
  label: string;
  requested_record: WorkspaceIntakeRequestedRecord;
  source: WorkspaceIntakeSource;
  target: Readonly<{
    kind: WorkspaceIntakeTargetKind;
    name: string;
  }>;
}>;

export type WorkspaceIntakeSubmissionIntent = Readonly<{
  candidate: WorkspaceIntakeCandidate;
  decision: WorkspaceIntakeDecision;
  request_id: string;
  reviewed_preparation: WorkspaceIntakePreparation;
}>;

export type WorkspaceIntakeHistoryEvent = Readonly<{
  at: string;
  details: Readonly<{
    merge_commit: string;
    receipt_digest: string;
  }> | null;
  sequence: number;
  status: string;
}>;

export type WorkspaceIntakeReview = Readonly<{
  base_branch: "main";
  base_commit: string;
  branch: string;
  head_commit: string;
  human_reviewed: boolean;
  merge_commit: string | null;
  merged: boolean;
  number: number;
  repository: "workspace-governance";
  state: string;
  url: string;
}>;

export type WorkspaceIntakeReceipt = Readonly<{
  artifact_type: "workspace-intake-receipt";
  canonical_authority: Readonly<{
    branch: string;
    path: string;
    repo: string;
  }>;
  completed_at: string;
  outcome: "prepared" | "replayed" | "succeeded";
  phase: "merged-authority" | "source-preparation" | "source-replay";
  receipt_digest: string;
  receipt_id: string;
  schema_version: 2;
}>;

export type WorkspaceIntakeResult = Readonly<{
  canonical_mutation: boolean;
  failure: Readonly<{
    code: string;
    message: string;
    retryable: boolean;
  }> | null;
  history: readonly WorkspaceIntakeHistoryEvent[];
  next_action:
    | "complete"
    | "continue"
    | "inspect-review-or-cancel"
    | "restore-dependency-and-retry"
    | "review-and-merge"
    | "submit-corrected-request";
  receipt: WorkspaceIntakeReceipt | null;
  request_id: string;
  revision: number;
  review: WorkspaceIntakeReview | null;
  schema_version: 1;
  status:
    | "accepted"
    | "cancelled"
    | "cancelling"
    | "evaluating"
    | "preparing"
    | "rejected"
    | "requires-action"
    | "review-required"
    | "succeeded";
  workflow_id: "workspace-intake";
  readback: unknown | null;
}>;

export type WorkspaceIntakeClientError = Readonly<{
  code: string;
  message: string;
  retryable: boolean;
}>;
