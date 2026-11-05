import type { InstanceRecordAuthority, InstanceIntakeReceipt } from "../../console-integration/workspace-intake/workspace-intake-live-types.ts";

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
  provider_repository?: Readonly<{provider: "github"; provider_repository_id: string; full_name: string}>;
  authority_kind?: "internal-instance-record";
  canonical_authority?: InstanceRecordAuthority;
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
  provider_repository?: Readonly<{provider: "github"; provider_repository_id: string; full_name: string}>;
  authority_kind?: "internal-instance-record";
  canonical_authority?: InstanceRecordAuthority;
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

export type WorkspaceRegistryLegacySnapshot = Readonly<{
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

export type WorkspaceInventoryPreparation = InstanceInventoryPromotionPreparation | Readonly<{
  authority_kind?: undefined;
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

export type WorkspaceInventoryReceipt = InstanceIntakeReceipt | Readonly<{
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
  authority_kind?: "internal-instance-record";
  canonical_authority?: InstanceRecordAuthority;
  cancel_allowed?: boolean;
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

export type WorkspaceInventoryLifecycleAction =
  | "restore"
  | "retire"
  | "suspend"
  | "update";

export type WorkspaceInventoryLifecycleExpectedState = Readonly<{
  active_inventory_digest: string;
  history_digest: string;
  posture: WorkspaceRegistryRecord["posture"];
  record_digest: string;
  record_version: number;
}>;

export type WorkspaceInventoryArtifactRef = Readonly<{
  digest: string;
  id: string;
}>;

export type WorkspaceInventoryLifecyclePreparation = InstanceInventoryLifecyclePreparation | Readonly<{
  authority_kind?: undefined;
  authority_revision: string;
  canonical_authority: Readonly<{
    branch: "main";
    history_path: "contracts/workspace-inventory-history.yaml";
    inventory_path:
      | "contracts/components.yaml"
      | "contracts/products.yaml"
      | "contracts/repos.yaml";
    repo: "workspace-governance";
  }>;
  canonical_mutation: false;
  current_record: Readonly<Record<string, unknown>>;
  expected_state: WorkspaceInventoryLifecycleExpectedState;
  latest_event_ref: WorkspaceInventoryArtifactRef | null;
  schema_version: 1;
  target: WorkspaceRegistryTarget;
  workflow_id: "workspace-inventory-lifecycle";
}>;

export type WorkspaceInventoryLifecycleSubmissionIntent = Readonly<{
  action: WorkspaceInventoryLifecycleAction;
  approval_refs: readonly string[];
  impact_acknowledgements: readonly string[];
  reason: string;
  request_id: string;
  requested_value: Readonly<Record<string, unknown>> | null;
  reviewed_preparation: WorkspaceInventoryLifecyclePreparation;
  reviewed_projection: Readonly<{
    authority_revision: string;
    projection_digest: string;
  }>;
}>;

export type WorkspaceInventoryLifecycleLegacyRequest = Readonly<{
  action: WorkspaceInventoryLifecycleAction;
  approval_refs: readonly string[];
  artifact_type: "workspace-inventory-lifecycle-request";
  correlation_ref: string;
  expected_state: WorkspaceInventoryLifecycleExpectedState;
  idempotency_key: string;
  impact_acknowledgements: readonly string[];
  operator_ref: string;
  prior_event_ref: WorkspaceInventoryArtifactRef | null;
  reason: string;
  request_digest: string;
  request_id: string;
  requested_at: string;
  requested_value: Readonly<Record<string, unknown>> | null;
  schema_version: 1;
  target: WorkspaceRegistryTarget;
}>;

export type WorkspaceInventoryLifecycleReadiness = Readonly<{
  action: WorkspaceInventoryLifecycleAction;
  artifact_type: "workspace-inventory-lifecycle-readiness";
  evaluated_at: string;
  findings: readonly string[];
  observed_state: WorkspaceInventoryLifecycleExpectedState;
  outcome: "blocked" | "ready";
  policy_ref: WorkspaceInventoryArtifactRef;
  readiness_digest: string;
  readiness_id: string;
  request_ref: WorkspaceInventoryArtifactRef;
  schema_version: 1;
  target: WorkspaceRegistryTarget;
}>;

export type WorkspaceInventoryLifecycleReadinessEnvelope = Readonly<{
  ledger: Readonly<{
    ref: Readonly<{ digest: string; uri: string }>;
    resolution: "created" | "read" | "reused";
    state: "durable";
  }>;
  readiness: WorkspaceInventoryLifecycleReadiness;
}>;

export type WorkspaceInventoryLifecycleLegacyReceipt = Readonly<{
  action: WorkspaceInventoryLifecycleAction;
  artifact_type: "workspace-inventory-lifecycle-receipt";
  completed_at: string;
  correlation_ref: string;
  idempotency_key: string;
  operator_ref: string;
  outcome: "prepared" | "replayed";
  phase: "review-branch";
  readback_ref: WorkspaceInventoryArtifactRef;
  readiness_ref: WorkspaceInventoryArtifactRef;
  receipt_digest: string;
  receipt_id: string;
  mutation_ref: WorkspaceInventoryArtifactRef;
  request_ref: WorkspaceInventoryArtifactRef;
  schema_version: 1;
  target: WorkspaceRegistryTarget;
}>;

export type WorkspaceInventoryLifecycleLegacyReadback = Readonly<{
  action: WorkspaceInventoryLifecycleAction;
  active_inventory_digest: string;
  artifact_type: "workspace-inventory-lifecycle-readback";
  authority_state: "review-branch";
  history_digest: string;
  history_event_ref: WorkspaceInventoryArtifactRef;
  mutation_ref: WorkspaceInventoryArtifactRef;
  observed_at: string;
  readback_digest: string;
  readback_id: string;
  record: Readonly<Record<string, unknown>>;
  schema_version: 1;
  source_branch: string;
  target: WorkspaceRegistryTarget;
}>;

export type WorkspaceInventoryLifecycleMergedState = Readonly<{
  action: WorkspaceInventoryLifecycleAction;
  active_inventory_digest: string;
  authority_revision: string;
  history_digest: string;
  history_event_ref: WorkspaceInventoryArtifactRef;
  observed_at: string;
  record: Readonly<Record<string, unknown>>;
  target: WorkspaceRegistryTarget;
}>;

export type WorkspaceInventoryLifecycleResult = Readonly<{
  authority_kind?: "internal-instance-record";
  canonical_authority?: InstanceRecordAuthority;
  cancel_allowed?: boolean;
  canonical_mutation: boolean;
  execution_ref: string;
  failure: Readonly<{
    code: string;
    message: string;
    retryable: boolean;
  }> | null;
  history: readonly WorkspaceInventoryHistoryEvent[];
  merged_state: WorkspaceInventoryLifecycleMergedState | null;
  next_action:
    | "complete"
    | "continue"
    | "inspect-review-or-cancel"
    | "refresh-and-resubmit"
    | "restore-dependency-and-retry"
    | "review-and-merge"
    | "submit-corrected-request";
  readback: WorkspaceInventoryLifecycleReadback | null;
  readiness: WorkspaceInventoryLifecycleReadinessEnvelope | null;
  receipt: WorkspaceInventoryLifecycleReceipt | null;
  request: WorkspaceInventoryLifecycleRequest;
  request_id: string;
  revision: number;
  review: WorkspaceInventoryReview | null;
  schema_version: 1;
  session_ref: string;
  status: WorkspaceInventoryStatus;
  workflow_id: "workspace-inventory-lifecycle";
}>;


export type InstanceRegistrySelection = Readonly<{ query: string; scope: "eligible" | "inventory" }>;
export type InstanceRegistryPage = Readonly<{
  schema_version: 1;
  mode: "current";
  artifact_type: "instance-repository-registry-page";
  authority: Omit<InstanceRecordAuthority, "record_id">;
  selection: InstanceRegistrySelection;
  after: string | null;
  next_after: string | null;
  counts: Readonly<{
    intake: Readonly<{ "out-of-scope": number; proposed: number; admitted: number }>;
    inventory: Readonly<{ active: number; suspended: number; retired: number }>;
  }>;
  records: readonly WorkspaceRegistryRecord[];
  eligible_promotions: readonly WorkspaceRegistryCandidate[];
  projected_at: string;
  projection_digest: string;
}>;
export type WorkspaceRegistryComposedSnapshot = Readonly<Omit<WorkspaceRegistryLegacySnapshot, "workflow_id" | "canonical_authority"> & {
  workflow_id: "workspace-registry-view";
  legacy_snapshot: WorkspaceRegistryLegacySnapshot;
  instance_page: InstanceRegistryPage;
  source_authorities: Readonly<{ legacy: WorkspaceRegistryLegacySnapshot["canonical_authority"]; instance: InstanceRegistryPage["authority"] }>;
}>;
export type WorkspaceRegistrySnapshot = WorkspaceRegistryLegacySnapshot | WorkspaceRegistryComposedSnapshot;
export type InstanceInventoryPreparationBase = Readonly<{
  schema_version: 1;
  authority_kind: "internal-instance-record";
  authority_revision: string;
  canonical_authority: InstanceRecordAuthority;
  canonical_mutation: false;
  policy_ref: Readonly<{ repo: "workspace-governance"; revision: string; contract_digest: string }>;
  target: WorkspaceRegistryTarget;
  expected_state: Readonly<{ record_version: number; record_digest: string }>;
  current_record: Readonly<Record<string, unknown>>;
  latest_receipt_ref: Readonly<{ version: number; digest: string; action: string }>;
}>;
export type InstanceInventoryPromotionPreparation = InstanceInventoryPreparationBase & Readonly<{
  workflow_id: "workspace-inventory-promotion";
  intake_entry_ref: WorkspaceRegistryCandidate["intake_entry_ref"];
  candidate: WorkspaceRegistryCandidate;
}>;
export type InstanceInventoryLifecyclePreparation = InstanceInventoryPreparationBase & Readonly<{
  workflow_id: "workspace-inventory-lifecycle";
  current_record: Readonly<Record<string, unknown> & { posture: WorkspaceRegistryRecord["posture"]; lifecycle: WorkspaceRegistryRecord["posture"] }>;
}>;

export type InstanceInventoryRequest = Readonly<{
  schema_version: 1;
  artifact_type: "instance-repository-inventory-request";
  instance_id: string;
  request_id: string;
  requested_at: string;
  operator_ref: string;
  operator_acceptance: Readonly<{ state: "accepted"; operator_ref: string; recorded_at: string }>;
  correlation_ref: string;
  idempotency_key: string;
  action: "promote" | WorkspaceInventoryLifecycleAction;
  target: WorkspaceRegistryTarget;
  expected_state: Readonly<{ record_version: number; record_digest: string }>;
  requested_value: Readonly<Record<string, unknown>> | null;
  prior_receipt_digest: string | null;
  reason: string | null;
  impact_acknowledgements: readonly string[];
  approval_refs: readonly string[];
  policy_ref: InstanceInventoryPreparationBase["policy_ref"];
  request_digest: string;
}>;
export type InstanceInventoryLifecycleRequest = InstanceInventoryRequest & Readonly<{ action: WorkspaceInventoryLifecycleAction; reason: string }>;
export type WorkspaceInventoryLifecycleRequest = WorkspaceInventoryLifecycleLegacyRequest | InstanceInventoryLifecycleRequest;
export type WorkspaceInventoryLifecycleReceipt = WorkspaceInventoryLifecycleLegacyReceipt | InstanceIntakeReceipt;
export type InstanceInventoryReadback = Readonly<{ record: Readonly<Record<string, unknown>>; receipt: InstanceIntakeReceipt }>;
export type WorkspaceInventoryLifecycleReadback = WorkspaceInventoryLifecycleLegacyReadback | InstanceInventoryReadback;
