import type {
  WorkspaceRegistryCandidate,
  WorkspaceRegistryRecord,
  WorkspaceRegistrySnapshot,
} from "../workspace-registry/model/workspace-registry-types.ts";
import { WorkspaceContinuityContractError } from "./workspace-continuity-contract.ts";
import type {
  WorkspaceContinuityIntakeRecord,
  WorkspaceContinuityInventoryRecord,
  WorkspaceContinuityProduct,
  WorkspaceContinuityProjection,
} from "./workspace-continuity-types.ts";

export function reconcileWorkspaceRegistryContinuity(
  projection: WorkspaceContinuityProjection,
  snapshot: WorkspaceRegistrySnapshot,
): WorkspaceRegistrySnapshot {
  if (projection.authority.revision !== snapshot.authority_revision) {
    invalid("WGCF and OOS do not project the same Workspace Governance revision.");
  }
  if (projection.inventory.length !== snapshot.records.length) {
    invalid("WGCF and OOS do not project the same inventory identities.");
  }
  const products = new Map(projection.products.map((item) => [item.product_id, item]));
  const inventory = new Map(projection.inventory.map((item) => [item.record_id, item]));
  for (const record of snapshot.records) {
    const canonical = inventory.get(record.id);
    if (!canonical || !sameRegistryRecord(record, canonical, products.get(record.id))) {
      invalid(`OOS Registry record ${record.id} contradicts WGCF continuity.`);
    }
  }
  const intake = new Map(projection.intake.map((item) => [item.record_id, item]));
  for (const candidate of snapshot.eligible_promotions) {
    const canonical = intake.get(candidate.target.record_id);
    if (!canonical || !sameCandidate(candidate, canonical)) {
      invalid(`OOS promotion candidate ${candidate.target.record_id} contradicts WGCF continuity.`);
    }
  }
  return snapshot;
}

function sameRegistryRecord(
  record: WorkspaceRegistryRecord,
  canonical: WorkspaceContinuityInventoryRecord,
  product: WorkspaceContinuityProduct | undefined,
) {
  return record.kind === canonical.kind &&
    record.name === canonical.name &&
    record.version === canonical.record_version &&
    record.record_digest === canonical.record_digest &&
    record.posture === canonical.posture &&
    record.maturity === (product?.maturity ?? null) &&
    (!product || sameList(record.owner_refs, unique([
      product.owners.platform,
      product.owners.security,
      product.owners.runtime,
      ...product.owners.source,
    ]))) &&
    record.lineage.source === canonical.lineage.source &&
    record.lineage.source_ref === canonical.lineage.source_ref &&
    record.lineage.source_digest === canonical.lineage.source_digest &&
    record.lineage.intake_entry_version === canonical.lineage.intake_entry_version &&
    record.last_mutation.id === canonical.last_mutation.id &&
    record.last_mutation.action === canonical.last_mutation.action &&
    record.last_mutation.applied_at === canonical.last_mutation.applied_at &&
    record.last_mutation.request_ref === canonical.last_mutation.request_ref &&
    record.last_mutation.readiness_ref === canonical.last_mutation.readiness_ref;
}

function sameCandidate(
  candidate: WorkspaceRegistryCandidate,
  canonical: WorkspaceContinuityIntakeRecord,
) {
  const approvalRefs = unique([
    typeof canonical.decision.ref === "string" ? canonical.decision.ref : null,
    typeof canonical.decision.id === "string" ? canonical.decision.id : null,
  ]);
  return canonical.status === "admitted" &&
    candidate.target.kind === canonical.kind &&
    candidate.target.name === canonical.name &&
    candidate.target.record_id === canonical.record_id &&
    candidate.intake_entry_ref.id === canonical.record_id &&
    candidate.intake_entry_ref.version === canonical.record_version &&
    candidate.intake_entry_ref.digest === canonical.record_digest &&
    approvalRefs.length > 0 &&
    sameList(candidate.approval_refs, approvalRefs);
}

function unique(values: readonly (string | null)[]) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function sameList(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function invalid(message: string): never {
  throw new WorkspaceContinuityContractError(message);
}
