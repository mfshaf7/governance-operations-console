import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";

import {
  ConsoleRuntimeConfigurationError,
  resolveConsoleProductMaintenanceConfiguration,
  type ConsoleProductMaintenanceConfiguration,
} from "../../../console-integration/configuration/console-runtime-configuration.ts";
import type { ProductHealthProjection } from "../live-runtime/product-maintenance-live-types.ts";

const digestPattern = /^sha256:[0-9a-f]{64}$/;
const revisionPattern = /^[0-9a-f]{40}$/;
const maxArtifactBytes = 512 * 1024;
const checkpoints = new Map<string, { observedAt: number; reference: string }>();

export class ProductHealthPlatformError extends Error {
  readonly status = 503;
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "ProductHealthPlatformError";
    this.code = code;
  }
}

export async function readProductHealthProjection(
  options: { config?: ConsoleProductMaintenanceConfiguration; now?: Date } = {},
) {
  let config: ConsoleProductMaintenanceConfiguration;
  try {
    config = options.config ?? resolveConsoleProductMaintenanceConfiguration();
  } catch (error) {
    throw new ProductHealthPlatformError(
      error instanceof Error ? error.message : "Product health configuration is invalid.",
      error instanceof ConsoleRuntimeConfigurationError
        ? error.code
        : "console_product_health_configuration_invalid",
    );
  }
  const [projectionValue, receipt] = await Promise.all([
    readPrivateJson(config.healthProjectionPath),
    readPrivateJson(config.healthReceiptPath),
  ]);
  const projection = assertProjection(projectionValue);
  assertReceipt(receipt, projection, options.now ?? new Date());
  remember(config.healthProjectionPath, projection);
  return { projection, projectionDigest: digest(projection) };
}

function assertProjection(value: Record<string, unknown>): ProductHealthProjection {
  exactKeys(value, ["environment", "grants", "products", "schemaVersion", "source"]);
  if (value.schemaVersion !== "portfolio-product-runtime-health/v1") invalid();
  const environment = record(value.environment);
  exactKeys(environment, ["lane", "profile"]);
  if (environment.lane !== "dev-integration") invalid();
  text(environment.profile);

  const source = record(value.source);
  exactKeys(source, [
    "authority", "inventoryAuthority", "observedAt", "reference",
    "runtimeObservationDigest", "runtimeObservationRef", "validUntil",
  ]);
  if (
    source.authority !== "platform-engineering" ||
    !/^platform-product-health:\/\/[a-f0-9]{64}$/.test(text(source.reference)) ||
    !/^platform-runtime-observation:\/\/[a-f0-9]{64}$/.test(text(source.runtimeObservationRef)) ||
    !digestPattern.test(text(source.runtimeObservationDigest))
  ) invalid();
  const observedAt = timestamp(source.observedAt);
  const validUntil = timestamp(source.validUntil);
  if (validUntil <= observedAt) invalid();
  const inventory = record(source.inventoryAuthority);
  exactKeys(inventory, ["digest", "path", "repo", "revision"]);
  if (
    inventory.repo !== "workspace-governance" ||
    inventory.path !== "contracts/products.yaml" ||
    !digestPattern.test(text(inventory.digest)) ||
    !revisionPattern.test(text(inventory.revision))
  ) invalid();

  const grants = record(value.grants);
  exactKeys(grants, [
    "lifecycle_mutation", "publication_authority", "release_authority",
    "runtime_mutation", "security_acceptance",
  ]);
  if (Object.values(grants).some((grant) => grant !== false)) invalid();
  if (!Array.isArray(value.products) || value.products.length === 0) invalid();
  const products = value.products.map((candidate) => assertProduct(candidate, observedAt));
  if (new Set(products.map((product) => product.productId)).size !== products.length) invalid();

  const projection = value as ProductHealthProjection;
  const expectedReference = `platform-product-health://${createHash("sha256")
    .update(canonical({
      ...projection,
      source: Object.fromEntries(
        Object.entries(projection.source).filter(([key]) => key !== "reference"),
      ),
    }))
    .digest("hex")}`;
  if (projection.source.reference !== expectedReference) invalid();
  return projection;
}

function assertProduct(value: unknown, sourceObservedAt: number) {
  const product = record(value);
  exactKeys(product, [
    "availability", "evidence", "freshness", "issues", "observedAt",
    "platformOwner", "productId", "productRecordRef", "productRecordVersion",
    "recovery", "runtimeOwner",
  ]);
  if (
    !/^product:[a-z0-9][a-z0-9._-]*$/.test(text(product.productId)) ||
    !/^workspace-governance:\/\/products\/[a-z0-9][a-z0-9._-]*\/v[0-9]+$/.test(text(product.productRecordRef)) ||
    !Number.isSafeInteger(product.productRecordVersion) || Number(product.productRecordVersion) < 1 ||
    timestamp(product.observedAt) !== sourceObservedAt
  ) invalid();
  identifier(product.platformOwner);
  identifier(product.runtimeOwner);
  oneOf(product.freshness, ["current", "stale"]);
  const availability = record(product.availability);
  exactKeys(availability, ["reasonCode", "state"]);
  oneOf(availability.state, ["available", "degraded", "unavailable", "unknown"]);
  if (availability.reasonCode !== null) text(availability.reasonCode);
  if (!Array.isArray(product.evidence)) invalid();
  for (const candidate of product.evidence) {
    const evidence = record(candidate);
    exactKeys(evidence, ["componentId", "sourceRef", "state"]);
    identifier(evidence.componentId);
    if (!text(evidence.sourceRef).startsWith("kubernetes://")) invalid();
    oneOf(evidence.state, ["available", "degraded", "unavailable"]);
  }
  const issues = record(product.issues);
  exactKeys(issues, ["codes", "state"]);
  oneOf(issues.state, ["attention", "clear", "unknown"]);
  if (!Array.isArray(issues.codes) || issues.codes.some((code) => typeof code !== "string" || !code)) invalid();
  const recovery = record(product.recovery);
  exactKeys(recovery, ["owner", "runbookRef"]);
  identifier(recovery.owner);
  text(recovery.runbookRef);
  return product as ProductHealthProjection["products"][number];
}

function assertReceipt(
  value: Record<string, unknown>,
  projection: ProductHealthProjection,
  now: Date,
) {
  exactKeys(value, [
    "action", "counts", "freshness", "observed_at", "policy_digest",
    "product_count", "projection_digest", "projection_reference", "schema_version",
    "secret_values_embedded", "valid_until",
  ]);
  const stale = now.getTime() > timestamp(projection.source.validUntil);
  if (
    value.schema_version !== 1 || value.action !== "project-product-health" ||
    value.secret_values_embedded !== false ||
    value.projection_reference !== projection.source.reference ||
    value.projection_digest !== digest(projection) ||
    value.observed_at !== projection.source.observedAt ||
    value.valid_until !== projection.source.validUntil ||
    value.product_count !== projection.products.length ||
    value.freshness !== (stale ? "stale" : "current") ||
    !digestPattern.test(text(value.policy_digest))
  ) invalid("The Platform product-health receipt does not bind the exact projection.");
  const counts = record(value.counts);
  exactKeys(counts, ["available", "degraded", "unavailable", "unknown"]);
  const expected = { available: 0, degraded: 0, unavailable: 0, unknown: 0 };
  for (const product of projection.products) {
    expected[stale ? "unknown" : product.availability.state] += 1;
  }
  if (canonical(value.counts) !== canonical(expected)) invalid();
}

async function readPrivateJson(path: string) {
  try {
    const info = await lstat(path);
    if (
      !info.isFile() || info.isSymbolicLink() || (info.mode & 0o777) !== 0o600 ||
      (typeof process.getuid === "function" && info.uid !== process.getuid()) ||
      info.size <= 0 || info.size > maxArtifactBytes
    ) invalid("A Platform product-health evidence file is not operator-private.");
    return record(JSON.parse(await readFile(path, "utf8")));
  } catch (error) {
    if (error instanceof ProductHealthPlatformError) throw error;
    throw new ProductHealthPlatformError(
      "Platform product-health evidence could not be read safely.",
      "console_product_health_evidence_invalid",
    );
  }
}

function remember(path: string, projection: ProductHealthProjection) {
  const next = { observedAt: timestamp(projection.source.observedAt), reference: projection.source.reference };
  const current = checkpoints.get(path);
  if (current && (next.observedAt < current.observedAt ||
    (next.observedAt === current.observedAt && next.reference !== current.reference))) {
    throw new ProductHealthPlatformError(
      "The Platform product-health projection is older than accepted evidence.",
      "console_product_health_replayed",
    );
  }
  checkpoints.set(path, next);
}

function digest(value: unknown) {
  return `sha256:${createHash("sha256").update(canonical(value)).digest("hex")}`;
}
function canonical(value: unknown): string {
  if (value === null || ["boolean", "number", "string"].includes(typeof value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (isRecord(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  invalid();
}
function exactKeys(value: Record<string, unknown>, expected: readonly string[]) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) invalid();
}
function record(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) invalid();
  return value;
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function text(value: unknown) {
  if (typeof value !== "string" || !value) invalid();
  return value;
}
function identifier(value: unknown) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(text(value))) invalid();
}
function oneOf<T>(value: unknown, choices: readonly T[]): T {
  if (!choices.includes(value as T)) invalid();
  return value as T;
}
function timestamp(value: unknown) {
  const parsed = Date.parse(text(value));
  if (!Number.isFinite(parsed)) invalid();
  return parsed;
}
function invalid(message = "Platform product-health evidence is invalid."): never {
  throw new ProductHealthPlatformError(message, "console_product_health_evidence_invalid");
}
