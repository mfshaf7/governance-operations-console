export type WorkspaceRegistryKind = "component" | "product" | "repo";

export type WorkspaceRegistryTarget = Readonly<{
  kind: WorkspaceRegistryKind;
  name: string;
  record_id: string;
}>;

export type WorkspaceRegistryLineage = Readonly<{
  intake_entry_version: number | null;
  source: string;
  source_digest: string;
  source_ref: string;
}>;

export type WorkspaceRegistryMutation = Readonly<{
  action: string;
  applied_at: string;
  id: string;
  readiness_ref: string | null;
  request_ref: string | null;
}>;

export type WorkspaceRegistryRecord = Readonly<{
  id: string;
  kind: WorkspaceRegistryKind;
  lineage: WorkspaceRegistryLineage;
  maturity: string | null;
  name: string;
  owner_refs: readonly string[];
  posture: "active" | "retired" | "suspended";
  record_digest: string;
  version: number;
  last_mutation: WorkspaceRegistryMutation;
}>;

export type WorkspaceRegistryCandidate = Readonly<{
  active_record: Readonly<{
    id: string;
    kind: WorkspaceRegistryKind;
    value: Readonly<Record<string, unknown>>;
  }>;
  approval_refs: readonly string[];
  candidate_digest: string;
  intake_entry_ref: Readonly<{
    digest: string;
    id: string;
    version: number;
  }>;
  owner_refs: readonly string[];
  target: WorkspaceRegistryTarget;
}>;

export type WorkspaceRegistrySnapshot = Readonly<{
  authority_revision: string;
  canonical_authority: Readonly<{
    branch: "main";
    inventory_paths: Readonly<{
      component: "contracts/components.yaml";
      product: "contracts/products.yaml";
      repo: "contracts/repos.yaml";
    }>;
    intake_path: "contracts/intake-register.yaml";
    repo: "workspace-governance";
  }>;
  canonical_mutation: false;
  eligible_promotions: readonly WorkspaceRegistryCandidate[];
  projected_at: string;
  projection_digest: string;
  projection_id: string;
  records: readonly WorkspaceRegistryRecord[];
  schema_version: 1;
  workflow_id: "workspace-inventory-registry";
}>;

export type WorkspaceInventoryExpectedState = Readonly<{
  active_inventory_digest: string;
  active_record_digest: null;
  active_record_version: null;
  intake_entry_digest: string;
  intake_entry_version: number;
  intake_register_digest: string;
}>;

export type WorkspaceInventoryPreparation = Readonly<{
  authority_revision: string;
  canonical_authority: Readonly<{
    branch: "main";
    intake_path: "contracts/intake-register.yaml";
    inventory_path:
      | "contracts/components.yaml"
      | "contracts/products.yaml"
      | "contracts/repos.yaml";
    repo: "workspace-governance";
  }>;
  canonical_mutation: false;
  expected_state: WorkspaceInventoryExpectedState;
  intake_entry_ref: WorkspaceRegistryCandidate["intake_entry_ref"];
  schema_version: 1;
  target: WorkspaceRegistryTarget;
  workflow_id: "workspace-inventory-promotion";
}>;

export type WorkspaceInventorySubmissionIntent = Readonly<{
  candidate: WorkspaceRegistryCandidate;
  request_id: string;
  reviewed_preparation: WorkspaceInventoryPreparation;
  reviewed_projection: Readonly<{
    authority_revision: string;
    projection_digest: string;
  }>;
}>;

export type WorkspaceInventoryReview = Readonly<{
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

export type WorkspaceInventoryReceipt = Readonly<{
  artifact_type: "workspace-inventory-promotion-receipt";
  completed_at: string;
  outcome: "succeeded";
  phase: "merged-authority";
  receipt_digest: string;
  receipt_id: string;
  schema_version: 1;
}>;

export type WorkspaceInventoryHistoryEvent = Readonly<{
  at: string;
  details: Readonly<Record<string, unknown>> | null;
  sequence: number;
  status: WorkspaceInventoryStatus;
}>;

export type WorkspaceInventoryStatus =
  | "accepted"
  | "blocked"
  | "cancelled"
  | "cancelling"
  | "evaluating"
  | "preparing"
  | "rejected"
  | "review-required"
  | "stale"
  | "succeeded";

export type WorkspaceInventoryResult = Readonly<{
  canonical_mutation: boolean;
  failure: Readonly<{
    code: string;
    message: string;
    retryable: boolean;
  }> | null;
  history: readonly WorkspaceInventoryHistoryEvent[];
  next_action:
    | "complete"
    | "continue"
    | "inspect-review-or-cancel"
    | "refresh-and-resubmit"
    | "restore-dependency-and-retry"
    | "review-and-merge"
    | "submit-corrected-promotion";
  readback: Readonly<Record<string, unknown>> | null;
  receipt: WorkspaceInventoryReceipt | null;
  request_id: string;
  revision: number;
  review: WorkspaceInventoryReview | null;
  schema_version: 1;
  status: WorkspaceInventoryStatus;
  workflow_id: "workspace-inventory-promotion";
}>;
