export type DeliveryChangeMode = "disconnected-preview" | "live";

export type DeliveryChangeNode = {
  children: DeliveryChangeNode[];
  id: number;
  record_ref: string;
  status: string;
  subject: string;
  type: string;
};

export type DeliveryChangeProjection = {
  delivery_id: string;
  last_event_ref: string | null;
  package: {
    dependency_relations: Record<string, unknown>[];
    execution_tree: DeliveryChangeNode;
  };
  projected_at: string;
  projection_state: "current";
  record_ref: string;
  schema_version: 1;
  source_revision: string;
};

export type DeliveryChangeCatalogRequest = Record<string, unknown>;

export type DeliveryChangeOperation =
  | {
      payload: {
        acceptance_criteria?: string | null;
        definition_of_done?: string | null;
        definition_of_ready?: string | null;
        delivery_team?: string | null;
        description?: string | null;
        execution_classification?: string | null;
        iteration?: string | null;
        nfr_category?: string | null;
        owner_repo?: string | null;
        parent_work_item_id: string;
        status?: string | null;
        subject: string;
        target_pi?: string | null;
        type: string;
      };
      type: "add_work_item";
    }
  | {
      payload: {
        changes: Record<string, boolean | number | string | null>;
        work_item_id: string;
        work_note?: string;
      };
      type: "revise_work_item";
    }
  | {
      payload: {
        new_parent_work_item_id: string;
        work_item_id: string;
        work_note?: string;
      };
      type: "move_work_item";
    }
  | {
      payload: {
        retirement_reason: string;
        work_item_id: string;
        work_note?: string;
      };
      type: "remove_work_item";
    }
  | {
      payload: {
        action: "clear" | "set";
        clear_description?: boolean;
        clear_lag?: boolean;
        depends_on_work_item_id: string;
        description?: string | null;
        lag?: number | null;
        target_work_item_id: string;
      };
      type: "manage_dependency";
    }
  | {
      payload: {
        action: "clear" | "set";
        blocker_decision_path?: string | null;
        blocker_discovered_on?: string | null;
        blocker_follow_up_owner?: string | null;
        blocker_impact?: string | null;
        blocker_justification?: string | null;
        blocker_owner?: string | null;
        blocker_review_date?: string | null;
        blocker_statement?: string | null;
        resume_status?: string | null;
        work_item_id: string;
      };
      type: "manage_blocker";
    }
  | {
      payload: {
        action: "park" | "resume";
        park_decision?: string | null;
        park_reason?: string | null;
        park_review_date?: string | null;
        resume_status?: string | null;
        work_item_id: string;
        work_note?: string;
      };
      type: "manage_parking";
    }
  | {
      payload: {
        reason: string;
        suggested_repo_name?: string;
        work_item_id: string;
      };
      type: "request_repository";
    }
  | {
      payload: {
        catalog_item_id: string;
        catalog_request: DeliveryChangeCatalogRequest;
        owner_repo: string;
        work_item_id: string;
        work_note?: string;
      };
      type: "link_repository";
    }
  | {
      payload: {
        reason: string;
        target_event_ref: string;
      };
      type: "rollback_change";
    };

export type DeliveryChangeResult = {
  after: DeliveryChangeRevisionEvidence;
  before: DeliveryChangeRevisionEvidence;
  command_id: string;
  event: {
    effect: Record<string, unknown>;
    event_id: string;
    next_action: DeliveryChangeNextAction;
    operation_type: DeliveryChangeOperation["type"];
    receipt: DeliveryChangeReceipt;
    rollback: Record<string, unknown>;
    status: string;
  } & Record<string, unknown>;
  next_action: DeliveryChangeNextAction;
  receipt: DeliveryChangeReceipt;
  replayed: boolean;
  schema_version: 1;
  status: "applied" | "partial_failure" | "rejected" | "routed";
};

export type DeliveryChangeRevisionEvidence = {
  record_ref: string;
  source_revision: string;
};

export type DeliveryChangeReceipt = {
  digest: string;
  ref: string;
};

export type DeliveryChangeNextAction = {
  authority: string;
  code: string;
  label: string;
};

export type DeliveryChangeSnapshot = {
  error: string | null;
  mode: DeliveryChangeMode;
  observedAt: string;
  projection: DeliveryChangeProjection | null;
  status: "current" | "offline";
};

export type DeliveryChangeCommandResult = {
  error: string | null;
  mode: "live";
  observedAt: string;
  result: DeliveryChangeResult;
  status: "current";
};

export type DeliveryChangeLiveApiError = {
  code: string;
  details?: unknown;
  error: string;
  mode: "live";
  nextAction?: DeliveryChangeNextAction;
  retryable?: boolean;
  status: "offline";
};
