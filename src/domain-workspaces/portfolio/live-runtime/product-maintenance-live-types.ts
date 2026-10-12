import type {
  ProductMaintenanceProjection,
} from "./product-publication-live-types.ts";

export type ProductHealthAvailability =
  | "available"
  | "degraded"
  | "unavailable"
  | "unknown";

export type ProductHealthProjection = Readonly<{
  environment: Readonly<{
    lane: "dev-integration";
    profile: string;
  }>;
  grants: Readonly<{
    lifecycle_mutation: false;
    publication_authority: false;
    release_authority: false;
    runtime_mutation: false;
    security_acceptance: false;
  }>;
  products: readonly Readonly<{
    availability: Readonly<{
      reasonCode: string | null;
      state: ProductHealthAvailability;
    }>;
    evidence: readonly Readonly<{
      componentId: string;
      sourceRef: string;
      state: Exclude<ProductHealthAvailability, "unknown">;
    }>[];
    freshness: "current" | "stale";
    issues: Readonly<{
      codes: readonly string[];
      state: "attention" | "clear" | "unknown";
    }>;
    observedAt: string;
    platformOwner: string;
    productId: string;
    productRecordRef: string;
    productRecordVersion: number;
    recovery: Readonly<{
      owner: string;
      runbookRef: string;
    }>;
    runtimeOwner: string;
  }>[];
  schemaVersion: "portfolio-product-runtime-health/v1";
  source: Readonly<{
    authority: "platform-engineering";
    inventoryAuthority: Readonly<{
      digest: string;
      path: "contracts/products.yaml";
      repo: "workspace-governance";
      revision: string;
    }>;
    observedAt: string;
    reference: string;
    runtimeObservationDigest: string;
    runtimeObservationRef: string;
    validUntil: string;
  }>;
}>;

export type ProductMaintenanceComposition = Readonly<{
  artifact_type: "portfolio-product-maintenance-composition";
  grants: Readonly<{
    access_restored: false;
    lifecycle_authority: false;
    publication_authority: false;
    release_restored: false;
    runtime_restored: false;
    security_acceptance_granted: false;
  }>;
  health: ProductHealthProjection["products"][number];
  inventory_lifecycle: Readonly<{
    authority_revision: string;
    last_action: string;
    last_mutation_id: string;
    posture: "active" | "retired" | "suspended";
    projected_at: string;
    projection_digest: string;
    record_digest: string;
    record_version: number;
  }>;
  maintenance: ProductMaintenanceProjection;
  mode: "live";
  product_id: string;
  request_id: string;
  schema_version: 1;
  source: Readonly<{
    health_projection_digest: string;
    health_projection_ref: string;
    maintenance_receipt_digest: string;
    maintenance_receipt_id: string;
  }>;
}>;

export type ProductMaintenanceMode =
  | Readonly<{
      health: null;
      mode: "disconnected-preview";
      reason_code: string;
    }>
  | Readonly<{
      health: null;
      mode: "live";
      reason_code: null;
    }>;

export type ProductMaintenanceApiError = Readonly<{
  code: string;
  error: string;
  mode: "live";
  retryable: boolean;
}>;
