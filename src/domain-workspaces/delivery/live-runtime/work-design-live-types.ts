import type { WorkDesignContextDecision, WorkDesignNode } from "../work-model/work-design/work-design-types.ts";

export type WorkDesignLiveMode = "disconnected-preview" | "live";

export type WorkDesignOosNode = {
  children?: WorkDesignOosNode[];
  description: string;
  draft_body: string;
  id: string;
  kind: WorkDesignNode["kind"];
  remark: string;
  title: string;
};

export type WorkDesignOosApplyResult = {
  accepted_draft_digest: string;
  application_id: string;
  applied_at: string;
  applied_by: string;
  correlation_id: string;
  receipt: {
    digest: string;
    ref: string;
  };
  request_id: string;
  schema_version: 1;
  status: "applied" | "reconciled";
  target: {
    created_refs: string[];
    delivery_ref: string;
    readback_complete: true;
    reused_refs: string[];
    updated_refs: string[];
  };
};

export type WorkDesignOosProjection = {
  history: WorkDesignOosApplyResult[];
  latest_application: WorkDesignOosApplyResult | null;
  package_ref: string;
  pending_application_id: string | null;
  projected_at: string;
  schema_version: 1;
  source: {
    ref: string;
    revision: string;
  };
  state: "applied" | "apply-pending" | "not-applied";
};

export type WorkDesignOosAssistResult = {
  affected_node_id?: string | null;
  confidence: "high" | "low" | "medium";
  correlation_id: string;
  evidence: {
    cgg_packet_ref: string;
    gateway_audit_ref: string;
    generated_at: string;
    model_profile_id: "delivery-work-design-advisor-v1";
    output_schema_ref: string;
    redaction_receipt_ref: string;
    task_contract_ref: "oos.delivery-work-design.v1";
  };
  patch_proposal?: {
    patch_type: "context_summary" | "scaffold_text" | "tree_shape";
    summary: string;
  } | null;
  request_id: string;
  required_operator_action: "no_change" | "review";
  response_id: string;
  schema_version: 1;
  status: "ready";
  task_kind: "context_advice" | "tree_advice";
  text: string;
};

export type WorkDesignProjectionSnapshot = {
  error: string | null;
  mode: WorkDesignLiveMode;
  observedAt: string;
  projection: WorkDesignOosProjection | null;
  status: "current" | "offline";
};

export type WorkDesignContextAssistCommand = {
  contextDecision: WorkDesignContextDecision;
  contextNote: string;
  operatorPrompt: string;
  sourceRevision: string;
};

export type WorkDesignTreeAssistCommand = {
  operatorPrompt: string;
  selectedNodeId: string | null;
  sourceRevision: string;
  tree: WorkDesignNode;
};

export type WorkDesignApplyCommand = {
  acceptanceId: string;
  acceptedAt: string;
  advisorEvidence: Array<{
    gatewayAuditRef: string;
    responseId: string;
  }>;
  note: string;
  sourceRevision: string;
  tree: WorkDesignNode;
};

export type WorkDesignLiveApiError = {
  code: string;
  error: string;
  mode: "live";
  status: "offline";
};
