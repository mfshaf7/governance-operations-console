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

export type DeliveryWorkSessionArchitectureLocation = {
  relative_path: string;
  repo: string;
};

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

export type DeliveryWorkSessionProjection = {
  agent_source?: Record<string, unknown> & { state: string };
  cleanup?: DeliveryWorkSessionCleanup;
  cleanup_receipt?: DeliveryWorkSessionCleanupReceipt;
  command_receipt?: DeliveryWorkSessionCommandReceipt;
  configured_path?: Record<string, unknown>;
  decision_draft?: DeliveryWorkSessionDecision;
  delivery_id: string | null;
  facts?: Record<string, string>;
  landing_unit_id: string | null;
  lifecycle_context?: DeliveryWorkSessionLifecycleContext;
  next_action: DeliveryWorkSessionNextAction | null;
  projection?: DeliveryWorkSessionLifecycleProjection;
  pull_request?: DeliveryWorkSessionPullRequest;
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
