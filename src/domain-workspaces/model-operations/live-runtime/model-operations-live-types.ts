import type { ModelOperationsReadModel } from "../read-model/types/model-operations-types.ts";

export type ModelProfileArtifactRef = Readonly<{
  digest: string;
  uri: string;
}>;

export type ModelProfileRegisteredCaller = Readonly<{
  caller_id: string;
  owner_repo: string;
}>;

export type ModelProfileIntent = Readonly<{
  admitted_context_ref: ModelProfileArtifactRef;
  display_name: string;
  human_approval_required: true;
  input_data_classification: "confidential" | "internal" | "public" | "restricted";
  intended_purpose: string;
  operational_expectations: string[];
  operator_justification: string;
  profile_id: string | null;
  registered_callers: ModelProfileRegisteredCaller[];
  requested_environments: Array<"dev-integration" | "prod" | "stage">;
  requesting_owner: string;
  required_output_schema_ref: Readonly<{
    path: string;
    repo: string;
    version: string;
  }>;
  source: null | Readonly<{
    registry_ref: ModelProfileArtifactRef;
    source_version: string;
  }>;
}>;

export type ModelProfileRequestProjection = Readonly<{
  decision_ref: ModelProfileArtifactRef | null;
  fulfillment: Record<string, unknown> | null;
  fulfillment_state: "applied" | "failed" | "implementing" | "not-started";
  history: ReadonlyArray<Readonly<{
    actor_id: string;
    command_id: string;
    event_type: string;
    fulfillment_state_after: string;
    occurred_at: string;
    receipt_ref: ModelProfileArtifactRef;
    review_state_after: string;
    sequence: number;
    summary: string;
  }>>;
  latest_receipt: Readonly<{
    digest: string;
    receipt_id: string;
    recorded_at: string;
    request_id: string;
    request_revision: number;
  }> & Record<string, unknown>;
  next_action:
    | "await-platform-fulfillment"
    | "begin-platform-fulfillment"
    | "complete"
    | "record-review-decision"
    | "refresh-authoritative-projections"
    | "retry-or-correct-fulfillment"
    | "revise-and-resubmit"
    | "revise-or-submit"
    | "start-review";
  profile_lifecycle_changed: false;
  request: Readonly<{
    correlation_id: string;
    delivery_ref: string | null;
    idempotency_key: string;
    intent: "activate" | "amend" | "create" | "exception" | "retire" | "suspend";
    operator_id: string;
    profile_intent: ModelProfileIntent;
    request_id: string;
    requested_at: string;
    schema_version: 1;
  }>;
  request_id: string;
  requirements: ReadonlyArray<Record<string, unknown>>;
  revision: number;
  review_state:
    | "approved"
    | "changes-required"
    | "draft"
    | "rejected"
    | "submitted"
    | "under-review"
    | "withdrawn";
  schema_version: 1;
  workflow_id: "model-profile-request";
}>;

export type ModelProfileRequestDraft = Readonly<{
  admittedContextDigest: string;
  admittedContextUri: string;
  dataClassification: ModelProfileIntent["input_data_classification"];
  displayName: string;
  environment: ModelProfileIntent["requested_environments"][number];
  justification: string;
  operationalExpectations: string;
  outputSchemaPath: string;
  outputSchemaRepo: string;
  outputSchemaVersion: string;
  ownerRepo: string;
  purpose: string;
  registeredCallers: string;
  requestId: string;
}>;

export type ModelOperationsLiveSnapshot = Readonly<{
  error: string | null;
  mode: "disconnected-preview" | "live";
  observedAt: string;
  readModel: ModelOperationsReadModel | null;
  requests: ModelProfileRequestProjection[];
  source: null | Readonly<{
    lifecycleReceiptDigest: string;
    mergedReadbackDigest: string;
    projectionDigest: string;
    sourceVersion: string;
  }>;
  status: "current" | "offline";
}>;

export type ModelOperationsLiveApiError = Readonly<{
  code: string;
  error: string;
  mode: "live";
  status: "offline";
}>;

export type ModelOperationsOperatingProjection = Readonly<{
  console_mutation_authority: false;
  next_action: "complete";
  oos_request_ref: Readonly<{
    receipt_digest: string;
    request_id: string;
    revision: number;
  }>;
  platform_source_ref: Readonly<{
    lifecycle_receipt_digest: string;
    merged_readback_digest: string;
  }>;
  projection_state: "current";
  workflow_id: "model-operations-live-projection";
}>;
