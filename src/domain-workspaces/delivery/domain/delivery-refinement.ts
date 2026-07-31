import type { DeliveryTone } from "./delivery-common.ts";
import type {
  DeliveryWorkDesignDraftNode,
  DeliveryWorkDesignDraftNodeKind,
} from "./delivery-work-design.ts";

export type DeliveryRefinementStepId =
  "apply_refinement" | "metadata_draft" | "readiness_review";

export type DeliveryRefinementPacketStatus =
  "applied" | "blocked" | "drafting" | "ready_for_review" | "stale";

export type DeliveryRefinementFieldStatus =
  "blocked" | "complete" | "dirty" | "missing" | "stale";

export type DeliveryRefinementGateStatus =
  "blocked" | "open" | "passed" | "warning";

export type DeliveryRefinementApplyOperation = {
  detail: string;
  kind: DeliveryRefinementApplyOperationKind;
  label: string;
  operation_id: string;
  oos_route: string;
  status: "planned" | "skipped";
  target: string;
};

export type DeliveryRefinementFieldKind =
  "generated" | "long_text" | "number" | "select" | "short_text";

export type DeliveryRefinementFieldRouteTarget =
  "child_plan" | "initiative" | "work_item";

export type DeliveryRefinementFieldRouteBinding = {
  operation_kind: DeliveryRefinementApplyOperationKind;
  oos_route: string;
  payload_key: string;
  target: DeliveryRefinementFieldRouteTarget;
};

export type DeliveryRefinementHandoffState = {
  finalized_brief_ref: string;
  handoff_note: string;
  source_package_ref: string;
  source_work_design_receipt_id: string;
  status_label: string;
  tone: DeliveryTone;
  tree_snapshot_ref: string;
};

export type DeliveryRefinementDraftField = {
  allowed_values?: string[];
  backend_field: string;
  field_kind: DeliveryRefinementFieldKind;
  label: string;
  required: boolean;
  route_binding: DeliveryRefinementFieldRouteBinding;
  status: DeliveryRefinementFieldStatus;
  target_kinds?: DeliveryWorkDesignDraftNodeKind[];
  target_node_ids?: string[];
  target_statuses?: Record<string, DeliveryRefinementFieldStatus>;
  target_values?: Record<string, string>;
  validation_hint: string;
  value_limit?: number;
  value: string;
};

export type DeliveryRefinementDraftGroup = {
  fields: DeliveryRefinementDraftField[];
  group_id: string;
  summary: string;
  title: string;
  tone: DeliveryTone;
};

export type DeliveryRefinementReadinessGate = {
  detail: string;
  gate_id: string;
  label: string;
  oos_route?: string;
  status: DeliveryRefinementGateStatus;
  tone: DeliveryTone;
};

export type DeliveryRefinementApplyOperationKind =
  | "bulk_update"
  | "governance"
  | "plan_apply"
  | "plan_repair"
  | "work_item_create"
  | "work_item_update";

export type DeliveryRefinementApplyPlan = {
  expected_routes: string[];
  operations: DeliveryRefinementApplyOperation[];
  summary: string;
};

export type DeliveryRefinementMetadataResolution =
  "accepted" | "ai_drafted" | "repaired";

export type DeliveryRefinementApplyReceipt = {
  applied_payload: {
    apply_plan: DeliveryRefinementApplyPlan;
    metadata_resolutions: Record<string, DeliveryRefinementMetadataResolution>;
    metadata_values: Record<string, string>;
    packet_id: string;
  };
  applied_at: string;
  command_name: "delivery.refinement.apply";
  lines: string[];
  outcome: "accepted" | "failed" | "partial";
  receipt_id: string;
  result_state: "recorded";
  schema_version: 1;
  source_work_design_receipt_id: string;
  tone: DeliveryTone;
};

export type DeliveryRefinementPacket = {
  active_step: DeliveryRefinementStepId;
  apply_plan: DeliveryRefinementApplyPlan;
  draft_groups: DeliveryRefinementDraftGroup[];
  handoff: DeliveryRefinementHandoffState;
  last_saved_at: string;
  packet_id: string;
  readiness_gates: DeliveryRefinementReadinessGate[];
  receipt: DeliveryRefinementApplyReceipt | null;
  status: DeliveryRefinementPacketStatus;
  target_tree: DeliveryWorkDesignDraftNode;
};
