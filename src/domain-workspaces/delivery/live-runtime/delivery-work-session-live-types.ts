export type DeliveryWorkSessionMode = "disconnected-preview" | "live";

export type DeliveryWorkSessionNextAction = {
  authority: string;
  code: string;
  inputs?: Record<string, unknown>;
  reason: string;
};

export type DeliveryWorkSessionLifecycleContext = {
  commissioned: boolean;
  default_mode: "packet";
  latest_binding: Record<string, unknown> | null;
  measurements: {
    denied_count: number;
    packet_count: number;
    raw_fallback_count: number;
  };
};

export type DeliveryWorkSessionCleanup = {
  attempt?: number;
  resources?: Array<{
    last_error?: string | null;
    outcome?: string;
    resource_id?: string;
    resource_type?: string;
  }>;
  state: string;
};

export type DeliveryWorkSessionCleanupReceipt = Record<string, unknown> & {
  outcome: string;
};

export type DeliveryWorkSessionLifecycleProjection = Record<string, unknown> & {
  complete?: boolean;
  gate?: string | null;
  state?: string;
  summary?: string;
};

export type DeliveryWorkSessionPullRequest = Record<string, unknown> & {
  state: string;
};

export type DeliveryReviewedOperatingVerification = {
  digest: string;
  source: { pull_request_url: string; head_commit: string; merge_commit: string };
  verifier: { pull_request_url: string; revision: string };
  review_packet_digest: string;
  cases: Array<{ id: string; title: string }>;
};

export type DeliveryWorkSessionArchitectureLocation =
  | { relative_path: string; repo: string }
  | { recorded_artifact_digest: string };

export type DeliveryWorkSessionDecision = {
  architecture: {
    artifact_location: DeliveryWorkSessionArchitectureLocation | null;
    required: boolean | null;
  };
  artifact_type: "delivery_art_work_session_decision";
  caller_id: string;
  covered_work_item_ids: string[];
  human_gate_work_item_ids: {
    security_acceptance: string[];
  };
  landing_unit: {
    base_ref: string;
    branch: string;
    decision: "child_isolated_landing_unit" | "feature_single_landing_unit";
    id: string;
    rollback_boundary: string;
    split_reason: string;
  };
  operator: {
    decision_source: "approved-ai-suggestion" | "operator";
    id: string;
  };
  schema_version: 1;
  work_item_id: string;
};

export type DeliveryWorkSessionCommandReceipt = {
  caller_id: string;
  command_id: string;
  completed_at: string;
  digest: string;
  executor_id: string;
  operator_id: string;
  ref: string;
  request_digest: string;
  result_state: string;
  work_item_id: string;
};

export type DeliveryWorkSessionAncestorDisposition = Record<string, unknown> & {
  disposition:
    | "closed"
    | "initiative-readiness-evaluated-separately"
    | "read-failed"
    | "ready-for-closeout"
    | "retained";
  open_descendant_count?: number;
  reason?: string;
  status?: string | null;
  subject?: string;
  type?: string | null;
  work_item_id: string;
};

export type DeliveryWorkSessionInitiativeDisposition = Record<string, unknown> & {
  blocked_count: number | null;
  delivery_id: string;
  disposition:
    | "closed"
    | "ready-for-closeout"
    | "retained-closeout-gates"
    | "retained-open-work";
  epic_status: string | null;
  open_descendant_count: number | null;
  ready_for_closeout: boolean;
  reasons: string[];
};

export type DeliveryWorkSessionCloseout = {
  ancestor_dispositions: DeliveryWorkSessionAncestorDisposition[];
  completed: Array<Record<string, unknown> & {
    status?: string | null;
    work_item_id: string;
  }>;
  covered_work_item_ids: string[];
  failed: Array<Record<string, unknown> & {
    parent_id?: string;
    work_item_id?: string;
  }>;
  packet_digest: string | null;
  packet_id: string | null;
  parent_closeouts: Array<Record<string, unknown> & { parent_id: string }>;
  initiative_disposition: DeliveryWorkSessionInitiativeDisposition | null;
  skipped_work_items: Array<Record<string, unknown> & { work_item_id: string }>;
  state: "complete" | "partial_failure";
};

export type DeliveryWorkSessionProjection = {
  architecture_supersession?: {
    reconstructable: boolean;
    pristine_proof?: { source?: { local_branch_head?: string; worktree_head?: string } };
  };
  source_authorization?: { intent_ref: string; session_id: string; revision?: string; state?: string; operation_ref?: string | null };
  source_access_scope?: { work_item_ref: string; source_start_digest: string; predecessor_intent_ref?: string };
  agent_source?: Record<string, unknown> & { state: string };
  cleanup?: DeliveryWorkSessionCleanup;
  cleanup_receipt?: DeliveryWorkSessionCleanupReceipt;
  closed_review?: {
    covered_work_item_ids: string[];
    pull_request_urls: string[];
    verification_recorded: boolean;
    passed_checks?: string[];
  };
  closed_review_unavailable?: boolean;
  closeout?: DeliveryWorkSessionCloseout;
  command_receipt?: DeliveryWorkSessionCommandReceipt;
  configured_path?: Record<string, unknown>;
  covered_work_item_ids?: string[];
  decision_draft?: DeliveryWorkSessionDecision;
  delivery_id: string | null;
  facts?: Record<string, string>;
  landing_unit_id: string | null;
  lifecycle_context?: DeliveryWorkSessionLifecycleContext;
  next_action: DeliveryWorkSessionNextAction | null;
  pending_rebuild?: { command_id: string; expected_session_revision: string };
  projection?: DeliveryWorkSessionLifecycleProjection;
  pull_request?: DeliveryWorkSessionPullRequest;
  operating_verification?: DeliveryReviewedOperatingVerification;
  replayed?: boolean;
  session_id: string | null;
  session_revision: string | null;
  source?: {
    base_commit: string;
    branch: string;
    changed_files: string[];
    head_commit: string;
    state: string;
    upstream_commit: string | null;
  };
  state: string;
  work_contract?: Record<string, unknown>;
  work_item_id: string;
  workflow_id: "delivery-art-work-session";
};

export type DeliveryWorkSessionSnapshot = {
  error: string | null;
  mode: DeliveryWorkSessionMode;
  observedAt: string;
  projection: DeliveryWorkSessionProjection | null;
  status: "current" | "offline";
};

export type DeliveryWorkSessionDecisionInput = {
  coveredWorkItemIds?: string[];
  architecture: {
    artifactLocation: DeliveryWorkSessionArchitectureLocation | null;
    required: boolean;
  };
  branch: string;
  landingUnitDecision:
    | "child_isolated_landing_unit"
    | "feature_single_landing_unit";
  landingUnitId: string;
  rollbackBoundary: string;
  splitReason: string;
};

export type DeliveryWorkSessionLiveApiError = {
  code: string;
  error: string;
  mode: "live";
  status: "offline";
};

export type DeliveryWorkSessionRecovery = {
  session_id: string;
  session_revision: string;
  reason: string;
} & ({ mode: "archive-unmerged"; pull_request: null; source: { local_branch_head: string; worktree_head: string } } |
  { mode?: "archive-merged-evidence"; pull_request: { url: string; head_commit: string; merge_commit: string } });
