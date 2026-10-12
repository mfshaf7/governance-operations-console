import {
  consoleProductMaintenanceModeSelected,
  ConsoleRuntimeConfigurationError,
  resolveConsoleProductMaintenanceConfiguration,
} from "../../../console-integration/configuration/console-runtime-configuration.ts";
import type {
  ProductMaintenanceComposition,
  ProductMaintenanceIntent,
} from "../live-runtime/product-maintenance-live-types.ts";
import type {
  GovernedProductPublicationIntent,
  GovernedProductPublicationResult,
} from "../live-runtime/product-publication-live-types.ts";
import { readProductHealthProjection } from "./product-health-platform-adapter.ts";
import {
  readGovernedProductPublication,
  submitGovernedProductPublication,
} from "./product-publication-oos-client.ts";

const intentPattern = /^product-maintenance-intent:[a-z0-9][a-z0-9._:-]*$/;

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
  const [publication, health] = await Promise.all([
    readGovernedProductPublication(requestId, { config }),
    readProductHealthProjection({ config }),
  ]);
  return compose(publication, health.projection, health.projectionDigest);
}

export async function submitProductMaintenance(value: unknown) {
  const intent = assertIntent(value);
  const config = resolveConfiguration();
  const current = await readGovernedProductPublication(intent.expected_source.request_id, { config });
  assertExpectedSource(intent, current);
  const result = await submitGovernedProductPublication(
    maintenancePublicationIntent(intent, current),
    { config },
  );
  const health = await readProductHealthProjection({ config });
  return compose(result, health.projection, health.projectionDigest);
}

function compose(
  result: GovernedProductPublicationResult,
  healthProjection: Awaited<ReturnType<typeof readProductHealthProjection>>["projection"],
  healthProjectionDigest: string,
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

function maintenancePublicationIntent(
  intent: ProductMaintenanceIntent,
  current: GovernedProductPublicationResult,
): GovernedProductPublicationIntent {
  const maintenance = current.maintenance_projection;
  const command = current.command as GovernedProductPublicationIntent;
  const currentPosture = maintenance.publication.posture;
  return {
    action: intent.action,
    current_publication_posture: currentPosture,
    decided_at: intent.decided_at,
    expected_publication_version: maintenance.publication.version,
    idempotency_key: intent.intent_id,
    manifest_source: structuredClone(command.manifest_source),
    operator_reason: intent.reason,
    previous_receipt: {
      publication_posture: currentPosture,
      publication_version: maintenance.publication.version,
      receipt_digest: current.receipt_digest,
      receipt_id: current.receipt.receipt_id,
    },
    request_id: `product-publication-request:console:maintenance:${intent.intent_id.slice("product-maintenance-intent:".length)}`,
    requested_at: intent.decided_at,
    schema_version: 2,
    target_publication: intent.action === "archive"
      ? {
          access_class: "historical-read-only",
          audience: "historical",
          listing_scope: "historical-archive",
          posture: "archived",
        }
      : {
          access_class: null,
          audience: null,
          listing_scope: null,
          posture: "unlisted",
        },
  };
}

function assertExpectedSource(intent: ProductMaintenanceIntent, current: GovernedProductPublicationResult) {
  const source = intent.expected_source;
  const maintenance = current.maintenance_projection;
  if (
    source.receipt_id !== current.receipt.receipt_id ||
    source.receipt_digest !== current.receipt_digest ||
    source.publication_version !== maintenance.publication.version ||
    source.publication_posture !== maintenance.publication.posture ||
    source.lifecycle_state !== maintenance.lifecycle.state ||
    source.lifecycle_record_digest !== maintenance.lifecycle.record_digest
  ) {
    throw new ProductMaintenanceError(
      "The reviewed maintenance intent is stale or bound to different owner evidence.",
      "product_maintenance_source_conflict",
      409,
    );
  }
  if (intent.action === "archive" && maintenance.lifecycle.state !== "active") {
    throw new ProductMaintenanceError("Only an active product can be archived.", "product_maintenance_transition_invalid", 409);
  }
  if (intent.action === "restore" && maintenance.lifecycle.state !== "retired") {
    throw new ProductMaintenanceError("Only a retired product can be restored.", "product_maintenance_transition_invalid", 409);
  }
}

function assertIntent(value: unknown): ProductMaintenanceIntent {
  if (!isRecord(value)) invalid();
  exactKeys(value, ["action", "decided_at", "expected_source", "intent_id", "reason"]);
  if (!new Set(["archive", "restore"]).has(String(value.action))) invalid();
  if (!intentPattern.test(text(value.intent_id))) invalid();
  timestamp(value.decided_at);
  if (text(value.reason).length < 10) invalid();
  const source = record(value.expected_source);
  exactKeys(source, [
    "lifecycle_record_digest", "lifecycle_state", "publication_posture",
    "publication_version", "receipt_digest", "receipt_id", "request_id",
  ]);
  if (!/^product-publication-request:[a-z0-9][a-z0-9._:-]*$/.test(text(source.request_id))) invalid();
  if (!/^sha256:[0-9a-f]{64}$/.test(text(source.receipt_digest)) ||
      !/^sha256:[0-9a-f]{64}$/.test(text(source.lifecycle_record_digest))) invalid();
  if (!Number.isSafeInteger(source.publication_version) || Number(source.publication_version) < 0) invalid();
  if (!new Set(["active", "retired", "suspended"]).has(String(source.lifecycle_state))) invalid();
  if (!new Set(["archived", "client", "internal", "public", "unlisted"]).has(String(source.publication_posture))) invalid();
  text(source.receipt_id);
  return value as ProductMaintenanceIntent;
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
function exactKeys(value: Record<string, unknown>, expected: readonly string[]) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) invalid();
}
function record(value: unknown) {
  if (!isRecord(value)) invalid();
  return value;
}
function text(value: unknown) {
  if (typeof value !== "string" || !value) invalid();
  return value;
}
function timestamp(value: unknown) {
  if (!Number.isFinite(Date.parse(text(value)))) invalid();
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function invalid(): never {
  throw new ProductMaintenanceError("Product Maintenance intent is invalid.", "product_maintenance_intent_invalid");
}
