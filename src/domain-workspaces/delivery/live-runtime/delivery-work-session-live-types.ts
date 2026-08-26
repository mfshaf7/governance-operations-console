export type DeliveryWorkSessionMode = "disconnected-preview" | "live";

export type DeliveryWorkSessionNextAction = {
  authority: string;
  code: string;
  reason: string;
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
  cleanup?: Record<string, unknown>;
  cleanup_receipt?: Record<string, unknown>;
  command_receipt?: DeliveryWorkSessionCommandReceipt;
  decision_draft?: DeliveryWorkSessionDecision;
  delivery_id: string | null;
  facts?: Record<string, string>;
  landing_unit_id: string | null;
  next_action: DeliveryWorkSessionNextAction | null;
  projection?: Record<string, unknown>;
  pull_request?: Record<string, unknown>;
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
