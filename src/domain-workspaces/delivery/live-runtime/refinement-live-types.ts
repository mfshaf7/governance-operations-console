import type {
  DeliveryRefinementApplyPlan,
  DeliveryRefinementFieldKind,
  DeliveryRefinementMetadataResolution,
  DeliveryRefinementPacket,
} from "../read-model/index.ts";

export type RefinementLiveMode = "disconnected-preview" | "live";

export type RefinementOosPacket = {
  active_step: DeliveryRefinementPacket["active_step"];
  apply_plan: DeliveryRefinementApplyPlan;
  draft_groups: Array<{
    fields: Array<{
      allowed_values?: string[];
      backend_field: string;
      field_key: string;
      field_kind: DeliveryRefinementFieldKind;
      label: string;
      required: boolean;
      route_binding: {
        operation_kind: DeliveryRefinementApplyPlan["operations"][number]["kind"];
        oos_route: string;
        payload_key: string;
        target: "child_plan" | "initiative" | "work_item";
      };
      status: "blocked" | "complete" | "dirty" | "missing" | "stale";
      target_kinds?: Array<
        "Defect" | "Epic" | "Feature" | "Milestone" | "Risk" | "Task" | "User story"
      >;
      target_node_ids?: string[];
      target_statuses?: Record<string, "blocked" | "complete" | "dirty" | "missing" | "stale">;
      target_values?: Record<string, string>;
      validation_hint: string;
      value: string;
      value_limit?: number;
    }>;
    group_id: string;
    summary: string;
    title: string;
  }>;
  last_saved_at: string;
  packet_id: string;
  packet_revision: string;
  readiness_gates: Array<{
    detail: string;
    gate_id: string;
    label: string;
    oos_route?: string;
    status: "blocked" | "open" | "passed" | "warning";
  }>;
  schema_version: 1;
  source: {
    delivery_id: string;
    finalized_brief_ref: string;
    package_ref: string;
    source_ref: string;
    source_revision: string;
    source_work_design_receipt_id: string;
    tree_snapshot_ref: string;
  };
  status: "applied" | "blocked" | "drafting" | "ready_for_review" | "stale";
  target_tree: RefinementOosTreeNode;
};

export type RefinementOosTreeNode = {
  children: RefinementOosTreeNode[];
  description: string;
  draft_body: string;
  id: string;
  kind: "Defect" | "Epic" | "Feature" | "Milestone" | "PI Objective" | "Risk" | "Task" | "User story";
  remark: string;
  title: string;
};

export type RefinementOosApplyReceipt = {
  accepted_draft_digest: string;
  applied_at: string;
  applied_by: string;
  receipt_digest: string;
  receipt_id: string;
  receipt_ref: string;
  run_id: string;
  source_work_design_receipt_id: string;
  target: {
    created_refs: string[];
    delivery_ref: string;
    readback_complete: true;
    reused_refs: string[];
    source_revision: string;
    updated_refs: string[];
  };
};

export type RefinementOosRun = {
  correlation_id: string;
  events: Array<{
    event_id: string;
    event_type:
      | "accepted"
      | "cancelled"
      | "failed"
      | "operation_completed"
      | "operation_skipped"
      | "operation_started"
      | "readback_completed"
      | "recovered";
    message: string;
    recorded_at: string;
    sequence: number;
    status: "completed" | "failed" | "pending" | "running" | "skipped";
  }>;
  failure: {
    code: string;
    message: string;
    recovery_ref: string | null;
    retryable: boolean;
  } | null;
  poll_ref: string;
  receipt: RefinementOosApplyReceipt | null;
  replayed: boolean;
  request_id: string;
  run_id: string;
  schema_version: 1;
  state: "accepted" | "cancelled" | "completed" | "failed" | "running";
  submitted_at: string;
  updated_at: string;
};

export type RefinementOosProjection = {
  active_run: RefinementOosRun | null;
  history: RefinementOosRun[];
  latest_run: RefinementOosRun | null;
  package_ref: string;
  packet: RefinementOosPacket;
  projected_at: string;
  schema_version: 1;
  source_revision: string;
};

export type RefinementOosAssistResult = {
  confidence: "high" | "low" | "medium";
  correlation_id: string;
  evidence: {
    cgg_packet_ref: string;
    gateway_audit_ref: string;
    generated_at: string;
    model_profile_id: "delivery-refinement-advisor-v1";
    output_schema_ref: string;
    redaction_receipt_ref: string;
    task_contract_ref: "oos.delivery-refinement.v1";
  };
  request_id: string;
  required_operator_action: "no_change" | "review";
  response_id: string;
  schema_version: 1;
  status: "ready";
  suggestion: {
    field_key: string;
    rationale: string;
    resolution: "ai_drafted";
    summary: string;
    value: string;
  };
};

export type RefinementProjectionSnapshot = {
  error: string | null;
  mode: RefinementLiveMode;
  observedAt: string;
  projection: RefinementOosProjection | null;
  status: "current" | "offline";
};

export type RefinementAssistCommand = {
  allowedValues: string[];
  draftValue: string;
  fieldKey: string;
  fieldKind: DeliveryRefinementFieldKind;
  fieldLabel: string;
  operatorPrompt: string;
  required: boolean;
  selectedNodeIds: string[];
  sourceValue: string;
};

export type RefinementApplyCommand = {
  acceptanceId: string;
  acceptedAt: string;
  applyPlan: DeliveryRefinementApplyPlan;
  metadataResolutions: Record<string, DeliveryRefinementMetadataResolution>;
  metadataValues: Record<string, string>;
  note: string;
};

export type RefinementLiveApiError = {
  code: string;
  error: string;
  mode: "live";
  status: "offline";
};
