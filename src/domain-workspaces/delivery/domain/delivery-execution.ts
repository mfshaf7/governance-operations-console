import type {
  DeliveryBackendStatus,
  DeliveryComponentType,
  DeliveryPackagePosture,
  DeliveryTone,
} from "./delivery-common.ts";
import type {
  DeliveryActionScope,
  DeliveryActionType,
  DeliveryReceiptCategory,
} from "./delivery-package.ts";

export type DeliveryBoardSummary = {
  total_packages: number;
  by_posture: Record<DeliveryPackagePosture, number>;
  stale_count: number;
  blocked_count: number;
  closeout_pending_count: number;
};

export type DeliveryFamilyMapGroup = {
  id: string;
  label: string;
  packages: Array<{
    delivery_package_id: string;
    display_name: string;
    legacy_epic_id: number;
    package_posture: DeliveryPackagePosture;
    selected: boolean;
    tone: DeliveryTone;
  }>;
  summary: string;
};

export type DeliveryArtNode = {
  backend_status: DeliveryBackendStatus;
  children: DeliveryArtNode[];
  component_type: DeliveryComponentType;
  description: string;
  id: string;
  legacy_work_package_id: number | null;
  metadata_status: "complete" | "missing" | "not_applicable" | "partial";
  title: string;
  tone: DeliveryTone;
};

export type DeliveryMilestone = {
  checkpoint_kind: DeliveryMilestoneKind;
  evidence_refs?: string[];
  execution_context: string;
  exit_condition: string;
  id: string;
  status: Extract<DeliveryBackendStatus, "done" | "new" | "ready" | "retired">;
  target_pi: string;
  title: string;
};

export type DeliveryMilestoneKind =
  | "external_commitment"
  | "governance_review"
  | "integration_gate"
  | "learning_review"
  | "pi_boundary";

export type DeliverySelectedPackage = {
  active_execution_target_id: string | null;
  advisor_summary: string;
  delivery_package_id: string;
  lineage_refs: {
    architecture_anchor_ref: string | null;
    required_upstream_ref: string | null;
  };
  milestones: DeliveryMilestone[];
  next_execution_target_id: string | null;
  owner_repo: string;
  source_revision: string;
};

export type DeliveryApplyIntent = {
  action_type: DeliveryActionType;
  artifacts: string[];
  advisor_reason: string | null;
  current_backend_status: DeliveryBackendStatus;
  current_package_posture: DeliveryPackagePosture;
  delivery_package_id: string;
  dirty_state: "clean" | "dirty" | "stale";
  expected_backend_route: string | null;
  gate_checks: Array<{
    label: string;
    passed: boolean;
    tone: DeliveryTone;
  }>;
  intent_id: string;
  operator_payload: Record<string, string>;
  receipt_category: DeliveryReceiptCategory | null;
  required_payload_fields: string[];
  scope: DeliveryActionScope;
  source_epic_id: number;
  source_revision: string;
  target_display_name: string;
  target_id: string;
  target_work_item_id?: number;
  target_type: DeliveryComponentType;
};
