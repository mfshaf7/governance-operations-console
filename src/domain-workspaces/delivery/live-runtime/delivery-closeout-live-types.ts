export type DeliveryCloseoutMode = "disconnected-preview" | "live";

export type DeliveryCloseoutNextAction = {
  authority: string;
  code: string;
  label: string;
};

export type DeliveryCloseoutReceipt = {
  digest: string;
  ref: string;
};

export type DeliveryCloseoutValidationBehavior = {
  catalog_refs: string[];
  notes: string;
  posture: string;
  wgcf_graph_role: string;
};

type DeliveryCloseoutCandidateBase = {
  candidate_ref: string;
  candidate_version: string;
  canonical_key: string;
  correlation_ref: string;
  evidence_refs: string[];
  name: string;
  source_owner_ref: string;
};

export type DeliveryCloseoutWorkspaceCandidate =
  | (DeliveryCloseoutCandidateBase & {
      entrant_kind: "repository";
      intake_metadata: {
        repo_class: string;
        requires_security_bindings: boolean;
        security_owner: string | null;
        validation_behavior: DeliveryCloseoutValidationBehavior;
      };
    })
  | (DeliveryCloseoutCandidateBase & {
      entrant_kind: "product";
      intake_metadata: {
        intended_endpoint: string;
        platform_owner: string;
        runtime_owner: string;
        security_owner: string;
        source_owners: string[];
        validation_behavior: DeliveryCloseoutValidationBehavior;
      };
    })
  | (DeliveryCloseoutCandidateBase & {
      entrant_kind: "component";
      intake_metadata: {
        component_class: string;
        owner_repo: string;
        product: string | null;
        security_owner: string;
        validation_behavior: DeliveryCloseoutValidationBehavior;
      };
    });

export type DeliveryCloseoutImpact =
  | { kind: "none" }
  | {
      candidate: DeliveryCloseoutWorkspaceCandidate;
      kind: "workspace_entrant";
    }
  | {
      active_product: {
        product_id: string;
        registry_ref: string;
        registry_version: string;
      };
      change_summary: string;
      kind: "existing_product_change";
      product_owner_ref: string;
    };

export type DeliveryCloseoutEvidence = {
  changed_surfaces: string;
  completion_note?: string;
  completion_summary: string;
  demo_date?: string;
  demo_evidence: string;
  demo_follow_up?: string;
  demo_outcome: string;
  demo_summary: string;
  evidence_refs: string[];
  inspect_action_items: string;
  inspect_date?: string;
  inspect_follow_up?: string;
  inspect_summary: string;
  residual_follow_up?: string;
  test_result_evidence: string;
  validation_evidence: string;
};

export type DeliveryCloseoutOperation = {
  payload: {
    evidence: DeliveryCloseoutEvidence;
    impact: DeliveryCloseoutImpact;
  };
  type: "apply_closeout";
};

export type DeliveryCloseoutEvent = {
  command_digest: string;
  command_id: string;
  delivery_id: string;
  effect: Record<string, unknown>;
  event_id: string;
  impact: DeliveryCloseoutImpact;
  next_action: DeliveryCloseoutNextAction;
  occurred_at: string;
  operation_type: "apply_closeout";
  operator_id: string;
  outcome_ref: string;
  receipt: DeliveryCloseoutReceipt;
  schema_version: 1;
  source_revision_after: string;
  source_revision_before: string;
  status: "accepted" | "applied" | "partial_failure" | "rejected";
};

export type DeliveryCloseoutProjection = {
  delivery_id: string;
  last_event_ref: string | null;
  next_action: DeliveryCloseoutNextAction;
  outcome_history: DeliveryCloseoutEvent[];
  package: {
    status: string;
    subject: string;
  };
  projected_at: string;
  projection_state: "closed" | "not_ready" | "ready" | "reconciliation_required";
  readiness: {
    counts: {
      blocked: number;
      open_descendants: number;
      weak_done_narrative: number;
      weak_evidence: number;
      without_evidence: number;
      without_owner: number;
    };
    evidence_refs: string[];
    readiness_ref: string;
    ready_for_closing: boolean;
    ready_for_closeout: boolean;
    reasons: string[];
  };
  record_ref: string;
  schema_version: 1;
  source_revision: string;
};

export type DeliveryCloseoutResult = {
  after: DeliveryCloseoutRevisionEvidence;
  before: DeliveryCloseoutRevisionEvidence;
  command_id: string;
  event: DeliveryCloseoutEvent;
  next_action: DeliveryCloseoutNextAction;
  receipt: DeliveryCloseoutReceipt;
  replayed: boolean;
  schema_version: 1;
  status: "applied" | "partial_failure" | "rejected";
};

export type DeliveryCloseoutRevisionEvidence = {
  record_ref: string;
  source_revision: string;
};

export type DeliveryCloseoutSnapshot = {
  error: string | null;
  mode: DeliveryCloseoutMode;
  observedAt: string;
  projection: DeliveryCloseoutProjection | null;
  status: "current" | "offline";
};

export type DeliveryCloseoutCommandResult = {
  error: null;
  mode: "live";
  observedAt: string;
  result: DeliveryCloseoutResult;
  status: "current";
};

export type DeliveryCloseoutLiveApiError = {
  code: string;
  details?: unknown;
  error: string;
  mode: "live";
  nextAction?: DeliveryCloseoutNextAction;
  retryable?: boolean;
  status: "offline";
};
