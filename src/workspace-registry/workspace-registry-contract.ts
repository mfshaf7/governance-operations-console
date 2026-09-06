import type {
  WorkspaceInventoryExpectedState,
  WorkspaceInventoryPreparation,
  WorkspaceInventoryResult,
  WorkspaceInventoryStatus,
  WorkspaceInventorySubmissionIntent,
  WorkspaceRegistryCandidate,
  WorkspaceRegistryKind,
  WorkspaceRegistryRecord,
  WorkspaceRegistrySnapshot,
  WorkspaceRegistryTarget,
} from "./model/workspace-registry-types.ts";

const commitPattern = /^[0-9a-f]{40}$/;
const digestPattern = /^sha256:[0-9a-f]{64}$/;
const requestIdPattern = /^workspace-inventory-request:[A-Za-z0-9._:-]+$/;
const targetNamePattern = /^[a-z0-9][a-z0-9._-]*$/;
const targetKinds = new Set<WorkspaceRegistryKind>([
  "component",
  "product",
  "repo",
]);
const postures = new Set(["active", "retired", "suspended"]);
const statuses = new Set<WorkspaceInventoryStatus>([
  "accepted",
  "blocked",
  "cancelled",
  "cancelling",
  "evaluating",
  "preparing",
  "rejected",
  "review-required",
  "stale",
  "succeeded",
]);
const nextActions = new Set([
  "complete",
  "continue",
  "inspect-review-or-cancel",
  "refresh-and-resubmit",
  "restore-dependency-and-retry",
  "review-and-merge",
  "submit-corrected-promotion",
]);

export class WorkspaceRegistryContractError extends Error {
  readonly code: string;

  constructor(message: string, code = "workspace_registry_contract_invalid") {
    super(message);
    this.code = code;
  }
}

export function assertWorkspaceRegistryTarget(
  value: unknown,
): WorkspaceRegistryTarget {
  const target = record(value, "target");
  const kind = target.kind as WorkspaceRegistryKind;
  if (
    !targetKinds.has(kind) ||
    typeof target.name !== "string" ||
    !targetNamePattern.test(target.name) ||
    target.record_id !== `${kind}:${target.name}`
  ) {
    throw invalid("Workspace Registry target is invalid.");
  }
  return { kind, name: target.name, record_id: target.record_id as string };
}

export function assertWorkspaceRegistrySnapshot(
  value: unknown,
): WorkspaceRegistrySnapshot {
  const snapshot = record(value, "snapshot");
  const authority = record(snapshot.canonical_authority, "canonical authority");
  const paths = record(authority.inventory_paths, "inventory paths");
  if (
    snapshot.schema_version !== 1 ||
    snapshot.workflow_id !== "workspace-inventory-registry" ||
    !text(snapshot.projection_id) ||
    !digest(snapshot.projection_digest) ||
    !commit(snapshot.authority_revision) ||
    !dateTime(snapshot.projected_at) ||
    snapshot.canonical_mutation !== false ||
    authority.repo !== "workspace-governance" ||
    authority.branch !== "main" ||
    authority.intake_path !== "contracts/intake-register.yaml" ||
    paths.repo !== "contracts/repos.yaml" ||
    paths.product !== "contracts/products.yaml" ||
    paths.component !== "contracts/components.yaml" ||
    !Array.isArray(snapshot.records) ||
    !Array.isArray(snapshot.eligible_promotions)
  ) {
    throw invalid("Workspace Registry snapshot is not canonical read-only authority.");
  }

  const records = snapshot.records.map(assertWorkspaceRegistryRecord);
  const recordIds = new Set(records.map((entry) => entry.id));
  if (recordIds.size !== records.length) {
    throw invalid("Workspace Registry contains duplicate active identities.");
  }
  const eligiblePromotions = snapshot.eligible_promotions.map(
    assertWorkspaceRegistryCandidate,
  );
  if (
    eligiblePromotions.some((candidate) => recordIds.has(candidate.target.record_id))
  ) {
    throw invalid("Workspace Registry cannot project one identity in intake and active inventory.");
  }

  return {
    authority_revision: snapshot.authority_revision as string,
    canonical_authority: {
      branch: "main",
      intake_path: "contracts/intake-register.yaml",
      inventory_paths: {
        component: "contracts/components.yaml",
        product: "contracts/products.yaml",
        repo: "contracts/repos.yaml",
      },
      repo: "workspace-governance",
    },
    canonical_mutation: false,
    eligible_promotions: eligiblePromotions,
    projected_at: snapshot.projected_at as string,
    projection_digest: snapshot.projection_digest as string,
    projection_id: snapshot.projection_id as string,
    records,
    schema_version: 1,
    workflow_id: "workspace-inventory-registry",
  };
}

export function assertWorkspaceRegistryCandidate(
  value: unknown,
): WorkspaceRegistryCandidate {
  const candidate = record(value, "promotion candidate");
  const target = assertWorkspaceRegistryTarget(candidate.target);
  const intake = record(candidate.intake_entry_ref, "intake entry reference");
  const active = record(candidate.active_record, "active record");
  if (
    !digest(candidate.candidate_digest) ||
    intake.id !== target.record_id ||
    !Number.isInteger(intake.version) ||
    Number(intake.version) < 1 ||
    !digest(intake.digest) ||
    active.kind !== target.kind ||
    active.id !== target.record_id ||
    !isRecord(active.value) ||
    !stringList(candidate.owner_refs, true) ||
    !stringList(candidate.approval_refs, true)
  ) {
    throw invalid("Workspace Registry promotion candidate is incomplete.");
  }
  return {
    active_record: {
      id: active.id as string,
      kind: active.kind as WorkspaceRegistryKind,
      value: active.value,
    },
    approval_refs: [...(candidate.approval_refs as string[])],
    candidate_digest: candidate.candidate_digest as string,
    intake_entry_ref: {
      digest: intake.digest as string,
      id: intake.id as string,
      version: Number(intake.version),
    },
    owner_refs: [...(candidate.owner_refs as string[])],
    target,
  };
}

export function assertWorkspaceInventoryPreparation(
  value: unknown,
): WorkspaceInventoryPreparation {
  const preparation = record(value, "promotion preparation");
  const authority = record(preparation.canonical_authority, "canonical authority");
  const expected = assertExpectedState(preparation.expected_state);
  const target = assertWorkspaceRegistryTarget(preparation.target);
  const intake = record(preparation.intake_entry_ref, "intake entry reference");
  const expectedPath = ({
    component: "contracts/components.yaml",
    product: "contracts/products.yaml",
    repo: "contracts/repos.yaml",
  } as const)[target.kind];
  if (
    preparation.schema_version !== 1 ||
    preparation.workflow_id !== "workspace-inventory-promotion" ||
    !commit(preparation.authority_revision) ||
    preparation.canonical_mutation !== false ||
    authority.repo !== "workspace-governance" ||
    authority.branch !== "main" ||
    authority.intake_path !== "contracts/intake-register.yaml" ||
    authority.inventory_path !== expectedPath ||
    intake.id !== target.record_id ||
    intake.version !== expected.intake_entry_version ||
    intake.digest !== expected.intake_entry_digest
  ) {
    throw invalid("Workspace Inventory preparation is not current canonical authority.");
  }
  return {
    authority_revision: preparation.authority_revision as string,
    canonical_authority: {
      branch: "main",
      intake_path: "contracts/intake-register.yaml",
      inventory_path: expectedPath,
      repo: "workspace-governance",
    },
    canonical_mutation: false,
    expected_state: expected,
    intake_entry_ref: {
      digest: intake.digest as string,
      id: intake.id as string,
      version: Number(intake.version),
    },
    schema_version: 1,
    target,
    workflow_id: "workspace-inventory-promotion",
  };
}

export function assertWorkspaceInventorySubmissionIntent(
  value: unknown,
): WorkspaceInventorySubmissionIntent {
  const intent = record(value, "promotion intent");
  const reviewed = record(intent.reviewed_projection, "reviewed projection");
  if (
    typeof intent.request_id !== "string" ||
    !requestIdPattern.test(intent.request_id) ||
    !commit(reviewed.authority_revision) ||
    !digest(reviewed.projection_digest)
  ) {
    throw invalid("Workspace Inventory promotion identity is invalid.");
  }
  const candidate = assertWorkspaceRegistryCandidate(intent.candidate);
  const preparation = assertWorkspaceInventoryPreparation(
    intent.reviewed_preparation,
  );
  if (
    candidate.target.record_id !== preparation.target.record_id ||
    candidate.intake_entry_ref.digest !== preparation.intake_entry_ref.digest ||
    reviewed.authority_revision !== preparation.authority_revision
  ) {
    throw invalid("Workspace Inventory promotion review is stale or mismatched.");
  }
  return {
    candidate,
    request_id: intent.request_id,
    reviewed_preparation: preparation,
    reviewed_projection: {
      authority_revision: reviewed.authority_revision as string,
      projection_digest: reviewed.projection_digest as string,
    },
  };
}

export function assertWorkspaceInventoryRequestId(value: unknown) {
  if (typeof value !== "string" || !requestIdPattern.test(value)) {
    throw invalid("Workspace Inventory request identity is invalid.");
  }
  return value;
}

export function assertWorkspaceInventoryResult(
  value: unknown,
  expectedRequestId?: string,
): WorkspaceInventoryResult {
  const result = record(value, "promotion result");
  if (
    result.schema_version !== 1 ||
    result.workflow_id !== "workspace-inventory-promotion" ||
    typeof result.request_id !== "string" ||
    !requestIdPattern.test(result.request_id) ||
    (expectedRequestId && result.request_id !== expectedRequestId) ||
    !statuses.has(result.status as WorkspaceInventoryStatus) ||
    !nextActions.has(String(result.next_action)) ||
    !Number.isInteger(result.revision) ||
    Number(result.revision) < 1 ||
    typeof result.canonical_mutation !== "boolean" ||
    !Array.isArray(result.history)
  ) {
    throw invalid("Workspace Inventory result is invalid or mismatched.");
  }
  const history = result.history.map((value, index) => {
    const event = record(value, "history event");
    if (
      event.sequence !== index + 1 ||
      !dateTime(event.at) ||
      !statuses.has(event.status as WorkspaceInventoryStatus) ||
      (event.details !== null && !isRecord(event.details))
    ) {
      throw invalid("Workspace Inventory history is incomplete or out of order.");
    }
    return {
      at: event.at as string,
      details: event.details as Readonly<Record<string, unknown>> | null,
      sequence: Number(event.sequence),
      status: event.status as WorkspaceInventoryStatus,
    };
  });
  const review = result.review === null ? null : record(result.review, "review");
  if (
    review &&
    (review.repository !== "workspace-governance" ||
      review.base_branch !== "main" ||
      !text(review.branch) ||
      !commit(review.base_commit) ||
      !commit(review.head_commit) ||
      !Number.isInteger(review.number) ||
      typeof review.merged !== "boolean" ||
      typeof review.human_reviewed !== "boolean" ||
      !text(review.state) ||
      !httpUrl(review.url) ||
      (review.merge_commit !== null && !commit(review.merge_commit)))
  ) {
    throw invalid("Workspace Inventory review evidence is invalid.");
  }
  const receipt = result.receipt === null ? null : record(result.receipt, "receipt");
  if (
    receipt &&
    (receipt.schema_version !== 1 ||
      receipt.artifact_type !== "workspace-inventory-promotion-receipt" ||
      !text(receipt.receipt_id) ||
      !digest(receipt.receipt_digest) ||
      !dateTime(receipt.completed_at) ||
      receipt.phase !== "merged-authority" ||
      receipt.outcome !== "succeeded")
  ) {
    throw invalid("Workspace Inventory receipt evidence is invalid.");
  }
  if (
    result.status === "succeeded" &&
    (!receipt || !isRecord(result.readback) || result.canonical_mutation !== true)
  ) {
    throw invalid("Workspace Inventory success requires merged readback and receipt evidence.");
  }
  if (result.status !== "succeeded" && result.canonical_mutation !== false) {
    throw invalid("A non-terminal Workspace Inventory result cannot claim canonical mutation.");
  }
  const failure = result.failure === null ? null : record(result.failure, "failure");
  if (
    failure &&
    (!text(failure.code) ||
      !text(failure.message) ||
      typeof failure.retryable !== "boolean")
  ) {
    throw invalid("Workspace Inventory failure projection is invalid.");
  }
  return {
    canonical_mutation: result.canonical_mutation,
    failure: failure as WorkspaceInventoryResult["failure"],
    history,
    next_action: result.next_action as WorkspaceInventoryResult["next_action"],
    readback: result.readback as WorkspaceInventoryResult["readback"],
    receipt: receipt as WorkspaceInventoryResult["receipt"],
    request_id: result.request_id,
    revision: Number(result.revision),
    review: review as WorkspaceInventoryResult["review"],
    schema_version: 1,
    status: result.status as WorkspaceInventoryStatus,
    workflow_id: "workspace-inventory-promotion",
  };
}

export function sameWorkspaceRegistrySnapshot(
  left: WorkspaceRegistrySnapshot,
  right: WorkspaceRegistrySnapshot,
) {
  return (
    left.authority_revision === right.authority_revision &&
    left.projection_digest === right.projection_digest
  );
}

export function sameWorkspaceInventoryPreparation(
  left: WorkspaceInventoryPreparation,
  right: WorkspaceInventoryPreparation,
) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function assertWorkspaceRegistryRecord(value: unknown): WorkspaceRegistryRecord {
  const item = record(value, "active record");
  const kind = item.kind as WorkspaceRegistryKind;
  const lineage = record(item.lineage, "record lineage");
  const mutation = record(item.last_mutation, "last mutation");
  if (
    !targetKinds.has(kind) ||
    typeof item.name !== "string" ||
    !targetNamePattern.test(item.name) ||
    item.id !== `${kind}:${item.name}` ||
    !postures.has(String(item.posture)) ||
    !(item.maturity === null || text(item.maturity)) ||
    !Number.isInteger(item.version) ||
    Number(item.version) < 1 ||
    !digest(item.record_digest) ||
    !stringList(item.owner_refs, true) ||
    !text(lineage.source) ||
    !text(lineage.source_ref) ||
    !digest(lineage.source_digest) ||
    !(
      lineage.intake_entry_version === null ||
      (Number.isInteger(lineage.intake_entry_version) &&
        Number(lineage.intake_entry_version) >= 1)
    ) ||
    !text(mutation.id) ||
    !text(mutation.action) ||
    !dateTime(mutation.applied_at) ||
    !nullableText(mutation.request_ref) ||
    !nullableText(mutation.readiness_ref)
  ) {
    throw invalid("Workspace Registry active record is incomplete.");
  }
  return {
    id: item.id as string,
    kind,
    last_mutation: {
      action: mutation.action as string,
      applied_at: mutation.applied_at as string,
      id: mutation.id as string,
      readiness_ref: mutation.readiness_ref as string | null,
      request_ref: mutation.request_ref as string | null,
    },
    lineage: {
      intake_entry_version: lineage.intake_entry_version as number | null,
      source: lineage.source as string,
      source_digest: lineage.source_digest as string,
      source_ref: lineage.source_ref as string,
    },
    maturity: item.maturity as string | null,
    name: item.name,
    owner_refs: [...(item.owner_refs as string[])],
    posture: item.posture as WorkspaceRegistryRecord["posture"],
    record_digest: item.record_digest as string,
    version: Number(item.version),
  };
}

function assertExpectedState(value: unknown): WorkspaceInventoryExpectedState {
  const expected = record(value, "expected state");
  if (
    !digest(expected.intake_register_digest) ||
    !digest(expected.active_inventory_digest) ||
    !Number.isInteger(expected.intake_entry_version) ||
    Number(expected.intake_entry_version) < 1 ||
    !digest(expected.intake_entry_digest) ||
    expected.active_record_version !== null ||
    expected.active_record_digest !== null
  ) {
    throw invalid("Workspace Inventory optimistic state is invalid.");
  }
  return {
    active_inventory_digest: expected.active_inventory_digest,
    active_record_digest: null,
    active_record_version: null,
    intake_entry_digest: expected.intake_entry_digest,
    intake_entry_version: Number(expected.intake_entry_version),
    intake_register_digest: expected.intake_register_digest,
  } as WorkspaceInventoryExpectedState;
}

function commit(value: unknown): value is string {
  return typeof value === "string" && commitPattern.test(value);
}

function dateTime(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function digest(value: unknown): value is string {
  return typeof value === "string" && digestPattern.test(value);
}

function httpUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//.test(value);
}

function nullableText(value: unknown) {
  return value === null || text(value);
}

function stringList(value: unknown, requireItems: boolean): value is string[] {
  return (
    Array.isArray(value) &&
    (!requireItems || value.length > 0) &&
    value.every(text) &&
    new Set(value).size === value.length
  );
}

function text(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw invalid(`Workspace Registry ${label} is invalid.`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalid(message: string) {
  return new WorkspaceRegistryContractError(message);
}
