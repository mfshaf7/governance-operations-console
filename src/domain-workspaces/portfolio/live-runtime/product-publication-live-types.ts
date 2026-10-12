import type {
  GovernedProductPublicationAction,
  GovernedProductPublicationPosture,
  GovernedProductPublicationTarget,
} from "../work-model/publication/product-publication-audience-model.ts";

export type {
  GovernedProductPublicationAction,
  GovernedProductPublicationPosture,
  GovernedProductPublicationTarget,
} from "../work-model/publication/product-publication-audience-model.ts";

export type GovernedProductPublicationPreviousReceipt = Readonly<{
  publication_posture?: GovernedProductPublicationPosture;
  publication_version: number;
  receipt_digest: string;
  receipt_id: string;
}>;

export type GovernedProductPublicationIntent = Readonly<{
  action: GovernedProductPublicationAction;
  current_publication_posture: GovernedProductPublicationPosture;
  decided_at: string;
  expected_publication_version: number;
  idempotency_key: string;
  manifest_source: Readonly<{
    manifest_digest: string;
    manifest_revision: string;
    path: string;
    repo: string;
    source_revision: string;
  }>;
  operator_reason: string;
  previous_receipt: GovernedProductPublicationPreviousReceipt | null;
  request_id: string;
  requested_at: string;
  schema_version: 1 | 2;
  target_publication: GovernedProductPublicationTarget;
}>;

export type ProductMaintenanceHistoryEvent = Readonly<{
  action: GovernedProductPublicationAction;
  inventory_history_event_ref: Readonly<{
    digest: string;
    id: string;
    sequence: number;
  }> | null;
  inventory_lifecycle_receipt_ref: Readonly<{
    digest: string;
    id: string;
  }> | null;
  publication_posture: GovernedProductPublicationPosture;
  publication_version: number;
  receipt_ref: Readonly<{ digest: string; id: string }>;
  recorded_at: string;
  sequence: number;
}>;

export type ProductMaintenanceProjection = Readonly<{
  evidence_posture: Readonly<{
    findings: readonly Readonly<Record<string, unknown>>[];
    state: "blocked" | "ready" | "stale";
    valid_until: string;
  }>;
  history: readonly ProductMaintenanceHistoryEvent[];
  implications: Readonly<{
    access_restored: false;
    release_restored: false;
    runtime_restored: false;
    security_acceptance_granted: false;
  }>;
  lifecycle: Readonly<{
    history_event_ref: Readonly<{ digest: string; id: string; sequence: number }> | null;
    receipt_ref: Readonly<{ digest: string; id: string }> | null;
    record_digest: string | null;
    record_version: number | null;
    state: "active" | "not-projected" | "retired" | "suspended";
  }>;
  next_action:
    | "correct-owner-evidence-and-submit-new-request"
    | "refresh-portfolio-projection";
  operational_health: "not-projected";
  owner_route: Readonly<{
    manifest_digest: string;
    manifest_id: string;
    repo: string;
    revision: string;
  }>;
  product_id: string;
  publication: Readonly<{
    posture: GovernedProductPublicationPosture;
    receipt_ref:
      | GovernedProductPublicationPreviousReceipt
      | Readonly<{ digest: string; id: string }>
      | null;
    version: number;
  }>;
  schema_version: 1;
}>;

export type GovernedProductPublicationReceipt = Readonly<{
  artifact_type: "product-publication-receipt";
  manifest_digest: string;
  outcome: "applied" | "failed" | "rejected" | "replayed";
  owner_receipt_ref: string;
  packet_id: string;
  product_id: string;
  publication_posture: GovernedProductPublicationPosture | null;
  publication_version: number | null;
  receipt_id: string;
  recorded_at: string;
  request_digest: string;
  request_id: string;
  schema_version: 1 | 2;
  secret_values_embedded: false;
}>;

export type GovernedProductPublicationResult = Readonly<{
  command: Readonly<Record<string, unknown>>;
  command_digest: string;
  cross_boundary_authority_granted: false;
  evaluation: Readonly<Record<string, unknown>>;
  history: readonly Readonly<Record<string, unknown>>[];
  maintenance_projection: ProductMaintenanceProjection;
  next_action:
    | "correct-owner-evidence-and-submit-new-request"
    | "refresh-portfolio-projection";
  owner_receipt: Readonly<{ digest: string; uri: string }>;
  packet: Readonly<Record<string, unknown>>;
  readiness: Readonly<Record<string, unknown>>;
  receipt: GovernedProductPublicationReceipt;
  receipt_digest: string;
  request_id: string;
  resolution: "created" | "read" | "replayed";
  revision: 1;
  schema_version: 1;
  state: "applied" | "rejected";
  workflow_id: "product-publication";
}>;

export type ProductPublicationLiveMode =
  | Readonly<{ mode: "disconnected-preview"; reason_code: string }>
  | Readonly<{ mode: "live"; reason_code: null }>;

export type ProductPublicationLiveApiError = Readonly<{
  code: string;
  error: string;
  mode: "live";
  retryable: boolean;
}>;
