import type {
  DeliveryCatalogGroup,
  DeliveryCatalogItem,
  DeliveryCatalogValue,
} from "../read-model/index.ts";
import type {
  CatalogMutationSubmit,
  DeliveryCatalogMutationMode,
} from "../work-model/catalog/catalog-mutation-types.ts";

export type CatalogLiveMode = "disconnected-preview" | "live";

export type CatalogRepositoryReadiness = {
  catalog_value_key: string;
  receipt: {
    digest: string;
    evaluated_at: string;
    generation: number;
    issuer: "workspace-governance-control-fabric";
    outcome: "ready";
    receipt_id: string;
    target_scope: string;
    uri: string;
  };
  repo_name: string;
  repo_ref: string;
};

export type CatalogOosGroup = Omit<DeliveryCatalogGroup, never>;
export type CatalogOosItem = Omit<DeliveryCatalogItem, "tone">;
export type CatalogOosValue = Omit<DeliveryCatalogValue, "tone"> & {
  repository_binding?: CatalogRepositoryReadiness | null;
};

export type CatalogOosProjection = {
  groups: CatalogOosGroup[];
  items: CatalogOosItem[];
  projected_at: string;
  projection_status: "partial" | "ready" | "stale" | "unavailable";
  schema_version: 1;
  source_revision: string;
  summary: {
    drift_count: number;
    missing_route_count: number;
    owner_routed_count: number;
    requestable_count: number;
    total_items: number;
  };
  values: CatalogOosValue[];
};

export type CatalogOosMutationResult = {
  applied_at: string;
  applied_by: string;
  correlation_id: string;
  mutation_id: string;
  readback_complete: true;
  receipt: { digest: string; ref: string };
  related_values: CatalogOosValue[];
  replayed: boolean;
  request_id: string;
  schema_version: 1;
  source_revision: string;
  status: "applied";
  value: CatalogOosValue;
};

export type CatalogProjectionSnapshot = {
  error: string | null;
  mode: CatalogLiveMode;
  observedAt: string;
  projection: CatalogOosProjection | null;
  status: "current" | "offline";
};

export type CatalogMutationCommand = {
  draft: CatalogMutationSubmit;
  mode: DeliveryCatalogMutationMode;
  repositoryReadiness?: CatalogRepositoryReadiness | null;
  targetValueId: string | null;
};

export type CatalogMutationRequest = CatalogMutationCommand & {
  acceptanceId: string;
  acceptedAt: string;
};

export type CatalogLiveApiError = {
  code: string;
  error: string;
  mode: "live";
  status: "offline";
};
