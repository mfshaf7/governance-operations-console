import type {
  DeliveryCatalogItem,
  DeliveryCatalogReadModel,
  DeliveryCatalogValue,
  DeliveryTone,
} from "../read-model/index.ts";
import type {
  CatalogLiveApiError,
  CatalogMutationRequest,
  CatalogOosItem,
  CatalogOosMutationResult,
  CatalogOosProjection,
  CatalogOosValue,
  CatalogProjectionSnapshot,
  CatalogRepositoryReadiness,
} from "./catalog-live-types.ts";

const catalogIdPattern = /^[a-z0-9][a-z0-9._:-]*$/;
const digestPattern = /^sha256:[a-f0-9]{64}$/;

export function assertCatalogProjectionSnapshot(
  value: unknown,
): CatalogProjectionSnapshot {
  const snapshot = record(value, "Catalog projection snapshot");
  oneOf(snapshot.mode, ["disconnected-preview", "live"], "projection mode");
  oneOf(snapshot.status, ["current", "offline"], "projection status");
  dateTime(snapshot.observedAt, "projection observation time");
  if (snapshot.projection !== null) assertCatalogOosProjection(snapshot.projection);
  nullableString(snapshot.error, "projection error");
  return value as CatalogProjectionSnapshot;
}

export function assertCatalogOosProjection(value: unknown): CatalogOosProjection {
  const projection = record(value, "Catalog projection");
  exact(projection.schema_version, 1, "projection schema version");
  nonEmpty(projection.source_revision, "projection source revision");
  oneOf(projection.projection_status, ["ready", "partial", "stale", "unavailable"], "projection status");
  const summary = record(projection.summary, "Catalog summary");
  for (const key of ["total_items", "requestable_count", "owner_routed_count", "missing_route_count", "drift_count"]) integer(summary[key], `summary ${key}`, 0);
  array(projection.groups, "Catalog groups").forEach(assertCatalogGroup);
  array(projection.items, "Catalog items").forEach(assertCatalogItem);
  array(projection.values, "Catalog values", 2000).forEach(assertCatalogValue);
  dateTime(projection.projected_at, "projection time");
  return value as CatalogOosProjection;
}

export function assertCatalogOosMutationResult(
  value: unknown,
): CatalogOosMutationResult {
  const result = record(value, "Catalog mutation result");
  exact(result.schema_version, 1, "mutation schema version");
  for (const key of ["request_id", "correlation_id", "mutation_id"]) catalogId(result[key], `mutation ${key}`);
  exact(result.status, "applied", "mutation status");
  boolean(result.replayed, "mutation replay marker");
  dateTime(result.applied_at, "mutation apply time");
  nonEmpty(result.applied_by, "mutation operator");
  assertCatalogValue(result.value);
  array(result.related_values, "mutation related values").forEach(assertCatalogValue);
  nonEmpty(result.source_revision, "mutation source revision");
  exact(result.readback_complete, true, "mutation readback");
  const receipt = record(result.receipt, "Catalog mutation receipt");
  nonEmpty(receipt.ref, "mutation receipt reference");
  match(receipt.digest, digestPattern, "mutation receipt digest");
  return value as CatalogOosMutationResult;
}

export function assertCatalogMutationRequest(
  value: unknown,
): CatalogMutationRequest {
  const command = record(value, "Catalog mutation command");
  const draft = record(command.draft, "Catalog mutation draft");
  const linkedRepository =
    draft.linkedRepository === undefined || draft.linkedRepository === null
      ? null
      : ownerRepositoryOption(draft.linkedRepository);
  const repositoryReadiness =
    command.repositoryReadiness === undefined ||
    command.repositoryReadiness === null
      ? null
      : repositoryReadinessValue(command.repositoryReadiness);

  return {
    acceptanceId: nonEmptyValue(
      command.acceptanceId,
      "mutation acceptance identity",
    ),
    acceptedAt: dateTimeValue(
      command.acceptedAt,
      "mutation acceptance time",
    ),
    draft: {
      description: stringValue(draft.description, "mutation description"),
      label: nonEmptyValue(draft.label, "mutation label"),
      linkedRepository,
      parentCatalogValueKey: optionalNullableString(
        draft.parentCatalogValueKey,
        "mutation parent value",
      ),
      planningWindowEndDate: optionalString(
        draft.planningWindowEndDate,
        "mutation planning window end",
      ),
      planningWindowStartDate: optionalString(
        draft.planningWindowStartDate,
        "mutation planning window start",
      ),
      valueKey: nonEmptyValue(draft.valueKey, "mutation value key"),
    },
    mode: oneOfValue(
      command.mode,
      ["add", "edit", "retire"] as const,
      "mutation mode",
    ),
    repositoryReadiness,
    targetValueId:
      command.targetValueId === null
        ? null
        : nonEmptyValue(command.targetValueId, "mutation target identity"),
  };
}

export function catalogReadModelFromProjection(
  projection: CatalogOosProjection,
): DeliveryCatalogReadModel {
  return {
    generated_at: projection.projected_at,
    groups: projection.groups,
    items: projection.items.map((item) => ({
      ...item,
      tone: catalogItemTone(item),
    })),
    projection_status: catalogProjectionStatus(projection.projection_status),
    source_revision: projection.source_revision,
    summary: projection.summary,
    values: projection.values.map(catalogValueFromOos),
  };
}

export function catalogUnavailableReadModel(): DeliveryCatalogReadModel {
  return {
    generated_at: new Date(0).toISOString(),
    groups: [],
    items: [],
    projection_status: "backend_unavailable",
    source_revision: undefined,
    summary: {
      drift_count: 0,
      missing_route_count: 0,
      owner_routed_count: 0,
      requestable_count: 0,
      total_items: 0,
    },
    values: [],
  };
}

export function catalogValueFromOos(value: CatalogOosValue): DeliveryCatalogValue {
  const { repository_binding: _repositoryBinding, ...catalogValue } = value;
  return { ...catalogValue, tone: catalogValueTone(value) };
}

export function catalogRepositoryReadiness(
  value: CatalogOosValue | undefined,
): CatalogRepositoryReadiness | null {
  return value?.repository_binding ?? null;
}

export function isCatalogLiveApiError(value: unknown): value is CatalogLiveApiError {
  return isRecord(value) && value.mode === "live" && value.status === "offline" && typeof value.code === "string" && typeof value.error === "string";
}

function assertCatalogGroup(value: unknown) {
  const group = record(value, "Catalog group");
  oneOf(group.group_id, ["board", "classification", "evidence", "metadata", "organization", "planning"], "group identity");
  for (const key of ["title", "description", "source_authority", "expected_route"]) nonEmpty(group[key], `group ${key}`);
  oneOf(group.route_status, ["implemented", "missing", "owner_routed", "partial", "planned"], "group route status");
  idList(group.item_ids, "group item identities");
}

function assertCatalogItem(value: unknown) {
  const item = record(value, "Catalog item");
  catalogId(item.catalog_item_id, "Catalog item identity");
  oneOf(item.group_id, ["board", "classification", "evidence", "metadata", "organization", "planning"], "Catalog item group");
  for (const key of ["label", "description", "value_key", "source_authority", "backend_route", "owner_route", "create_authority", "usage_summary", "next_action_label", "next_action_detail"]) nonEmpty(item[key], `Catalog item ${key}`);
  oneOf(item.console_capability, ["create", "owner_routed", "read_only", "request"], "Catalog item capability");
  oneOf(item.gap_status, ["backend_created", "console_requestable", "form_option_missing", "missing_backend_route", "owner_routed", "projection_drift", "read_only", "stale_projection"], "Catalog item gap status");
  lifecycle(item.lifecycle_state, "Catalog item lifecycle");
  integer(item.usage_count, "Catalog item usage", 0);
  stringList(item.evidence_refs, "Catalog item evidence");
  nullableDateTime(item.last_projected_at, "Catalog item projection time");
}

function assertCatalogValue(value: unknown) {
  const item = record(value, "Catalog value");
  catalogId(item.catalog_item_id, "Catalog value item identity");
  catalogId(item.catalog_value_id, "Catalog value identity");
  for (const key of ["value_key", "label", "usage_summary"]) nonEmpty(item[key], `Catalog value ${key}`);
  string(item.description, "Catalog value description");
  lifecycle(item.lifecycle_state, "Catalog value lifecycle");
  integer(item.usage_count, "Catalog value usage", 0);
  stringList(item.evidence_refs, "Catalog value evidence");
  nullableDateTime(item.last_projected_at, "Catalog value projection time");
  nullableStringOrUndefined(item.parent_catalog_item_id, "Catalog parent item");
  nullableStringOrUndefined(item.parent_catalog_value_key, "Catalog parent value");
  if (item.repository_binding !== undefined && item.repository_binding !== null) assertRepositoryReadiness(item.repository_binding);
}

function assertRepositoryReadiness(value: unknown) {
  const binding = record(value, "Catalog repository binding");
  for (const key of ["repo_name", "repo_ref", "catalog_value_key"]) nonEmpty(binding[key], `repository binding ${key}`);
  match(binding.repo_ref, /^repo:\/\/[A-Za-z0-9._-]+$/, "repository reference");
  const receipt = record(binding.receipt, "repository readiness receipt");
  for (const key of ["receipt_id", "uri", "target_scope"]) nonEmpty(receipt[key], `repository receipt ${key}`);
  exact(receipt.issuer, "workspace-governance-control-fabric", "repository receipt issuer");
  exact(receipt.outcome, "ready", "repository receipt outcome");
  match(receipt.digest, digestPattern, "repository receipt digest");
  dateTime(receipt.evaluated_at, "repository receipt time");
  integer(receipt.generation, "repository receipt generation", 1);
}

function ownerRepositoryOption(value: unknown) {
  const option = record(value, "Catalog owner repository");
  return {
    admissionState: nonEmptyValue(option.admissionState, "repository admission state"),
    description: stringValue(option.description, "repository description"),
    id: nonEmptyValue(option.id, "repository identity"),
    label: nonEmptyValue(option.label, "repository label"),
    owner: nonEmptyValue(option.owner, "repository owner"),
    repoRef: nonEmptyValue(option.repoRef, "repository reference"),
    routeSource: nonEmptyValue(option.routeSource, "repository route source"),
    valueKey: nonEmptyValue(option.valueKey, "repository value key"),
  };
}

function repositoryReadinessValue(value: unknown): CatalogRepositoryReadiness {
  assertRepositoryReadiness(value);
  return value as CatalogRepositoryReadiness;
}

function catalogItemTone(item: CatalogOosItem): DeliveryTone {
  if (item.lifecycle_state === "retired" || item.lifecycle_state === "read_only") return "muted";
  if (item.lifecycle_state === "stale" || item.gap_status === "stale_projection") return "stale";
  if (item.gap_status === "missing_backend_route" || item.gap_status === "projection_drift") return "danger";
  if (item.console_capability === "owner_routed") return "info";
  if (item.console_capability === "create" || item.console_capability === "request") return "warn";
  return "info";
}

function catalogValueTone(value: CatalogOosValue): DeliveryTone {
  if (value.lifecycle_state === "retired" || value.lifecycle_state === "read_only") return "muted";
  if (value.lifecycle_state === "stale") return "stale";
  if (value.lifecycle_state === "missing") return "danger";
  return value.lifecycle_state === "admitted" ? "info" : "ok";
}

function catalogProjectionStatus(status: CatalogOosProjection["projection_status"]): DeliveryCatalogReadModel["projection_status"] {
  if (status === "ready") return "fresh";
  if (status === "stale") return "stale";
  if (status === "unavailable") return "backend_unavailable";
  return "projection_sync_required";
}

function array(value: unknown, label: string, maxItems = 500): unknown[] { if (!Array.isArray(value) || value.length > maxItems) invalid(`${label} is invalid.`); return value; }
function boolean(value: unknown, label: string) { if (typeof value !== "boolean") invalid(`${label} is invalid.`); }
function catalogId(value: unknown, label: string) { match(value, catalogIdPattern, label); }
function dateTime(value: unknown, label: string) { nonEmpty(value, label); if (Number.isNaN(Date.parse(value as string))) invalid(`${label} is invalid.`); }
function exact(value: unknown, expected: unknown, label: string) { if (value !== expected) invalid(`${label} is invalid.`); }
function idList(value: unknown, label: string) { const items = array(value, label); if (items.some((entry) => typeof entry !== "string" || !catalogIdPattern.test(entry))) invalid(`${label} is invalid.`); }
function integer(value: unknown, label: string, minimum: number) { if (!Number.isInteger(value) || (value as number) < minimum) invalid(`${label} is invalid.`); }
function invalid(message: string): never { throw new Error(message); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function lifecycle(value: unknown, label: string) { oneOf(value, ["active", "admitted", "missing", "read_only", "retired", "stale"], label); }
function match(value: unknown, pattern: RegExp, label: string) { if (typeof value !== "string" || !pattern.test(value)) invalid(`${label} is invalid.`); }
function nonEmpty(value: unknown, label: string) { if (typeof value !== "string" || !value.trim()) invalid(`${label} is invalid.`); }
function nullableDateTime(value: unknown, label: string) { if (value !== null) dateTime(value, label); }
function nullableString(value: unknown, label: string) { if (value !== null && typeof value !== "string") invalid(`${label} is invalid.`); }
function nullableStringOrUndefined(value: unknown, label: string) { if (value !== undefined) nullableString(value, label); }
function oneOf(value: unknown, options: readonly unknown[], label: string) { if (!options.includes(value)) invalid(`${label} is invalid.`); }
function record(value: unknown, label: string): Record<string, unknown> { if (!isRecord(value)) invalid(`${label} is invalid.`); return value; }
function string(value: unknown, label: string) { if (typeof value !== "string") invalid(`${label} is invalid.`); }
function stringList(value: unknown, label: string) { const items = array(value, label); if (items.some((entry) => typeof entry !== "string" || !entry.trim())) invalid(`${label} is invalid.`); }
function dateTimeValue(value: unknown, label: string): string { dateTime(value, label); return value as string; }
function nonEmptyValue(value: unknown, label: string): string { nonEmpty(value, label); return value as string; }
function oneOfValue<const T extends string>(value: unknown, options: readonly T[], label: string): T { oneOf(value, options, label); return value as T; }
function optionalNullableString(value: unknown, label: string): string | null | undefined { if (value === undefined || value === null) return value; return stringValue(value, label); }
function optionalString(value: unknown, label: string): string | undefined { return value === undefined ? undefined : stringValue(value, label); }
function stringValue(value: unknown, label: string): string { string(value, label); return value as string; }
