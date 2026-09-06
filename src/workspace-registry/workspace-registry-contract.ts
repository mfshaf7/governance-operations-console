import type {
  WorkspaceInventoryArtifactRef,
  WorkspaceInventoryExpectedState,
  WorkspaceInventoryLifecycleAction,
  WorkspaceInventoryLifecycleExpectedState,
  WorkspaceInventoryLifecyclePreparation,
  WorkspaceInventoryLifecycleRequest,
  WorkspaceInventoryLifecycleResult,
  WorkspaceInventoryLifecycleSubmissionIntent,
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
const lifecycleRequestIdPattern =
  /^workspace-inventory-lifecycle-request:[A-Za-z0-9._:-]+$/;
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
const lifecycleActions = new Set<WorkspaceInventoryLifecycleAction>([
  "restore",
  "retire",
  "suspend",
  "update",
]);
const lifecycleNextActions = new Set([
  "complete",
  "continue",
  "inspect-review-or-cancel",
  "refresh-and-resubmit",
  "restore-dependency-and-retry",
  "review-and-merge",
  "submit-corrected-request",
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

export function assertWorkspaceInventoryLifecyclePreparation(
  value: unknown,
): WorkspaceInventoryLifecyclePreparation {
  const preparation = record(value, "lifecycle preparation");
  const target = assertWorkspaceRegistryTarget(preparation.target);
  const expected = assertLifecycleExpectedState(preparation.expected_state);
  const authority = record(preparation.canonical_authority, "canonical authority");
  const currentRecord = record(preparation.current_record, "current lifecycle record");
  const envelope = record(currentRecord.record, "current lifecycle record envelope");
  const expectedPath = inventoryPath(target.kind);
  const latestEvent = nullableArtifactRef(
    preparation.latest_event_ref,
    "latest lifecycle event",
  );
  if (
    preparation.schema_version !== 1 ||
    preparation.workflow_id !== "workspace-inventory-lifecycle" ||
    !commit(preparation.authority_revision) ||
    preparation.canonical_mutation !== false ||
    authority.repo !== "workspace-governance" ||
    authority.branch !== "main" ||
    authority.inventory_path !== expectedPath ||
    authority.history_path !== "contracts/workspace-inventory-history.yaml" ||
    envelope.id !== target.record_id ||
    envelope.version !== expected.record_version ||
    currentRecord.posture !== expected.posture
  ) {
    throw invalid("Workspace Inventory lifecycle preparation is not current canonical authority.");
  }
  return {
    authority_revision: preparation.authority_revision as string,
    canonical_authority: {
      branch: "main",
      history_path: "contracts/workspace-inventory-history.yaml",
      inventory_path: expectedPath,
      repo: "workspace-governance",
    },
    canonical_mutation: false,
    current_record: currentRecord,
    expected_state: expected,
    latest_event_ref: latestEvent,
    schema_version: 1,
    target,
    workflow_id: "workspace-inventory-lifecycle",
  };
}

export function assertWorkspaceInventoryLifecycleSubmissionIntent(
  value: unknown,
): WorkspaceInventoryLifecycleSubmissionIntent {
  const intent = record(value, "lifecycle intent");
  const reviewed = record(intent.reviewed_projection, "reviewed projection");
  const preparation = assertWorkspaceInventoryLifecyclePreparation(
    intent.reviewed_preparation,
  );
  const action = intent.action as WorkspaceInventoryLifecycleAction;
  const requestedValue = intent.requested_value;
  if (
    typeof intent.request_id !== "string" ||
    !lifecycleRequestIdPattern.test(intent.request_id) ||
    !lifecycleActions.has(action) ||
    !text(intent.reason) ||
    !stringList(intent.impact_acknowledgements, true) ||
    !stringList(intent.approval_refs, true) ||
    !commit(reviewed.authority_revision) ||
    !digest(reviewed.projection_digest) ||
    reviewed.authority_revision !== preparation.authority_revision ||
    !lifecycleActionAllowed(action, preparation.expected_state.posture)
  ) {
    throw invalid("Workspace Inventory lifecycle intent is incomplete or unavailable.");
  }
  if (
    action === "update"
      ? !isRecord(requestedValue) ||
        "record" in requestedValue ||
        requestedValue.posture !== preparation.expected_state.posture
      : requestedValue !== null
  ) {
    throw invalid("Workspace Inventory lifecycle requested value does not match the action.");
  }
  if (action === "restore" && !preparation.latest_event_ref) {
    throw invalid("Workspace Inventory restoration requires the latest lifecycle event.");
  }
  return {
    action,
    approval_refs: [...(intent.approval_refs as string[])],
    impact_acknowledgements: [
      ...(intent.impact_acknowledgements as string[]),
    ],
    reason: intent.reason as string,
    request_id: intent.request_id,
    requested_value:
      action === "update"
        ? (requestedValue as Readonly<Record<string, unknown>>)
        : null,
    reviewed_preparation: preparation,
    reviewed_projection: {
      authority_revision: reviewed.authority_revision as string,
      projection_digest: reviewed.projection_digest as string,
    },
  };
}

export function assertWorkspaceInventoryLifecycleRequestId(value: unknown) {
  if (typeof value !== "string" || !lifecycleRequestIdPattern.test(value)) {
    throw invalid("Workspace Inventory lifecycle request identity is invalid.");
  }
  return value;
}

export function assertWorkspaceInventoryLifecycleResult(
  value: unknown,
  expectedRequestId?: string,
): WorkspaceInventoryLifecycleResult {
  const result = record(value, "lifecycle result");
  if (
    result.schema_version !== 1 ||
    result.workflow_id !== "workspace-inventory-lifecycle" ||
    typeof result.request_id !== "string" ||
    !lifecycleRequestIdPattern.test(result.request_id) ||
    (expectedRequestId && result.request_id !== expectedRequestId) ||
    !text(result.session_ref) ||
    !text(result.execution_ref) ||
    !statuses.has(result.status as WorkspaceInventoryStatus) ||
    !lifecycleNextActions.has(String(result.next_action)) ||
    !Number.isInteger(result.revision) ||
    Number(result.revision) < 1 ||
    typeof result.canonical_mutation !== "boolean" ||
    !Array.isArray(result.history)
  ) {
    throw invalid("Workspace Inventory lifecycle result is invalid or mismatched.");
  }
  const request = assertLifecycleRequest(result.request, result.request_id);
  const history = result.history.map((value, index) => {
    const event = record(value, "lifecycle history event");
    if (
      event.sequence !== index + 1 ||
      !dateTime(event.at) ||
      !statuses.has(event.status as WorkspaceInventoryStatus) ||
      (event.details !== null && !isRecord(event.details))
    ) {
      throw invalid("Workspace Inventory lifecycle history is incomplete or out of order.");
    }
    return {
      at: event.at as string,
      details: event.details as Readonly<Record<string, unknown>> | null,
      sequence: Number(event.sequence),
      status: event.status as WorkspaceInventoryStatus,
    };
  });
  const readiness = assertLifecycleReadinessEnvelope(result.readiness, request);
  const review = assertLifecycleReview(result.review);
  const readback = assertLifecycleReadback(result.readback, request);
  const receipt = assertLifecycleReceipt(result.receipt, request);
  const mergedState = assertLifecycleMergedState(result.merged_state, request);
  const failure = result.failure === null ? null : record(result.failure, "lifecycle failure");
  if (
    failure &&
    (!text(failure.code) ||
      !text(failure.message) ||
      typeof failure.retryable !== "boolean")
  ) {
    throw invalid("Workspace Inventory lifecycle failure projection is invalid.");
  }
  if (
    result.status === "succeeded" &&
    (!review ||
      !review.merged ||
      !review.human_reviewed ||
      !review.merge_commit ||
      !readback ||
      !receipt ||
      !readiness ||
      !mergedState ||
      review.merge_commit !== mergedState.authority_revision ||
      readback.active_inventory_digest !== mergedState.active_inventory_digest ||
      readback.history_digest !== mergedState.history_digest ||
      JSON.stringify(readback.record) !== JSON.stringify(mergedState.record) ||
      JSON.stringify(readback.history_event_ref) !==
        JSON.stringify(mergedState.history_event_ref) ||
      receipt.request_ref.id !== request.request_id ||
      receipt.request_ref.digest !== request.request_digest ||
      receipt.readiness_ref.id !== readiness.readiness.readiness_id ||
      receipt.readiness_ref.digest !== readiness.readiness.readiness_digest ||
      receipt.mutation_ref.id !== readback.mutation_ref.id ||
      receipt.mutation_ref.digest !== readback.mutation_ref.digest ||
      receipt.readback_ref.id !== readback.readback_id ||
      receipt.readback_ref.digest !== readback.readback_digest ||
      result.canonical_mutation !== true)
  ) {
    throw invalid("Workspace Inventory lifecycle success requires merged review, readback, receipt, and canonical state.");
  }
  if (result.status !== "succeeded" && result.canonical_mutation !== false) {
    throw invalid("A non-terminal Workspace Inventory lifecycle result cannot claim canonical mutation.");
  }
  return {
    canonical_mutation: result.canonical_mutation,
    execution_ref: result.execution_ref as string,
    failure: failure as WorkspaceInventoryLifecycleResult["failure"],
    history,
    merged_state: mergedState,
    next_action: result.next_action as WorkspaceInventoryLifecycleResult["next_action"],
    readback,
    readiness,
    receipt,
    request,
    request_id: result.request_id,
    revision: Number(result.revision),
    review,
    schema_version: 1,
    session_ref: result.session_ref as string,
    status: result.status as WorkspaceInventoryStatus,
    workflow_id: "workspace-inventory-lifecycle",
  };
}

export function sameWorkspaceInventoryLifecyclePreparation(
  left: WorkspaceInventoryLifecyclePreparation,
  right: WorkspaceInventoryLifecyclePreparation,
) {
  return JSON.stringify(left) === JSON.stringify(right);
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

function assertLifecycleExpectedState(
  value: unknown,
): WorkspaceInventoryLifecycleExpectedState {
  const expected = record(value, "lifecycle expected state");
  if (
    !digest(expected.active_inventory_digest) ||
    !digest(expected.history_digest) ||
    !Number.isInteger(expected.record_version) ||
    Number(expected.record_version) < 1 ||
    !digest(expected.record_digest) ||
    !postures.has(String(expected.posture))
  ) {
    throw invalid("Workspace Inventory lifecycle expected state is invalid.");
  }
  return {
    active_inventory_digest: expected.active_inventory_digest,
    history_digest: expected.history_digest,
    posture: expected.posture as WorkspaceRegistryRecord["posture"],
    record_digest: expected.record_digest,
    record_version: Number(expected.record_version),
  };
}

function assertLifecycleRequest(
  value: unknown,
  expectedRequestId: string,
): WorkspaceInventoryLifecycleRequest {
  const request = record(value, "lifecycle request");
  const action = request.action as WorkspaceInventoryLifecycleAction;
  const target = assertWorkspaceRegistryTarget(request.target);
  const expectedState = assertLifecycleExpectedState(request.expected_state);
  const requestedValue = request.requested_value;
  const priorEvent = nullableArtifactRef(
    request.prior_event_ref,
    "lifecycle prior event",
  );
  if (
    request.schema_version !== 1 ||
    request.artifact_type !== "workspace-inventory-lifecycle-request" ||
    request.request_id !== expectedRequestId ||
    !digest(request.request_digest) ||
    !dateTime(request.requested_at) ||
    !text(request.operator_ref) ||
    !text(request.correlation_ref) ||
    !text(request.idempotency_key) ||
    !lifecycleActions.has(action) ||
    !text(request.reason) ||
    !stringList(request.impact_acknowledgements, true) ||
    !stringList(request.approval_refs, true) ||
    !lifecycleActionAllowed(action, expectedState.posture)
  ) {
    throw invalid("Workspace Inventory lifecycle request is invalid.");
  }
  if (
    action === "update"
      ? !isRecord(requestedValue) ||
        "record" in requestedValue ||
        requestedValue.posture !== expectedState.posture ||
        priorEvent !== null
      : requestedValue !== null
  ) {
    throw invalid("Workspace Inventory lifecycle request value is invalid.");
  }
  if (action === "restore" && !priorEvent) {
    throw invalid("Workspace Inventory lifecycle restoration lacks its prior event.");
  }
  return {
    action,
    approval_refs: [...(request.approval_refs as string[])],
    artifact_type: "workspace-inventory-lifecycle-request",
    correlation_ref: request.correlation_ref as string,
    expected_state: expectedState,
    idempotency_key: request.idempotency_key as string,
    impact_acknowledgements: [
      ...(request.impact_acknowledgements as string[]),
    ],
    operator_ref: request.operator_ref as string,
    prior_event_ref: priorEvent,
    reason: request.reason as string,
    request_digest: request.request_digest as string,
    request_id: request.request_id as string,
    requested_at: request.requested_at as string,
    requested_value:
      action === "update"
        ? (requestedValue as Readonly<Record<string, unknown>>)
        : null,
    schema_version: 1,
    target,
  };
}

function assertLifecycleReadinessEnvelope(
  value: unknown,
  request: WorkspaceInventoryLifecycleRequest,
): WorkspaceInventoryLifecycleResult["readiness"] {
  if (value === null) return null;
  const envelope = record(value, "lifecycle readiness envelope");
  const readiness = record(envelope.readiness, "lifecycle readiness");
  const ledger = record(envelope.ledger, "lifecycle readiness ledger");
  const ledgerRef = record(ledger.ref, "lifecycle readiness ledger reference");
  const requestRef = artifactRef(readiness.request_ref, "lifecycle readiness request");
  const policyRef = artifactRef(readiness.policy_ref, "lifecycle readiness policy");
  const target = assertWorkspaceRegistryTarget(readiness.target);
  const observedState = assertLifecycleExpectedState(readiness.observed_state);
  if (
    readiness.schema_version !== 1 ||
    readiness.artifact_type !== "workspace-inventory-lifecycle-readiness" ||
    !text(readiness.readiness_id) ||
    !digest(readiness.readiness_digest) ||
    !dateTime(readiness.evaluated_at) ||
    requestRef.id !== request.request_id ||
    requestRef.digest !== request.request_digest ||
    target.record_id !== request.target.record_id ||
    readiness.action !== request.action ||
    JSON.stringify(observedState) !== JSON.stringify(request.expected_state) ||
    !new Set(["blocked", "ready"]).has(String(readiness.outcome)) ||
    !stringList(readiness.findings, false) ||
    ledger.state !== "durable" ||
    !new Set(["created", "read", "reused"]).has(String(ledger.resolution)) ||
    !text(ledgerRef.uri) ||
    !digest(ledgerRef.digest) ||
    ledgerRef.digest !== readiness.readiness_digest
  ) {
    throw invalid("Workspace Inventory lifecycle readiness evidence is invalid.");
  }
  return {
    ledger: {
      ref: { digest: ledgerRef.digest as string, uri: ledgerRef.uri as string },
      resolution: ledger.resolution as "created" | "read" | "reused",
      state: "durable",
    },
    readiness: {
      action: request.action,
      artifact_type: "workspace-inventory-lifecycle-readiness",
      evaluated_at: readiness.evaluated_at as string,
      findings: [...(readiness.findings as string[])],
      observed_state: observedState,
      outcome: readiness.outcome as "blocked" | "ready",
      policy_ref: policyRef,
      readiness_digest: readiness.readiness_digest as string,
      readiness_id: readiness.readiness_id as string,
      request_ref: requestRef,
      schema_version: 1,
      target,
    },
  };
}

function assertLifecycleReview(
  value: unknown,
): WorkspaceInventoryLifecycleResult["review"] {
  if (value === null) return null;
  const review = record(value, "lifecycle review");
  if (
    review.repository !== "workspace-governance" ||
    review.base_branch !== "main" ||
    !text(review.branch) ||
    !commit(review.base_commit) ||
    !commit(review.head_commit) ||
    !Number.isInteger(review.number) ||
    typeof review.merged !== "boolean" ||
    typeof review.human_reviewed !== "boolean" ||
    !text(review.state) ||
    !httpUrl(review.url) ||
    (review.merge_commit !== null && !commit(review.merge_commit))
  ) {
    throw invalid("Workspace Inventory lifecycle review evidence is invalid.");
  }
  return review as WorkspaceInventoryLifecycleResult["review"];
}

function assertLifecycleReadback(
  value: unknown,
  request: WorkspaceInventoryLifecycleRequest,
): WorkspaceInventoryLifecycleResult["readback"] {
  if (value === null) return null;
  const readback = record(value, "lifecycle readback");
  const target = assertWorkspaceRegistryTarget(readback.target);
  const event = artifactRef(readback.history_event_ref, "lifecycle history event");
  const mutation = artifactRef(readback.mutation_ref, "lifecycle mutation");
  if (
    readback.schema_version !== 1 ||
    readback.artifact_type !== "workspace-inventory-lifecycle-readback" ||
    !text(readback.readback_id) ||
    !digest(readback.readback_digest) ||
    readback.action !== request.action ||
    target.record_id !== request.target.record_id ||
    readback.authority_state !== "review-branch" ||
    !text(readback.source_branch) ||
    !dateTime(readback.observed_at) ||
    !digest(readback.active_inventory_digest) ||
    !digest(readback.history_digest) ||
    !isRecord(readback.record)
  ) {
    throw invalid("Workspace Inventory lifecycle readback evidence is invalid.");
  }
  return {
    action: request.action,
    active_inventory_digest: readback.active_inventory_digest as string,
    artifact_type: "workspace-inventory-lifecycle-readback",
    authority_state: "review-branch",
    history_digest: readback.history_digest as string,
    history_event_ref: event,
    mutation_ref: mutation,
    observed_at: readback.observed_at as string,
    readback_digest: readback.readback_digest as string,
    readback_id: readback.readback_id as string,
    record: readback.record,
    schema_version: 1,
    source_branch: readback.source_branch as string,
    target,
  };
}

function assertLifecycleReceipt(
  value: unknown,
  request: WorkspaceInventoryLifecycleRequest,
): WorkspaceInventoryLifecycleResult["receipt"] {
  if (value === null) return null;
  const receipt = record(value, "lifecycle receipt");
  const target = assertWorkspaceRegistryTarget(receipt.target);
  const requestRef = artifactRef(receipt.request_ref, "lifecycle receipt request");
  const readinessRef = artifactRef(receipt.readiness_ref, "lifecycle receipt readiness");
  const mutationRef = artifactRef(receipt.mutation_ref, "lifecycle receipt mutation");
  const readbackRef = artifactRef(receipt.readback_ref, "lifecycle receipt readback");
  if (
    receipt.schema_version !== 1 ||
    receipt.artifact_type !== "workspace-inventory-lifecycle-receipt" ||
    !text(receipt.receipt_id) ||
    !digest(receipt.receipt_digest) ||
    receipt.action !== request.action ||
    target.record_id !== request.target.record_id ||
    requestRef.id !== request.request_id ||
    requestRef.digest !== request.request_digest ||
    receipt.operator_ref !== request.operator_ref ||
    receipt.correlation_ref !== request.correlation_ref ||
    receipt.idempotency_key !== request.idempotency_key ||
    !dateTime(receipt.completed_at) ||
    receipt.phase !== "review-branch" ||
    !new Set(["prepared", "replayed"]).has(String(receipt.outcome))
  ) {
    throw invalid("Workspace Inventory lifecycle receipt evidence is invalid.");
  }
  return {
    action: request.action,
    artifact_type: "workspace-inventory-lifecycle-receipt",
    completed_at: receipt.completed_at as string,
    correlation_ref: receipt.correlation_ref as string,
    idempotency_key: receipt.idempotency_key as string,
    operator_ref: receipt.operator_ref as string,
    outcome: receipt.outcome as "prepared" | "replayed",
    phase: "review-branch",
    readback_ref: readbackRef,
    readiness_ref: readinessRef,
    receipt_digest: receipt.receipt_digest as string,
    receipt_id: receipt.receipt_id as string,
    mutation_ref: mutationRef,
    request_ref: requestRef,
    schema_version: 1,
    target,
  };
}

function assertLifecycleMergedState(
  value: unknown,
  request: WorkspaceInventoryLifecycleRequest,
): WorkspaceInventoryLifecycleResult["merged_state"] {
  if (value === null) return null;
  const merged = record(value, "lifecycle merged state");
  const target = assertWorkspaceRegistryTarget(merged.target);
  const event = artifactRef(merged.history_event_ref, "merged lifecycle history event");
  if (
    !commit(merged.authority_revision) ||
    !dateTime(merged.observed_at) ||
    target.record_id !== request.target.record_id ||
    merged.action !== request.action ||
    !digest(merged.active_inventory_digest) ||
    !digest(merged.history_digest) ||
    !isRecord(merged.record)
  ) {
    throw invalid("Workspace Inventory lifecycle merged state is invalid.");
  }
  return {
    action: request.action,
    active_inventory_digest: merged.active_inventory_digest as string,
    authority_revision: merged.authority_revision as string,
    history_digest: merged.history_digest as string,
    history_event_ref: event,
    observed_at: merged.observed_at as string,
    record: merged.record,
    target,
  };
}

function artifactRef(value: unknown, label: string): WorkspaceInventoryArtifactRef {
  const reference = record(value, label);
  if (!text(reference.id) || !digest(reference.digest)) {
    throw invalid(`Workspace Inventory ${label} is invalid.`);
  }
  return { digest: reference.digest as string, id: reference.id as string };
}

function nullableArtifactRef(
  value: unknown,
  label: string,
): WorkspaceInventoryArtifactRef | null {
  return value === null ? null : artifactRef(value, label);
}

function lifecycleActionAllowed(
  action: WorkspaceInventoryLifecycleAction,
  posture: WorkspaceRegistryRecord["posture"],
) {
  return (
    (action === "update" && posture !== "retired") ||
    (action === "suspend" && posture === "active") ||
    (action === "retire" && posture !== "retired") ||
    (action === "restore" && posture !== "active")
  );
}

function inventoryPath(kind: WorkspaceRegistryKind) {
  return ({
    component: "contracts/components.yaml",
    product: "contracts/products.yaml",
    repo: "contracts/repos.yaml",
  } as const)[kind];
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
