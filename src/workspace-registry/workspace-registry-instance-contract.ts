import { assertInstanceAuthority, assertInstanceResult } from "../console-integration/workspace-intake/workspace-intake-instance-contract.ts";
import type {
  InstanceInventoryLifecyclePreparation, InstanceInventoryLifecycleRequest, InstanceInventoryPreparationBase,
  InstanceInventoryPromotionPreparation, InstanceInventoryRequest, InstanceRegistryPage,
  WorkspaceInventoryLifecycleResult, WorkspaceInventoryResult, WorkspaceRegistryCandidate,
  WorkspaceRegistryComposedSnapshot, WorkspaceRegistryLegacySnapshot, WorkspaceRegistryRecord,
} from "./model/workspace-registry-types.ts";

type Wire = Record<string, unknown>;
type Fail = (message: string) => Error;
type Parsers = Readonly<{
  record: (value: unknown) => WorkspaceRegistryRecord;
  candidate: (value: unknown) => WorkspaceRegistryCandidate;
}>;
const object = (value: unknown): value is Wire => typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const digest = (value: unknown): value is string => typeof value === "string" && /^sha256:[0-9a-f]{64}$/.test(value);
const commit = (value: unknown) => typeof value === "string" && /^[0-9a-f]{40}$/.test(value);
const date = (value: unknown) => text(value) && !Number.isNaN(Date.parse(value));
const recordId = (value: unknown): value is string => typeof value === "string" && /^repo:[a-z0-9][a-z0-9._-]{0,185}$/.test(value);
const strings = (value: unknown, required = false): value is string[] => Array.isArray(value) && (!required || value.length > 0) && value.every(text) && new Set(value).size === value.length;
const keys = (value: Wire, expected: string[]) => Object.keys(value).sort().join(",") === [...expected].sort().join(",");
const integer = (value: unknown, minimum: number) => Number.isSafeInteger(value) && Number(value) >= minimum;
const statuses = new Set(["accepted", "preparing", "succeeded", "blocked", "cancelled"]);
const postures = new Set(["active", "suspended", "retired"]);

export function sameRegistryJson(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (Array.isArray(left) && Array.isArray(right)) return left.length === right.length && left.every((item, i) => sameRegistryJson(item, right[i]));
  if (!object(left) || !object(right)) return false;
  return keys(left, Object.keys(right)) && Object.keys(left).every(key => sameRegistryJson(left[key], right[key]));
}

export function instanceRegistryNamespace(value: unknown, fail: Fail): InstanceRegistryPage["authority"] {
  if (!object(value) || !keys(value, ["kind", "instance_id"])) throw fail("Internal Registry installation is invalid.");
  const authority = assertInstanceAuthority({ ...value, record_id: "repo:namespace-validation" }, fail);
  return { kind: authority.kind, instance_id: authority.instance_id };
}

export function instanceRegistryItemAuthority(value: Wire, identity: string, fail: Fail) {
  if (value.authority_kind === undefined && value.canonical_authority === undefined) return {};
  const authority = assertInstanceAuthority(value.canonical_authority, fail);
  if (value.authority_kind !== "internal-instance-record" || authority.record_id !== identity) throw fail("Registry item storage authority is mismatched.");
  const provider = value.provider_repository;
  if (provider !== undefined && (!object(provider) || !keys(provider, ["provider", "provider_repository_id", "full_name"]) ||
      provider.provider !== "github" || typeof provider.provider_repository_id !== "string" || !/^[1-9][0-9]*$/.test(provider.provider_repository_id) ||
      typeof provider.full_name !== "string" || !/^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(provider.full_name))) {
    throw fail("Registry provider identity is invalid.");
  }
  return { authority_kind: "internal-instance-record" as const, canonical_authority: authority,
    ...(provider === undefined ? {} : {provider_repository: provider as {provider: "github"; provider_repository_id: string; full_name: string}}) };
}

export function assertInstanceRegistryPage(value: unknown, parsers: Parsers, fail: Fail): InstanceRegistryPage {
  if (!object(value) || !keys(value, ["schema_version", "mode", "artifact_type", "authority", "selection", "after", "next_after", "counts", "records", "eligible_promotions", "projected_at", "projection_digest"]) ||
      value.schema_version !== 1 || value.mode !== "current" || value.artifact_type !== "instance-repository-registry-page" ||
      !object(value.selection) || !keys(value.selection, ["query", "scope"]) || typeof value.selection.query !== "string" || value.selection.query.length > 128 ||
      value.selection.query !== value.selection.query.trim().toLowerCase() || !["eligible", "inventory"].includes(String(value.selection.scope)) ||
      !(value.after === null || recordId(value.after)) || !(value.next_after === null || recordId(value.next_after)) ||
      !date(value.projected_at) || !digest(value.projection_digest) || !Array.isArray(value.records) || !Array.isArray(value.eligible_promotions) ||
      !object(value.counts) || !keys(value.counts, ["intake", "inventory"])) throw fail("Internal Registry page is invalid.");
  const authority = instanceRegistryNamespace(value.authority, fail);
  const counts = value.counts;
  for (const [key, expected] of [["intake", ["out-of-scope", "proposed", "admitted"]], ["inventory", ["active", "suspended", "retired"]]] as const) {
    const group = counts[key];
    if (!object(group) || !keys(group, [...expected]) || !Object.values(group).every(count => integer(count, 0))) throw fail("Internal Registry counts are invalid.");
  }
  const records = value.records.map(parsers.record), candidates = value.eligible_promotions.map(parsers.candidate);
  const identities = [...records.map(row => row.id), ...candidates.map(row => row.target.record_id)];
  if (identities.length > 100 || new Set(identities).size !== identities.length ||
      records.some(row => row.kind !== "repo" || row.authority_kind !== authority.kind || row.canonical_authority?.instance_id !== authority.instance_id) ||
      candidates.some(row => row.target.kind !== "repo" || row.authority_kind !== authority.kind || row.canonical_authority?.instance_id !== authority.instance_id) ||
      (value.selection.scope === "inventory" ? candidates.length > 0 : records.length > 0) ||
      identities.some(id => !recordId(id) || (typeof value.after === "string" && id <= value.after)) ||
      (value.next_after !== null && (identities.length === 0 || value.next_after !== identities.at(-1))) ||
      !sameRegistryJson(identities, [...identities].sort())) throw fail("Internal Registry page mixes identities, authority or paging order.");
  const typedCounts = counts as InstanceRegistryPage["counts"];
  if (records.some(row => records.filter(other => other.posture === row.posture).length > typedCounts.inventory[row.posture]) ||
      candidates.length > typedCounts.intake.admitted ||
      (value.selection.scope === "inventory" ? Object.values(typedCounts.intake).some(Boolean) : Object.values(typedCounts.inventory).some(Boolean))) throw fail("Internal Registry counts do not cover the selected page.");
  return { schema_version: 1, mode: "current", artifact_type: "instance-repository-registry-page", authority,
    selection: value.selection as InstanceRegistryPage["selection"], after: value.after as string | null, next_after: value.next_after as string | null,
    counts: typedCounts, records, eligible_promotions: candidates, projected_at: value.projected_at as string, projection_digest: value.projection_digest };
}

export function assertComposedRegistrySnapshot(value: Wire, legacy: WorkspaceRegistryLegacySnapshot, page: InstanceRegistryPage, fail: Fail): WorkspaceRegistryComposedSnapshot {
  const records = [...legacy.records, ...page.records], candidates = [...legacy.eligible_promotions, ...page.eligible_promotions];
  const identities = [...records.map(row => row.id), ...candidates.map(row => row.target.record_id)];
  if (value.schema_version !== 1 || value.workflow_id !== "workspace-registry-view" || "canonical_authority" in value || value.canonical_mutation !== false ||
      value.authority_revision !== legacy.authority_revision || !text(value.projection_id) || !date(value.projected_at) || !digest(value.projection_digest) ||
      !sameRegistryJson(value.source_authorities, { legacy: legacy.canonical_authority, instance: page.authority }) ||
      !sameRegistryJson(value.records, records) || !sameRegistryJson(value.eligible_promotions, candidates) || new Set(identities).size !== identities.length) {
    throw fail("Registry view must preserve its separate source authorities without overlapping identities.");
  }
  return { schema_version: 1, workflow_id: "workspace-registry-view", canonical_mutation: false,
    authority_revision: legacy.authority_revision, projection_id: value.projection_id as string, projected_at: value.projected_at as string,
    projection_digest: value.projection_digest as string, source_authorities: { legacy: legacy.canonical_authority, instance: page.authority },
    legacy_snapshot: legacy, instance_page: page, records, eligible_promotions: candidates };
}

function preparationBase(value: Wire, fail: Fail): InstanceInventoryPreparationBase {
  const authority = assertInstanceAuthority(value.canonical_authority, fail), expected = value.expected_state;
  const target = value.target, policy = value.policy_ref, current = value.current_record, latest = value.latest_receipt_ref;
  if (value.schema_version !== 1 || value.authority_kind !== authority.kind || value.canonical_mutation !== false || !commit(value.authority_revision) ||
      !object(target) || !keys(target, ["kind", "name", "record_id"]) || target.kind !== "repo" || target.record_id !== authority.record_id || target.name !== authority.record_id.slice(5) ||
      !object(expected) || !keys(expected, ["record_version", "record_digest"]) || !integer(expected.record_version, 1) || !digest(expected.record_digest) ||
      !object(policy) || !keys(policy, ["repo", "revision", "contract_digest"]) || policy.repo !== "workspace-governance" || policy.revision !== value.authority_revision || !digest(policy.contract_digest) ||
      !object(current) || !object(current.record) || current.record.id !== target.record_id || current.record.version !== expected.record_version ||
      current.repo_class !== "product-source" || current.requires_security_bindings !== false ||
      !object(latest) || !keys(latest, ["version", "digest", "action"]) || latest.version !== expected.record_version || !digest(latest.digest) || !text(latest.action)) {
    throw fail("Internal Inventory preparation does not bind this repository’s current version and policy.");
  }
  return value as InstanceInventoryPreparationBase;
}

export function assertInstancePromotionPreparation(value: Wire, parsers: Parsers, fail: Fail): InstanceInventoryPromotionPreparation {
  const base = preparationBase(value, fail), candidate = parsers.candidate(value.candidate);
  if (value.workflow_id !== "workspace-inventory-promotion" || base.current_record.status !== "admitted" ||
      candidate.authority_kind !== base.authority_kind || !sameRegistryJson(candidate.canonical_authority, base.canonical_authority) ||
      !sameRegistryJson(candidate.intake_entry_ref, value.intake_entry_ref) || candidate.intake_entry_ref.id !== base.target.record_id ||
      candidate.intake_entry_ref.version !== base.expected_state.record_version || candidate.intake_entry_ref.digest !== base.expected_state.record_digest) throw fail("Internal Inventory promotion must use its admitted original candidate.");
  return { ...base, workflow_id: "workspace-inventory-promotion", intake_entry_ref: candidate.intake_entry_ref, candidate };
}

export function assertInstanceLifecyclePreparation(value: Wire, fail: Fail): InstanceInventoryLifecyclePreparation {
  const base = preparationBase(value, fail);
  if (value.workflow_id !== "workspace-inventory-lifecycle" || !postures.has(String(base.current_record.posture)) || base.current_record.lifecycle !== base.current_record.posture) throw fail("Internal Inventory lifecycle state is invalid.");
  return base as InstanceInventoryLifecyclePreparation;
}

export function assertInstanceInventoryRequest(value: unknown, authority: InstanceInventoryPreparationBase["canonical_authority"], id: string, family: "promotion" | "lifecycle", fail: Fail): InstanceInventoryRequest {
  if (!object(value) || !keys(value, ["schema_version", "artifact_type", "instance_id", "request_id", "requested_at", "operator_ref", "operator_acceptance", "correlation_ref", "idempotency_key", "action", "target", "expected_state", "requested_value", "prior_receipt_digest", "reason", "impact_acknowledgements", "approval_refs", "policy_ref", "request_digest"]) ||
      value.schema_version !== 1 || value.artifact_type !== "instance-repository-inventory-request" || value.instance_id !== authority.instance_id || value.request_id !== id ||
      !date(value.requested_at) || !text(value.operator_ref) || !text(value.idempotency_key) || !text(value.correlation_ref) || !digest(value.request_digest) ||
      !object(value.target) || !keys(value.target, ["kind", "name", "record_id"]) || value.target.kind !== "repo" || value.target.record_id !== authority.record_id || value.target.name !== authority.record_id.slice(5) ||
      !object(value.expected_state) || !keys(value.expected_state, ["record_version", "record_digest"]) || !integer(value.expected_state.record_version, 1) || !digest(value.expected_state.record_digest) ||
      !object(value.policy_ref) || !keys(value.policy_ref, ["repo", "revision", "contract_digest"]) || value.policy_ref.repo !== "workspace-governance" || !commit(value.policy_ref.revision) || !digest(value.policy_ref.contract_digest) ||
      !object(value.operator_acceptance) || !keys(value.operator_acceptance, ["state", "operator_ref", "recorded_at"]) || value.operator_acceptance.state !== "accepted" || value.operator_acceptance.operator_ref !== value.operator_ref || !date(value.operator_acceptance.recorded_at) ||
      !strings(value.approval_refs, true) || !strings(value.impact_acknowledgements, family === "lifecycle") ||
      (family === "promotion" ? value.action !== "promote" || value.reason !== null || value.impact_acknowledgements.length !== 0 : !["update", "suspend", "restore", "retire"].includes(String(value.action)) || !text(value.reason)) ||
      (["promote", "update"].includes(String(value.action)) ? !object(value.requested_value) || "record" in value.requested_value : value.requested_value !== null) ||
      (value.action === "restore" ? !digest(value.prior_receipt_digest) : value.prior_receipt_digest !== null)) throw fail("Internal Inventory request is invalid or belongs to different accepted input.");
  return value as InstanceInventoryRequest;
}

export function assertInstanceInventoryResult(value: Wire, family: "promotion", expectedId: string | undefined, fail: Fail): WorkspaceInventoryResult;
export function assertInstanceInventoryResult(value: Wire, family: "lifecycle", expectedId: string | undefined, fail: Fail): WorkspaceInventoryLifecycleResult;
export function assertInstanceInventoryResult(value: Wire, family: "promotion" | "lifecycle", expectedId: string | undefined, fail: Fail): WorkspaceInventoryResult | WorkspaceInventoryLifecycleResult {
  const native = assertInstanceResult(value, fail), id = value.request_id;
  if (value.schema_version !== 1 || value.workflow_id !== `workspace-inventory-${family}` || !text(id) || (expectedId !== undefined && id !== expectedId) ||
      !text(value.session_ref) || !text(value.execution_ref) || !statuses.has(String(value.status)) || !integer(value.revision, 1) ||
      !Array.isArray(value.history) || value.history.length !== value.revision || typeof value.canonical_mutation !== "boolean" ||
      value.canonical_mutation !== (value.status === "succeeded") || (family === "lifecycle" && value.merged_state !== null) ||
      (["succeeded", "cancelled", "blocked"].includes(String(value.status)) && value.cancel_allowed !== false)) throw fail("Internal Inventory result is invalid or mismatched.");
  const request = assertInstanceInventoryRequest(value.request, native.canonical_authority, id, family, fail);
  const expectedNext = value.status === "succeeded" || value.status === "cancelled" ? "complete" : value.status === "blocked" ? family === "promotion" ? "submit-corrected-promotion" : "submit-corrected-request" : value.failure ? "restore-dependency-and-retry" : "continue";
  if (value.next_action !== expectedNext || value.history.some((event, index) => !object(event) || event.sequence !== index + 1 || !date(event.at) || !statuses.has(String(event.status)) || !(event.details === null || object(event.details))) ||
      value.history.at(-1)?.status !== value.status || !(value.failure === null || object(value.failure) && text(value.failure.code) && text(value.failure.message) && typeof value.failure.retryable === "boolean")) throw fail("Internal Inventory progress or failure state is incomplete.");
  if (native.receipt && (native.receipt.action !== `inventory.${request.action}` || native.receipt.operator_ref !== request.operator_ref ||
      native.receipt.idempotency_key !== request.idempotency_key || native.receipt.previous.version !== request.expected_state.record_version || native.receipt.previous.digest !== request.expected_state.record_digest)) throw fail("Internal Inventory receipt does not cover the accepted original change.");
  return { ...value, ...native, request: family === "lifecycle" ? request as InstanceInventoryLifecycleRequest : request } as WorkspaceInventoryResult | WorkspaceInventoryLifecycleResult;
}
