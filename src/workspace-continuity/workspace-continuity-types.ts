export type WorkspaceContinuityKind = "component" | "product" | "repo";

export type WorkspaceContinuityLineage = Readonly<{
  intake_entry_version: number | null;
  source: "legacy-migration" | "workspace-intake";
  source_digest: string;
  source_ref: string;
}>;

export type WorkspaceContinuityMutation = Readonly<{
  action: "migrate" | "promote" | "restore" | "retire" | "suspend" | "update";
  applied_at: string;
  id: string;
  idempotency_key: string;
  readiness_digest: string | null;
  readiness_ref: string | null;
  request_digest: string | null;
  request_ref: string | null;
}>;

export type WorkspaceContinuityInventoryRecord = Readonly<{
  kind: WorkspaceContinuityKind;
  last_mutation: WorkspaceContinuityMutation;
  lifecycle: string;
  lineage: WorkspaceContinuityLineage;
  name: string;
  posture: "active" | "retired" | "suspended";
  record_digest: string;
  record_id: string;
  record_version: number;
  retired_collection: boolean;
}>;

export type WorkspaceContinuityIntakeRecord = Readonly<{
  decision: Readonly<Record<string, unknown>>;
  decision_source: "ai-suggested" | "operator";
  kind: WorkspaceContinuityKind;
  last_mutation: Readonly<Record<string, unknown>>;
  name: string;
  owner_route: string;
  record_digest: string;
  record_id: string;
  record_version: number;
  source: Readonly<Record<string, unknown>>;
  status: "admitted" | "out-of-scope" | "proposed";
}>;

export type WorkspaceContinuityPublicationReadiness = Readonly<{
  action: string | null;
  actionable: boolean;
  authority_revision: string | null;
  control_state: "current" | "stale" | "unavailable";
  current_publication_posture: string | null;
  expires_at: string | null;
  outcome: string | null;
  product_id: string;
  readiness_ref: Readonly<{ digest: string; uri: string }> | null;
  stale_reasons: readonly (
    | "authority-revision-changed"
    | "expired"
    | "no-readiness-evidence"
  )[];
  target_publication: Readonly<Record<string, unknown>> | null;
}>;

export type WorkspaceContinuityProduct = Readonly<{
  governed_prod_promotion: boolean;
  highest_real_endpoint: string;
  latest_lifecycle_event: Readonly<{
    action: "restore" | "retire" | "suspend" | "update";
    applied_at: string;
    digest: string;
    id: string;
    sequence: number;
  }> | null;
  lifecycle: string;
  lineage: WorkspaceContinuityLineage;
  maturity: "fully-governed" | "owner-managed" | "platform-integrated";
  name: string;
  owners: Readonly<{
    platform: string;
    runtime: string;
    security: string;
    source: readonly string[];
  }>;
  posture: "active" | "retired" | "suspended";
  product_id: string;
  publication_readiness: WorkspaceContinuityPublicationReadiness;
  record_digest: string;
  record_version: number;
  stage_supported: boolean;
}>;

export type WorkspaceContinuityProjection = Readonly<{
  artifact_type: "workspace-continuity-projection";
  authority: Readonly<{
    file_digests: Readonly<Record<string, string>>;
    owner_repo: "workspace-governance";
    revision: string;
  }>;
  authority_boundary: Readonly<{
    canonical_registry: "workspace-governance";
    mutation_authority: "none";
    readiness_projection: "workspace-governance-control-fabric";
    terminal_publication_authority: "operator-orchestration-service";
    workflow_authority: "operator-orchestration-service";
  }>;
  intake: readonly WorkspaceContinuityIntakeRecord[];
  inventory: readonly WorkspaceContinuityInventoryRecord[];
  products: readonly WorkspaceContinuityProduct[];
  projection_digest: string;
  projection_id: string;
  projection_state: "current";
  schema_version: 1;
}>;
