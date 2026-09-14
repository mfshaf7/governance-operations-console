export type PrototypeClosureAction =
  | "apply-delivery"
  | "graduate-source"
  | "retire-incubation"
  | "reopen-incubation";

export type PrototypeClosureLifecycle =
  | "exploring"
  | "candidate"
  | "baseline-approved"
  | "graduating"
  | "retired"
  | "graduated";

export type PrototypeClosureHistoryEvent = Readonly<{
  event_id: string;
  event_type:
    | "delivery-accepted"
    | "source-graduated"
    | "incubation-retired"
    | "incubation-reopened";
  request_ref: string;
  expected_source_revision: string;
  previous_lifecycle: PrototypeClosureLifecycle;
  observed_lifecycle: PrototypeClosureLifecycle;
  previous_source_custody: string;
  observed_source_custody: string;
  recorded_at: string;
}>;

export type PrototypeClosurePreparation = Readonly<{
  schema_version: 1;
  workflow_id: "prototype-closure";
  prototype_id: string;
  authority_revision: string;
  expected_state: Readonly<{
    source_revision: string;
    record_digest: string;
    lifecycle: PrototypeClosureLifecycle;
    source_custody: "incubation-repo" | "dedicated-owner-repo" | "shared-owner-repo" | null;
    design_baseline_ref: string | null;
    delivery_packet_ref: string | null;
    accepted_delivery_target_receipt_ref: string | null;
    retirement_ref: string | null;
    project_phase: string | null;
  }>;
  history: readonly PrototypeClosureHistoryEvent[];
  canonical_mutation: false;
  canonical_authority: Readonly<{
    repo: "workspace-prototype-studio";
    branch: "main";
    registry_path: "prototypes.yaml";
  }>;
}>;

export type PrototypeClosureRequestFields = Readonly<{
  accepted_baseline_receipt_ref?: string;
  target_kind?: "new-delivery-epic" | "existing-delivery-item";
  target_delivery_ref?: string;
  accepted_delivery_target_receipt_ref?: string;
  durable_owner_ref?: string;
  durable_repo_ref?: string;
  durable_owner_acceptance_ref?: string;
  transfer_strategy?: "transfer" | "already-owned";
  already_owned_source_proof_ref?: string;
  retirement_reason?: string;
  retention_plan_ref?: string;
  runtime_disposition_plan_ref?: string;
  prior_retirement_receipt_ref?: string;
}>;

export type PrototypeClosureIntent = Readonly<{
  action: PrototypeClosureAction;
  fields: PrototypeClosureRequestFields;
  preparation: PrototypeClosurePreparation;
  request_id: string;
}>;

export type PrototypeClosureResult = Readonly<{
  schema_version: 1;
  workflow_id: "prototype-closure";
  request_id: string;
  prototype_id: string;
  action: PrototypeClosureAction;
  status:
    | "accepted"
    | "evaluating"
    | "decision-required"
    | "reconciling"
    | "preparing"
    | "review-required"
    | "pending-readback"
    | "pending-runtime-disposition"
    | "cancelling"
    | "succeeded"
    | "denied"
    | "failed";
  next_action: string;
  revision: number;
  request: Readonly<{
    request_id: string;
    prototype_id: string;
    action: PrototypeClosureAction;
    operator_id: string;
    expected_lifecycle: PrototypeClosureLifecycle;
    expected_source_revision: string;
  }>;
  history: readonly Readonly<{
    sequence: number;
    at: string;
    status: string;
    details: unknown;
  }>[];
  source_snapshot: Readonly<{
    source_revision: string;
    record_digest: string;
    lifecycle: PrototypeClosureLifecycle;
    source_custody: string;
  }> | null;
  readiness: unknown;
  decision: unknown;
  resolved_authority: Readonly<{
    verification: Readonly<{
      state: "accepted";
      source_revision: string;
      evidence_refs: readonly string[];
    }>;
    target_delivery_ref: string | null;
    durable_repo_ref: string | null;
    runtime_disposition_proof_ref: string | null;
    prior_retirement_event_ref: string | null;
  }> | null;
  preparation: unknown;
  review: Readonly<{
    number: number;
    url: string;
    state: string;
    merged: boolean;
    merge_commit: string | null;
    human_reviewed: boolean;
  }> | null;
  readback: Readonly<{
    merged_source_revision: string;
    observed_lifecycle: PrototypeClosureLifecycle;
    observed_source_custody: string;
  }> | null;
  runtime_disposition: Readonly<{
    state: "accepted";
    disposition: "revoked" | "absent";
    ref: string;
  }> | null;
  canonical_mutation: boolean;
  runtime_activation: false;
  receipt: Readonly<{
    receipt_id: string;
    outcome: "completed" | "denied" | "failed";
    observed_lifecycle: PrototypeClosureLifecycle;
    observed_source_custody: string;
    recorded_at: string;
  }> | null;
  failure: Readonly<{ code: string; message: string }> | null;
}>;

export type PrototypeClosureApiError = Readonly<{
  code: string;
  error: string;
  retryable: boolean;
}>;
