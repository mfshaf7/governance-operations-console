import type {
  DeliveryBackendStatus,
  DeliveryPackagePosture,
  DeliveryTone,
  DeliveryWorkflowPhase,
} from "./delivery-common.ts";
import type { OperationResolvedSourceCustody } from "../../operation-contracts/source-custody.ts";
import type { DeliveryRefinementPacket } from "./delivery-refinement.ts";
import type {
  DeliveryWorkDesignBlockerMetadata,
  DeliveryWorkDesignBoardLooseItem,
  DeliveryWorkDesignBoardSketchStroke,
  DeliveryWorkDesignContextDecision,
  DeliveryWorkDesignDraftNode,
  DeliveryWorkDesignInitialStep,
  DeliveryWorkDesignSnapshotArtifact,
} from "./delivery-work-design.ts";

export type DeliveryActionType =
  | "ask-advisor"
  | "block"
  | "clear-blocker"
  | "continue-remaining-work"
  | "defer"
  | "edit-work-tree"
  | "open-audit-trail"
  | "open-closeout"
  | "open-details"
  | "resume"
  | "retire"
  | "start-work"
  | "sync-owner-repo"
  | "view-art-tree";

export type DeliveryActionScope =
  "execution_target" | "package" | "package_with_children" | "read_only";

export type DeliveryReceiptCategory =
  | "accepted"
  | "apply_failed"
  | "blocked_by_gate"
  | "projection_sync_required"
  | "rejected";

export type DeliveryBlockerDecisionPath =
  "accept-risk" | "defer" | "remove" | "workaround";

export type DeliveryActiveBlockerProjection = {
  decision_path: DeliveryBlockerDecisionPath;
  discovered_on: string;
  follow_up_owner?: string;
  impact: string;
  justification: string;
  owner: string;
  review_date?: string;
  statement: string;
};

export type DeliveryAvailableAction = {
  action_type: DeliveryActionType;
  enabled: boolean;
  expected_backend_route: string | null;
  label: string;
  reason: string;
  scope: DeliveryActionScope;
  tone: DeliveryTone;
};

export type DeliveryPackageSummary = {
  active_blocker?: DeliveryActiveBlockerProjection;
  available_actions: DeliveryAvailableAction[];
  backend_status: DeliveryBackendStatus;
  delivery_package_id: string;
  display_name: string;
  execution_handoff?: DeliveryExecutionHandoffProjection;
  local_workflow_projection?: DeliveryLocalWorkflowProjection;
  legacy_epic_id: number;
  open_child_count: number;
  package_posture: DeliveryPackagePosture;
  source_custody: OperationResolvedSourceCustody;
  source_ref: string;
  summary: string;
  target_pi: string | null;
  tone: DeliveryTone;
  tree_root_id: string;
  refinement_packet?: DeliveryRefinementPacket;
  work_design_blocker?: DeliveryWorkDesignBlockerMetadata;
  work_design_context_session?: {
    accepted: boolean;
    board_snapshot?: {
      loose_items?: DeliveryWorkDesignBoardLooseItem[];
      nodes: Array<{
        label: string;
        summary: string;
        title: string;
        tone: DeliveryTone;
      }>;
      sketch_strokes?: DeliveryWorkDesignBoardSketchStroke[];
      summary: string;
      title: string;
    };
    carried_metadata?: Array<{
      label: string;
      tone: DeliveryTone;
      value: string;
    }>;
    decision: DeliveryWorkDesignContextDecision;
    finalized_at?: string;
    finalized_by?: string;
    generated_tree?: DeliveryWorkDesignDraftNode;
    initial_step: DeliveryWorkDesignInitialStep;
    locked?: boolean;
    metadata_packet_ref?: string;
    name: string;
    note: string;
    saved_at: string;
    session_ref: string;
    snapshot_artifact?: DeliveryWorkDesignSnapshotArtifact;
    version?: string;
    workspace_snapshot_ref?: string;
  };
  workflow_phase: DeliveryWorkflowPhase;
};

export type DeliveryExecutionHandoffProjection = {
  authority: "prototype-local";
  evidence_refs: string[];
  handed_off_at: string;
  source_package_id: string;
  source_package_version: string;
  source_refinement_receipt_id: string;
  tree_snapshot_ref: string;
};

export type DeliveryPackageFixture = Omit<
  DeliveryPackageSummary,
  "source_custody"
>;

export type DeliveryLocalWorkflowProjection = {
  authority: "prototype-local";
  receipt_id?: string;
  recorded_at?: string;
  status_label: DeliveryPackagePosture;
  summary: string;
  tone: DeliveryTone;
  workflow_phase: DeliveryWorkflowPhase;
};
