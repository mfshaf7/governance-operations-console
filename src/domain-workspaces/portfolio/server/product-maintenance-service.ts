import {
  consoleProductMaintenanceModeSelected,
  ConsoleRuntimeConfigurationError,
  resolveConsoleProductMaintenanceConfiguration,
} from "../../../console-integration/configuration/console-runtime-configuration.ts";
import type {
  ProductMaintenanceComposition,
} from "../live-runtime/product-maintenance-live-types.ts";
import type {
  GovernedProductPublicationResult,
} from "../live-runtime/product-publication-live-types.ts";
import { readWorkspaceRegistry } from "../../../workspace-registry/server/workspace-registry-oos-client.ts";
import { readProductHealthProjection } from "./product-health-platform-adapter.ts";
import { readGovernedProductPublication } from "./product-publication-oos-client.ts";

export class ProductMaintenanceError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly status: number;

  constructor(
    message: string,
    code: string,
    status = 400,
    retryable = false,
  ) {
    super(message);
    this.name = "ProductMaintenanceError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

export function productMaintenanceConfigured(env: NodeJS.ProcessEnv = process.env) {
  return consoleProductMaintenanceModeSelected(env);
}

export async function readProductMaintenanceComposition(requestId: string) {
  const config = resolveConfiguration();
  const [publication, health, registry] = await Promise.all([
    readGovernedProductPublication(requestId, { config }),
    readProductHealthProjection({ config }),
    readWorkspaceRegistry({ config }),
  ]);
  return compose(publication, health.projection, health.projectionDigest, registry);
}

function compose(
  result: GovernedProductPublicationResult,
  healthProjection: Awaited<ReturnType<typeof readProductHealthProjection>>["projection"],
  healthProjectionDigest: string,
  registry: Awaited<ReturnType<typeof readWorkspaceRegistry>>,
): ProductMaintenanceComposition {
  const maintenance = result.maintenance_projection;
  const health = healthProjection.products.find(
    (candidate) => candidate.productId === maintenance.product_id,
  );
  if (!health) {
    throw new ProductMaintenanceError(
      "Platform product-health evidence does not contain the maintained product.",
      "console_product_health_product_missing",
      502,
    );
  }
  const inventoryRecord = registry.records.find(
    (candidate) => candidate.kind === "product" && candidate.id === maintenance.product_id,
  );
  if (!inventoryRecord) {
    throw new ProductMaintenanceError(
      "Workspace Registry does not contain the maintained product.",
      "console_product_inventory_record_missing",
      502,
    );
  }
  const stale = Date.parse(healthProjection.source.validUntil) <= Date.now();
  return {
    artifact_type: "portfolio-product-maintenance-composition",
    grants: {
      access_restored: false,
      lifecycle_authority: false,
      publication_authority: false,
      release_restored: false,
      runtime_restored: false,
      security_acceptance_granted: false,
    },
    health: stale
      ? {
          ...health,
          availability: { reasonCode: "product-health-evidence-stale", state: "unknown" },
          freshness: "stale",
          issues: { codes: ["product-health-evidence-stale"], state: "unknown" },
        }
      : health,
    inventory_lifecycle: {
      authority_revision: registry.authority_revision,
      last_action: inventoryRecord.last_mutation.action,
      last_mutation_id: inventoryRecord.last_mutation.id,
      posture: inventoryRecord.posture,
      projected_at: registry.projected_at,
      projection_digest: registry.projection_digest,
      record_digest: inventoryRecord.record_digest,
      record_version: inventoryRecord.version,
    },
    maintenance,
    mode: "live",
    product_id: maintenance.product_id,
    request_id: result.request_id,
    schema_version: 1,
    source: {
      health_projection_digest: healthProjectionDigest,
      health_projection_ref: healthProjection.source.reference,
      maintenance_receipt_digest: result.receipt_digest,
      maintenance_receipt_id: result.receipt.receipt_id,
    },
  };
}

function resolveConfiguration() {
  try {
    return resolveConsoleProductMaintenanceConfiguration();
  } catch (error) {
    throw new ProductMaintenanceError(
      error instanceof Error ? error.message : "Product Maintenance configuration is invalid.",
      error instanceof ConsoleRuntimeConfigurationError
        ? error.code
        : "console_product_maintenance_configuration_invalid",
      503,
    );
  }
}
