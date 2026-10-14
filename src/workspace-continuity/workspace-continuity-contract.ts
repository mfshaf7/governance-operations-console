import type {
  WorkspaceContinuityInventoryRecord,
  WorkspaceContinuityLineage,
  WorkspaceContinuityProduct,
  WorkspaceContinuityProjection,
  WorkspaceContinuityPublicationReadiness,
} from "./workspace-continuity-types.ts";

const commitPattern = /^[0-9a-f]{40}$/;
const digestPattern = /^sha256:[0-9a-f]{64}$/;
const recordIdPattern = /^(component|product|repo):[a-z0-9][a-z0-9._-]*$/;

export class WorkspaceContinuityContractError extends Error {
  readonly code = "workspace_continuity_projection_invalid";

  constructor(message: string) {
    super(message);
    this.name = "WorkspaceContinuityContractError";
  }
}

export function assertWorkspaceContinuityProjection(
  value: unknown,
): WorkspaceContinuityProjection {
  const projection = object(value, "Workspace continuity projection", [
    "artifact_type",
    "authority",
    "authority_boundary",
    "intake",
    "inventory",
    "products",
    "projection_digest",
    "projection_id",
    "projection_state",
    "schema_version",
  ]);
  exact(projection.schema_version, 1, "schema version");
  exact(projection.artifact_type, "workspace-continuity-projection", "artifact type");
  exact(projection.projection_state, "current", "projection state");
  const authority = object(projection.authority, "continuity authority", [
    "file_digests",
    "owner_repo",
    "revision",
  ]);
  exact(authority.owner_repo, "workspace-governance", "authority owner");
  const revision = commit(authority.revision, "authority revision");
  const fileDigests = freeObject(authority.file_digests, "authority file digests");
  for (const [path, item] of Object.entries(fileDigests)) {
    text(path, "authority digest path");
    digest(item, `authority digest ${path}`);
  }
  const boundary = object(projection.authority_boundary, "authority boundary", [
    "canonical_registry",
    "mutation_authority",
    "readiness_projection",
    "terminal_publication_authority",
    "workflow_authority",
  ]);
  exact(boundary.canonical_registry, "workspace-governance", "canonical registry");
  exact(boundary.readiness_projection, "workspace-governance-control-fabric", "readiness projection");
  exact(boundary.workflow_authority, "operator-orchestration-service", "workflow authority");
  exact(boundary.terminal_publication_authority, "operator-orchestration-service", "publication authority");
  exact(boundary.mutation_authority, "none", "mutation authority");

  const inventory = array(projection.inventory, "continuity inventory").map(parseInventory);
  const intake = array(projection.intake, "continuity intake").map((item) => {
    const record = object(item, "continuity intake record", [
      "decision",
      "decision_source",
      "kind",
      "last_mutation",
      "name",
      "owner_route",
      "record_digest",
      "record_id",
      "record_version",
      "source",
      "status",
    ]);
    const kind = oneOf(record.kind, ["component", "product", "repo"] as const, "intake kind");
    const recordId = recordIdFor(record.record_id, kind, "intake record id");
    return {
      decision: freeObject(record.decision, "intake decision"),
      decision_source: oneOf(record.decision_source, ["ai-suggested", "operator"] as const, "intake decision source"),
      kind,
      last_mutation: freeObject(record.last_mutation, "intake last mutation"),
      name: nameFor(record.name, recordId, "intake name"),
      owner_route: text(record.owner_route, "intake owner route"),
      record_digest: digest(record.record_digest, "intake record digest"),
      record_id: recordId,
      record_version: positiveInteger(record.record_version, "intake record version"),
      source: freeObject(record.source, "intake source"),
      status: oneOf(record.status, ["admitted", "out-of-scope", "proposed"] as const, "intake status"),
    };
  });
  const products = array(projection.products, "continuity products").map(parseProduct);

  const inventoryIds = unique(inventory.map((item) => item.record_id), "inventory identity");
  const intakeIds = unique(intake.map((item) => item.record_id), "intake identity");
  for (const recordId of intakeIds) {
    if (inventoryIds.has(recordId)) invalid(`Continuity identity ${recordId} is both intake and active inventory.`);
  }
  const productIds = unique(products.map((item) => item.product_id), "product identity");
  const inventoryProducts = inventory.filter((item) => item.kind === "product");
  if (productIds.size !== inventoryProducts.length) {
    invalid("Continuity products do not cover the canonical product inventory exactly.");
  }
  for (const product of products) {
    const canonical = inventory.find((item) => item.record_id === product.product_id);
    if (!canonical || !sameProductIdentity(canonical, product)) {
      invalid(`Product ${product.product_id} contradicts canonical inventory.`);
    }
    if (product.publication_readiness.product_id !== product.product_id) {
      invalid(`Product ${product.product_id} has cross-product readiness evidence.`);
    }
    if (
      product.publication_readiness.control_state === "current" &&
      product.publication_readiness.authority_revision !== revision
    ) {
      invalid(`Product ${product.product_id} readiness is bound to a different authority revision.`);
    }
    if (product.maturity !== product.lifecycle) {
      invalid(`Product ${product.product_id} maturity contradicts its lifecycle.`);
    }
    if (
      product.latest_lifecycle_event &&
      (product.latest_lifecycle_event.action !== canonical.last_mutation.action ||
        product.latest_lifecycle_event.applied_at !== canonical.last_mutation.applied_at)
    ) {
      invalid(`Product ${product.product_id} lifecycle history contradicts its last mutation.`);
    }
  }

  const projectionDigest = digest(projection.projection_digest, "projection digest");
  const projectionId = text(projection.projection_id, "projection id");
  if (projectionId !== `workspace-continuity-projection:${projectionDigest.slice(7)}`) {
    invalid("Workspace continuity projection id does not bind its digest.");
  }
  return {
    artifact_type: "workspace-continuity-projection",
    authority: {
      file_digests: Object.fromEntries(Object.entries(fileDigests) as [string, string][]),
      owner_repo: "workspace-governance",
      revision,
    },
    authority_boundary: {
      canonical_registry: "workspace-governance",
      mutation_authority: "none",
      readiness_projection: "workspace-governance-control-fabric",
      terminal_publication_authority: "operator-orchestration-service",
      workflow_authority: "operator-orchestration-service",
    },
    intake,
    inventory,
    products,
    projection_digest: projectionDigest,
    projection_id: projectionId,
    projection_state: "current",
    schema_version: 1,
  };
}

function parseInventory(value: unknown): WorkspaceContinuityInventoryRecord {
  const item = object(value, "continuity inventory record", [
    "kind",
    "last_mutation",
    "lifecycle",
    "lineage",
    "name",
    "posture",
    "record_digest",
    "record_id",
    "record_version",
    "retired_collection",
  ]);
  const kind = oneOf(item.kind, ["component", "product", "repo"] as const, "inventory kind");
  const recordId = recordIdFor(item.record_id, kind, "inventory record id");
  const mutation = object(item.last_mutation, "inventory last mutation", [
    "action",
    "applied_at",
    "id",
    "idempotency_key",
    "readiness_digest",
    "readiness_ref",
    "request_digest",
    "request_ref",
  ]);
  return {
    kind,
    last_mutation: {
      action: oneOf(mutation.action, ["migrate", "promote", "restore", "retire", "suspend", "update"] as const, "mutation action"),
      applied_at: timestamp(mutation.applied_at, "mutation applied_at"),
      id: text(mutation.id, "mutation id"),
      idempotency_key: text(mutation.idempotency_key, "mutation idempotency key"),
      readiness_digest: nullableDigest(mutation.readiness_digest, "mutation readiness digest"),
      readiness_ref: nullableText(mutation.readiness_ref, "mutation readiness ref"),
      request_digest: nullableDigest(mutation.request_digest, "mutation request digest"),
      request_ref: nullableText(mutation.request_ref, "mutation request ref"),
    },
    lifecycle: text(item.lifecycle, "inventory lifecycle"),
    lineage: parseLineage(item.lineage, recordId),
    name: nameFor(item.name, recordId, "inventory name"),
    posture: oneOf(item.posture, ["active", "retired", "suspended"] as const, "inventory posture"),
    record_digest: digest(item.record_digest, "inventory record digest"),
    record_id: recordId,
    record_version: positiveInteger(item.record_version, "inventory record version"),
    retired_collection: boolean(item.retired_collection, "retired collection"),
  };
}

function parseProduct(value: unknown): WorkspaceContinuityProduct {
  const item = object(value, "continuity product", [
    "governed_prod_promotion",
    "highest_real_endpoint",
    "latest_lifecycle_event",
    "lifecycle",
    "lineage",
    "maturity",
    "name",
    "owners",
    "posture",
    "product_id",
    "publication_readiness",
    "record_digest",
    "record_version",
    "stage_supported",
  ]);
  const productId = recordIdFor(item.product_id, "product", "product id");
  const owners = object(item.owners, "product owners", ["platform", "runtime", "security", "source"]);
  const latest = item.latest_lifecycle_event === null
    ? null
    : object(item.latest_lifecycle_event, "latest lifecycle event", ["action", "applied_at", "digest", "id", "sequence"]);
  return {
    governed_prod_promotion: boolean(item.governed_prod_promotion, "governed production promotion"),
    highest_real_endpoint: text(item.highest_real_endpoint, "highest real endpoint"),
    latest_lifecycle_event: latest === null ? null : {
      action: oneOf(latest.action, ["restore", "retire", "suspend", "update"] as const, "lifecycle action"),
      applied_at: timestamp(latest.applied_at, "lifecycle applied_at"),
      digest: digest(latest.digest, "lifecycle event digest"),
      id: text(latest.id, "lifecycle event id"),
      sequence: positiveInteger(latest.sequence, "lifecycle sequence"),
    },
    lifecycle: text(item.lifecycle, "product lifecycle"),
    lineage: parseLineage(item.lineage, productId),
    maturity: oneOf(item.maturity, ["fully-governed", "owner-managed", "platform-integrated"] as const, "product maturity"),
    name: nameFor(item.name, productId, "product name"),
    owners: {
      platform: text(owners.platform, "platform owner"),
      runtime: text(owners.runtime, "runtime owner"),
      security: text(owners.security, "security owner"),
      source: uniqueTextArray(owners.source, "source owners"),
    },
    posture: oneOf(item.posture, ["active", "retired", "suspended"] as const, "product posture"),
    product_id: productId,
    publication_readiness: parseReadiness(item.publication_readiness),
    record_digest: digest(item.record_digest, "product record digest"),
    record_version: positiveInteger(item.record_version, "product record version"),
    stage_supported: boolean(item.stage_supported, "stage support"),
  };
}

function parseReadiness(value: unknown): WorkspaceContinuityPublicationReadiness {
  const item = object(value, "publication readiness", [
    "action",
    "actionable",
    "authority_revision",
    "control_state",
    "current_publication_posture",
    "expires_at",
    "outcome",
    "product_id",
    "readiness_ref",
    "stale_reasons",
    "target_publication",
  ]);
  const controlState = oneOf(item.control_state, ["current", "stale", "unavailable"] as const, "readiness control state");
  const actionable = boolean(item.actionable, "readiness actionable");
  const staleReasons = uniqueEnumArray(item.stale_reasons, ["authority-revision-changed", "expired", "no-readiness-evidence"] as const, "readiness stale reasons");
  if ((controlState !== "current" && actionable) || (controlState === "stale" && staleReasons.length === 0)) {
    invalid("Publication readiness control state contradicts actionability or stale reasons.");
  }
  if (controlState === "unavailable" && (!staleReasons.includes("no-readiness-evidence") || item.readiness_ref !== null)) {
    invalid("Unavailable publication readiness must expose missing evidence without a readiness ref.");
  }
  if (controlState === "current" && staleReasons.length > 0) {
    invalid("Current publication readiness cannot carry stale reasons.");
  }
  if (
    controlState === "unavailable" &&
    [item.action, item.authority_revision, item.current_publication_posture, item.expires_at, item.outcome, item.target_publication]
      .some((field) => field !== null)
  ) {
    invalid("Unavailable publication readiness cannot carry inferred workflow state.");
  }
  const readinessRef = item.readiness_ref === null ? null : object(item.readiness_ref, "readiness ref", ["digest", "uri"]);
  const parsedRef = readinessRef === null ? null : {
    digest: digest(readinessRef.digest, "readiness ref digest"),
    uri: text(readinessRef.uri, "readiness ref uri"),
  };
  if (parsedRef && parsedRef.uri !== `wgcf://readiness/product-publication/${parsedRef.digest.slice(7)}`) {
    invalid("Publication readiness URI does not bind its digest.");
  }
  return {
    action: nullableText(item.action, "readiness action"),
    actionable,
    authority_revision: item.authority_revision === null ? null : commit(item.authority_revision, "readiness authority revision"),
    control_state: controlState,
    current_publication_posture: nullableText(item.current_publication_posture, "current publication posture"),
    expires_at: item.expires_at === null ? null : timestamp(item.expires_at, "readiness expiry"),
    outcome: nullableText(item.outcome, "readiness outcome"),
    product_id: recordIdFor(item.product_id, "product", "readiness product id"),
    readiness_ref: parsedRef,
    stale_reasons: staleReasons,
    target_publication: item.target_publication === null ? null : freeObject(item.target_publication, "target publication"),
  };
}

function parseLineage(value: unknown, recordId: string): WorkspaceContinuityLineage {
  const lineage = object(value, "record lineage", ["intake_entry_version", "source", "source_digest", "source_ref"]);
  const source = oneOf(lineage.source, ["legacy-migration", "workspace-intake"] as const, "lineage source");
  const intakeVersion = lineage.intake_entry_version === null ? null : positiveInteger(lineage.intake_entry_version, "lineage intake version");
  const sourceRef = text(lineage.source_ref, "lineage source ref");
  if ((source === "workspace-intake" && (intakeVersion === null || sourceRef !== recordId)) || (source === "legacy-migration" && intakeVersion !== null)) {
    invalid(`Record ${recordId} has contradictory lineage.`);
  }
  return {
    intake_entry_version: intakeVersion,
    source,
    source_digest: digest(lineage.source_digest, "lineage source digest"),
    source_ref: sourceRef,
  };
}

function sameProductIdentity(inventory: WorkspaceContinuityInventoryRecord, product: WorkspaceContinuityProduct) {
  return inventory.kind === "product" &&
    inventory.name === product.name &&
    inventory.record_version === product.record_version &&
    inventory.record_digest === product.record_digest &&
    inventory.posture === product.posture &&
    inventory.lifecycle === product.lifecycle &&
    JSON.stringify(inventory.lineage) === JSON.stringify(product.lineage);
}

function object(value: unknown, label: string, keys: readonly string[]) {
  const result = freeObject(value, label);
  const actual = Object.keys(result).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) invalid(`${label} has unsupported or missing fields.`);
  return result;
}

function freeObject(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) invalid(`${label} must be an object.`);
  return value as Record<string, unknown>;
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) invalid(`${label} must be an array.`);
  return value;
}

function text(value: unknown, label: string) {
  if (typeof value !== "string" || value.trim().length === 0) invalid(`${label} must be non-empty text.`);
  return value as string;
}

function nullableText(value: unknown, label: string) {
  return value === null ? null : text(value, label);
}

function boolean(value: unknown, label: string) {
  if (typeof value !== "boolean") invalid(`${label} must be boolean.`);
  return value as boolean;
}

function positiveInteger(value: unknown, label: string) {
  if (!Number.isInteger(value) || Number(value) < 1) invalid(`${label} must be a positive integer.`);
  return value as number;
}

function timestamp(value: unknown, label: string) {
  const parsed = text(value, label);
  if (!Number.isFinite(Date.parse(parsed))) invalid(`${label} must be a timestamp.`);
  return parsed;
}

function digest(value: unknown, label: string) {
  const parsed = text(value, label);
  if (!digestPattern.test(parsed)) invalid(`${label} must be a SHA-256 digest.`);
  return parsed;
}

function nullableDigest(value: unknown, label: string) {
  return value === null ? null : digest(value, label);
}

function commit(value: unknown, label: string) {
  const parsed = text(value, label);
  if (!commitPattern.test(parsed)) invalid(`${label} must be a full Git commit.`);
  return parsed;
}

function recordIdFor(value: unknown, kind: string, label: string) {
  const parsed = text(value, label);
  if (!recordIdPattern.test(parsed) || !parsed.startsWith(`${kind}:`)) invalid(`${label} is invalid.`);
  return parsed;
}

function nameFor(value: unknown, recordId: string, label: string) {
  const parsed = text(value, label);
  if (recordId !== `${recordId.split(":", 1)[0]}:${parsed}`) invalid(`${label} does not match record identity.`);
  return parsed;
}

function oneOf<const T extends readonly string[]>(value: unknown, choices: T, label: string): T[number] {
  if (typeof value !== "string" || !choices.includes(value)) invalid(`${label} is unsupported.`);
  return value as T[number];
}

function unique(values: readonly string[], label: string) {
  const result = new Set(values);
  if (result.size !== values.length) invalid(`${label} is duplicated.`);
  return result;
}

function uniqueTextArray(value: unknown, label: string) {
  const parsed = array(value, label).map((item) => text(item, label));
  unique(parsed, label);
  return parsed;
}

function uniqueEnumArray<const T extends readonly string[]>(value: unknown, choices: T, label: string) {
  const parsed = array(value, label).map((item) => oneOf(item, choices, label));
  unique(parsed, label);
  return parsed;
}

function exact(value: unknown, expected: unknown, label: string) {
  if (value !== expected) invalid(`${label} is invalid.`);
}

function invalid(message: string): never {
  throw new WorkspaceContinuityContractError(message);
}
