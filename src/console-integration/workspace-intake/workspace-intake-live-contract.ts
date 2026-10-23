import type {
  WorkspaceIntakeCandidate,
  WorkspaceIntakeCustodyPreparation,
  WorkspaceIntakeExpectedState,
  WorkspaceIntakePreparation,
  WorkspaceIntakeRequestedRecord,
  WorkspaceIntakeResult,
  WorkspaceIntakeSubmissionIntent,
  WorkspaceIntakeTargetKind,
  WorkspaceIntakeSourceCandidate,
  WorkspaceIntakeRequestPage,
} from "./workspace-intake-live-types.ts";

const digestPattern = /^sha256:[0-9a-f]{64}$/;
const commitPattern = /^[0-9a-f]{40}$/;
const targetNamePattern = /^[a-z0-9][a-z0-9._-]*$/;
const requestIdPattern = /^workspace-intake-request:[A-Za-z0-9._:-]+$/;
const decisions = new Set(["admitted", "out-of-scope", "proposed"]);
const targetKinds = new Set(["component", "product", "repo"]);
const sourceClasses = new Set([
  "delivery",
  "direct",
  "prototype",
  "repository-custody",
]);
const workflowStatuses = new Set([
  "accepted",
  "cancelled",
  "cancelling",
  "evaluating",
  "preparing",
  "rejected",
  "requires-action",
  "review-required",
  "succeeded",
]);
const nextActions = new Set([
  "complete",
  "continue",
  "inspect-review-or-cancel",
  "restore-dependency-and-retry",
  "review-and-merge",
  "submit-corrected-request",
]);

// Shared projection only: the server still constructs and verifies the command.
// Changing classification requires a newly prepared custody candidate, not a
// silent rewrite of the source the operator reviewed.
export function workspaceIntakeRecordForDecision(
  record: WorkspaceIntakeRequestedRecord,
  decision: WorkspaceIntakeSubmissionIntent["decision"],
): WorkspaceIntakeRequestedRecord {
  if (decision !== "out-of-scope") return record;
  if (record.kind === "repo") return {
    kind: "repo", notes: record.notes,
    ...(record.provider_repository ? { provider_repository: record.provider_repository } : {}),
    repo_class: null, requires_security_bindings: null, security_owner: null,
  };
  if (record.kind === "product") return {
    intended_endpoint: null, kind: "product", notes: record.notes,
    platform_owner: null, runtime_owner: null, security_owner: null, source_owners: [],
  };
  return { component_class: null, kind: "component", notes: record.notes,
    owner_repo: null, product: null, security_owner: null };
}

export class WorkspaceIntakeContractError extends Error {
  readonly code: string;

  constructor(message: string, code = "workspace_intake_contract_invalid") {
    super(message);
    this.code = code;
  }
}

export function assertWorkspaceIntakeRequestPage(value: unknown, targetName: string, custodyRequestId: string | null,
  kind: WorkspaceIntakeTargetKind = "repo"): WorkspaceIntakeRequestPage {
  const page = record(value, "retained request page");
  const direct = custodyRequestId === null;
  const target = assertWorkspaceIntakeTarget(page.target);
  const wireTarget = record(page.target, "retained request target");
  const keys = "custody_request_id,next_cursor,pending_request_count,records,revision,schema_version," + (direct ? "source_class," : "") + "target,updated_at,workflow_id";
  if (Object.keys(page).sort().join(",") !== keys ||
      (direct ? !["product", "component"].includes(kind) || page.source_class !== "direct" : kind !== "repo") ||
      page.schema_version !== 1 || page.workflow_id !== "workspace-intake" || target.kind !== kind || target.name !== targetName ||
      wireTarget.record_id !== `${kind}:${targetName}` || page.custody_request_id !== custodyRequestId ||
      !Number.isSafeInteger(page.revision) || Number(page.revision) < 0 ||
      !Number.isSafeInteger(page.pending_request_count) || Number(page.pending_request_count) < 0 ||
      (page.updated_at !== null && !dateTime(page.updated_at)) ||
      (page.next_cursor !== null && (typeof page.next_cursor !== "string" || !/^[0-9a-f]{64}$/.test(page.next_cursor))) ||
      !Array.isArray(page.records) || page.records.length > 25) throw invalid("Retained Intake page does not bind this exact custody target.");
  const ids = new Set<string>();
  const records = page.records.map(value => {
    const entry = record(value, "retained request");
    const requestId = assertWorkspaceIntakeRequestId(entry.request_id);
    const projected = assertCustodySourceCandidate(entry.candidate, kind, targetName, `${kind}:${targetName}`, direct);
    const sourcePrefix = `oos://repository-custody/requests/${encodeURIComponent(custodyRequestId ?? "")}/intake/`;
    if (Object.keys(entry).sort().join(",") !== "candidate,classification,request_id,requested_at,revision,status,updated_at" ||
        ids.has(requestId) || !dateTime(entry.requested_at) || !dateTime(entry.updated_at) ||
        !workflowStatuses.has(String(entry.status)) || !decisions.has(String(entry.classification)) ||
        !Number.isSafeInteger(entry.revision) || Number(entry.revision) < 1 ||
        (!direct && (!projected.source.ref.startsWith(sourcePrefix) || !/^[0-9a-f]{64}$/.test(projected.source.ref.slice(sourcePrefix.length))))) {
      throw invalid("Retained Intake request has invalid or cross-custody metadata.");
    }
    ids.add(requestId);
    return { request_id: requestId, requested_at: String(entry.requested_at), updated_at: String(entry.updated_at),
      revision: Number(entry.revision), classification: entry.classification as WorkspaceIntakeRequestPage["records"][number]["classification"],
      status: entry.status as WorkspaceIntakeResult["status"], candidate: projected };
  });
  const visiblePending = records.filter(entry => !["succeeded", "cancelled", "rejected", "requires-action"].includes(entry.status)).length;
  if (Number(page.revision) < records.reduce((total, entry) => total + entry.revision, 0) ||
      Number(page.pending_request_count) < visiblePending || Number(page.pending_request_count) > Number(page.revision) ||
      (Number(page.revision) === 0 && (records.length > 0 || page.updated_at !== null || page.next_cursor !== null)) ||
      (Number(page.revision) > 0 && page.updated_at === null)) throw invalid("Retained Intake counters do not match their visible metadata.");
  return { schema_version: 1, workflow_id: "workspace-intake", target: { ...target, record_id: `${kind}:${targetName}` },
    ...(direct ? { source_class: "direct" as const } : {}),
    custody_request_id: custodyRequestId, revision: Number(page.revision), pending_request_count: Number(page.pending_request_count), updated_at: page.updated_at as string | null,
    records, next_cursor: page.next_cursor as string | null };
}

export function assertWorkspaceIntakeRequestId(value: unknown) {
  if (typeof value !== "string" || !requestIdPattern.test(value)) {
    throw invalid("Workspace Intake request identity is invalid.");
  }
  return value;
}

export function assertWorkspaceIntakeTarget(value: unknown) {
  const target = record(value, "target");
  const kind = target.kind as WorkspaceIntakeTargetKind;
  if (
    !targetKinds.has(kind) ||
    typeof target.name !== "string" ||
    !targetNamePattern.test(target.name)
  ) {
    throw invalid("Workspace Intake target is invalid.");
  }
  return { kind, name: target.name };
}

export function assertWorkspaceIntakeCustodyPreparation(value: unknown): WorkspaceIntakeCustodyPreparation {
  const custody = record(value, "repository custody preparation");
  if (Object.keys(custody).sort().join(",") !== "request_id,requested_record" || !text(custody.request_id)) {
    throw invalid("Repository custody preparation requires exactly request_id and requested_record.");
  }
  const requested = assertRequestedRecord(custody.requested_record, "repo");
  if (requested.kind !== "repo") throw invalid("Repository custody preparation requires a repository record.");
  return { request_id: String(custody.request_id), requested_record: requested };
}

export function assertWorkspaceIntakeCandidate(
  value: unknown,
): WorkspaceIntakeCandidate {
  const candidate = record(value, "candidate");
  const source = record(candidate.source, "candidate source");
  const target = record(candidate.target, "candidate target");
  const kind = target.kind as WorkspaceIntakeTargetKind;
  if (
    !text(candidate.label) ||
    !targetKinds.has(kind) ||
    typeof target.name !== "string" ||
    !targetNamePattern.test(target.name) ||
    !sourceClasses.has(String(source.class)) ||
    !text(source.ref) ||
    typeof source.digest !== "string" ||
    !digestPattern.test(source.digest) ||
    !stringList(candidate.evidence_refs)
  ) {
    throw invalid("Workspace Intake candidate identity or source evidence is invalid.");
  }
  const requestedRecord = assertRequestedRecord(candidate.requested_record, kind);
  return {
    evidence_refs: [...(candidate.evidence_refs as string[])],
    label: String(candidate.label),
    requested_record: requestedRecord,
    source: {
      class: source.class as WorkspaceIntakeCandidate["source"]["class"],
      digest: String(source.digest),
      ref: String(source.ref),
    },
    target: { kind, name: String(target.name) },
  };
}

export function assertWorkspaceIntakeSubmissionIntent(
  value: unknown,
): WorkspaceIntakeSubmissionIntent {
  const intent = record(value, "submission intent");
  if (
    typeof intent.request_id !== "string" ||
    !requestIdPattern.test(intent.request_id) ||
    !decisions.has(String(intent.decision))
  ) {
    throw invalid("Workspace Intake decision or request identity is invalid.");
  }
  const candidate = assertWorkspaceIntakeCandidate(intent.candidate);
  const reviewedPreparation = assertWorkspaceIntakePreparation(
    intent.reviewed_preparation,
  );
  if (
    candidate.target.kind !== reviewedPreparation.target.kind ||
    candidate.target.name !== reviewedPreparation.target.name
  ) {
    throw invalid("Workspace Intake preparation does not match the reviewed candidate.");
  }
  return {
    candidate,
    decision: intent.decision as WorkspaceIntakeSubmissionIntent["decision"],
    request_id: intent.request_id,
    reviewed_preparation: reviewedPreparation,
  };
}

export function assertWorkspaceIntakePreparation(
  value: unknown,
): WorkspaceIntakePreparation {
  const preparation = record(value, "preparation");
  const target = record(preparation.target, "preparation target");
  const expected = assertExpectedState(preparation.expected_state);
  const authority = record(
    preparation.canonical_authority,
    "canonical authority",
  );
  const kind = target.kind as WorkspaceIntakeTargetKind;
  let sourceCandidate: WorkspaceIntakeSourceCandidate | undefined;
  if (preparation.source_candidate !== undefined) {
    sourceCandidate = assertCustodySourceCandidate(preparation.source_candidate, kind, String(target.name), String(target.record_id));
  }
  if (
    preparation.schema_version !== 1 ||
    preparation.workflow_id !== "workspace-intake" ||
    typeof preparation.authority_revision !== "string" ||
    !commitPattern.test(preparation.authority_revision) ||
    !targetKinds.has(kind) ||
    typeof target.name !== "string" ||
    !targetNamePattern.test(target.name) ||
    target.record_id !== `${kind}:${target.name}` ||
    authority.repo !== "workspace-governance" ||
    authority.path !== "contracts/intake-register.yaml" ||
    authority.branch !== "main" ||
    preparation.canonical_mutation !== false
  ) {
    throw invalid("Workspace Intake preparation is not canonical read-only authority.");
  }
  return {
    authority_revision: preparation.authority_revision,
    canonical_authority: {
      branch: "main",
      path: "contracts/intake-register.yaml",
      repo: "workspace-governance",
    },
    canonical_mutation: false,
    expected_state: expected,
    schema_version: 1,
    ...(sourceCandidate ? { source_candidate: sourceCandidate } : {}),
    target: {
      kind,
      name: target.name,
      record_id: target.record_id as string,
    },
    workflow_id: "workspace-intake",
  };
}

function assertCustodySourceCandidate(value: unknown, kind: WorkspaceIntakeTargetKind, name: string, recordId: string, direct = false): WorkspaceIntakeSourceCandidate {
  const wire = record(value, "custody source candidate");
  const wireTarget = record(wire.target, "custody source target");
  const candidate = assertWorkspaceIntakeCandidate({ ...wire, label: name });
  if (Object.keys(wire).sort().join(",") !== "artifact_type,candidate_digest,evidence_refs,requested_record,schema_version,source,target" ||
      wire.schema_version !== 1 || wire.artifact_type !== "workspace-intake-source-candidate" ||
      typeof wire.candidate_digest !== "string" || !digestPattern.test(wire.candidate_digest) ||
      (direct ? candidate.source.class !== "direct" || !["product", "component"].includes(kind) : candidate.source.class !== "repository-custody" || kind !== "repo") || candidate.target.kind !== kind ||
      candidate.target.name !== name || wireTarget.record_id !== recordId) {
    throw invalid("Repository custody source candidate does not match its exact target.");
  }
  return { schema_version: 1, artifact_type: "workspace-intake-source-candidate",
    candidate_digest: wire.candidate_digest, source: candidate.source,
    target: { ...candidate.target, record_id: recordId }, requested_record: candidate.requested_record,
    evidence_refs: candidate.evidence_refs };
}

export function assertWorkspaceIntakeResult(
  value: unknown,
  expectedRequestId?: string,
): WorkspaceIntakeResult {
  const result = record(value, "workflow result");
  if (
    result.schema_version !== 1 ||
    result.workflow_id !== "workspace-intake" ||
    typeof result.request_id !== "string" ||
    !requestIdPattern.test(result.request_id) ||
    (expectedRequestId && result.request_id !== expectedRequestId) ||
    !workflowStatuses.has(String(result.status)) ||
    !nextActions.has(String(result.next_action)) ||
    !Number.isInteger(result.revision) ||
    Number(result.revision) < 1 ||
    typeof result.canonical_mutation !== "boolean" ||
    !Array.isArray(result.history) ||
    result.history.length < 1
  ) {
    throw invalid("Workspace Intake workflow projection is invalid or mismatched.");
  }
  const history = result.history.map((entry, index) => {
    const event = record(entry, "history event");
    if (
      event.sequence !== index + 1 ||
      !dateTime(event.at) ||
      !workflowStatuses.has(String(event.status)) ||
      (event.details !== null && !isRecord(event.details))
    ) {
      throw invalid("Workspace Intake history is incomplete or out of order.");
    }
    return event as WorkspaceIntakeResult["history"][number];
  });
  const review = result.review === null ? null : record(result.review, "review");
  if (
    review &&
    (review.repository !== "workspace-governance" ||
      review.base_branch !== "main" ||
      !text(review.branch) ||
      !Number.isInteger(review.number) ||
      Number(review.number) < 1 ||
      typeof review.merged !== "boolean" ||
      typeof review.human_reviewed !== "boolean" ||
      !text(review.state) ||
      !text(review.url) ||
      !/^https?:\/\//.test(String(review.url)) ||
      !commitPattern.test(String(review.base_commit)) ||
      (review.merge_commit !== null &&
        !commitPattern.test(String(review.merge_commit))) ||
      !commitPattern.test(String(review.head_commit)))
  ) {
    throw invalid("Workspace Intake review evidence is invalid.");
  }
  const receipt = result.receipt === null ? null : record(result.receipt, "receipt");
  if (
    receipt &&
    (receipt.schema_version !== 2 ||
      receipt.artifact_type !== "workspace-intake-receipt" ||
      !text(receipt.receipt_id) ||
      !dateTime(receipt.completed_at) ||
      !new Set(["source-preparation", "source-replay", "merged-authority"]).has(
        String(receipt.phase),
      ) ||
      !new Set(["prepared", "replayed", "succeeded"]).has(
        String(receipt.outcome),
      ) ||
      !digestPattern.test(String(receipt.receipt_digest)))
  ) {
    throw invalid("Workspace Intake receipt evidence is invalid.");
  }
  if (
    result.status === "succeeded" &&
    (!receipt ||
      receipt.phase !== "merged-authority" ||
      receipt.outcome !== "succeeded" ||
      !digestPattern.test(String(receipt.receipt_digest)) ||
      result.canonical_mutation !== true)
  ) {
    throw invalid("Succeeded Workspace Intake requires merged canonical receipt evidence.");
  }
  if (result.status !== "succeeded" && result.canonical_mutation) {
    throw invalid("Non-terminal Workspace Intake cannot claim canonical mutation.");
  }
  const failure = result.failure === null ? null : record(result.failure, "failure");
  if (
    failure &&
    (!text(failure.code) ||
      !text(failure.message) ||
      typeof failure.retryable !== "boolean")
  ) {
    throw invalid("Workspace Intake failure projection is invalid.");
  }
  if (result.status === "succeeded" && !isRecord(result.readback)) {
    throw invalid("Succeeded Workspace Intake requires canonical readback.");
  }
  const nativeReadiness = result.readiness == null ? null : record(record(result.readiness, "readiness").receipt, "readiness receipt");
  if (nativeReadiness && (nativeReadiness.schema_version !== 1 || nativeReadiness.artifact_type !== "wgcf-workspace-intake-readiness" ||
      record(nativeReadiness.request_ref, "readiness request").id !== result.request_id ||
      !digestPattern.test(String(record(nativeReadiness.request_ref, "readiness request").digest)) ||
      !digestPattern.test(String(nativeReadiness.receipt_digest)) || !["allowed", "denied", "requires-action"].includes(String(nativeReadiness.outcome)) ||
      (nativeReadiness.outcome === "denied" && result.status !== "rejected") ||
      (nativeReadiness.outcome === "requires-action" && result.status !== "requires-action"))) {
    throw invalid("Workspace Intake readiness findings do not bind this request and outcome.");
  }
  const findingsInput = nativeReadiness?.findings ?? result.readiness_findings;
  let findings: WorkspaceIntakeResult["readiness_findings"];
  if (findingsInput !== undefined) {
    if (!Array.isArray(findingsInput)) throw invalid("Workspace Intake readiness findings are invalid.");
    findings = findingsInput.map(value => {
      const finding = record(value, "readiness finding");
      if (Object.keys(finding).sort().join(",") !== "code,message,next_action,severity" ||
          !text(finding.code) || !text(finding.message) || !text(finding.next_action) || finding.severity !== "blocking") {
        throw invalid("Workspace Intake readiness finding is invalid.");
      }
      return { code: String(finding.code), message: String(finding.message), next_action: String(finding.next_action), severity: "blocking" as const };
    });
    if (nativeReadiness && (nativeReadiness.outcome === "allowed" ? findings.length !== 0 : findings.length === 0)) {
      throw invalid("Workspace Intake readiness findings contradict their outcome.");
    }
    if (findings.length && !["rejected", "requires-action"].includes(String(result.status))) {
      throw invalid("Workspace Intake readiness findings contradict the workflow status.");
    }
    if (nativeReadiness && result.readiness_findings !== undefined) {
      const projected = result.readiness_findings;
      if (!Array.isArray(projected) || projected.length !== findings.length || projected.some((value, index) => {
        const finding = record(value, "projected readiness finding"), expected = findings![index];
        return Object.keys(finding).sort().join(",") !== "code,message,next_action,severity" ||
          finding.code !== expected.code || finding.message !== expected.message || finding.next_action !== expected.next_action || finding.severity !== expected.severity;
      })) throw invalid("Workspace Intake readiness finding projections conflict.");
    }
  }
  return {
    ...(findings === undefined ? {} : { readiness_findings: findings }),
    canonical_mutation: result.canonical_mutation,
    failure: failure as WorkspaceIntakeResult["failure"],
    history,
    next_action: result.next_action as WorkspaceIntakeResult["next_action"],
    readback: result.readback ?? null,
    receipt: receipt as WorkspaceIntakeResult["receipt"],
    request_id: result.request_id,
    revision: Number(result.revision),
    review: review as WorkspaceIntakeResult["review"],
    schema_version: 1,
    status: result.status as WorkspaceIntakeResult["status"],
    workflow_id: "workspace-intake",
  };
}

export function sameWorkspaceIntakePreparation(
  left: WorkspaceIntakePreparation,
  right: WorkspaceIntakePreparation,
) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function assertExpectedState(value: unknown): WorkspaceIntakeExpectedState {
  const expected = record(value, "expected state");
  const version = expected.record_version;
  const recordDigest = expected.record_digest;
  if (
    typeof expected.register_digest !== "string" ||
    !digestPattern.test(expected.register_digest) ||
    !(
      (version === null && recordDigest === null) ||
      (Number.isInteger(version) &&
        Number(version) >= 1 &&
        typeof recordDigest === "string" &&
        digestPattern.test(recordDigest))
    )
  ) {
    throw invalid("Workspace Intake optimistic state is invalid.");
  }
  return {
    record_digest: recordDigest as string | null,
    record_version: version as number | null,
    register_digest: expected.register_digest,
  };
}

function assertRequestedRecord(
  value: unknown,
  expectedKind: WorkspaceIntakeTargetKind,
): WorkspaceIntakeRequestedRecord {
  const requested = record(value, "requested record");
  if (requested.kind !== expectedKind || !text(requested.notes)) {
    throw invalid("Workspace Intake requested record does not match its target.");
  }
  const validation = requested.validation_behavior;
  let normalizedValidation: WorkspaceIntakeRequestedRecord["validation_behavior"];
  if (validation !== undefined) {
    const behavior = record(validation, "validation behavior");
    if (
      !text(behavior.posture) ||
      !text(behavior.wgcf_graph_role) ||
      !text(behavior.notes) ||
      !stringList(behavior.catalog_refs, false)
    ) {
      throw invalid("Workspace Intake validation behavior is incomplete.");
    }
    normalizedValidation = {
      catalog_refs: [...(behavior.catalog_refs as string[])],
      notes: String(behavior.notes),
      posture: String(behavior.posture),
      wgcf_graph_role: String(behavior.wgcf_graph_role),
    };
  }
  if (expectedKind === "repo") {
    let provider: Extract<WorkspaceIntakeRequestedRecord, { kind: "repo" }>["provider_repository"];
    if (requested.provider_repository !== undefined) {
      const binding = record(requested.provider_repository, "provider repository");
      if (Object.keys(binding).sort().join(",") !== "full_name,provider,provider_repository_id" ||
          binding.provider !== "github" || typeof binding.provider_repository_id !== "string" ||
          !/^[1-9][0-9]*$/.test(binding.provider_repository_id) || typeof binding.full_name !== "string" ||
          !/^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9._-]+$/.test(binding.full_name)) {
        throw invalid("Repository provider binding is invalid.");
      }
      provider = { provider: "github", provider_repository_id: binding.provider_repository_id, full_name: binding.full_name };
    }
    if (
      !nullableText(requested.repo_class) ||
      !nullableText(requested.security_owner) ||
      !nullableBoolean(requested.requires_security_bindings)
    ) {
      throw invalid("Repository intake metadata is invalid.");
    }
    return {
      ...(normalizedValidation ? { validation_behavior: normalizedValidation } : {}),
      kind: "repo",
      ...(provider ? { provider_repository: provider } : {}),
      notes: String(requested.notes),
      repo_class: requested.repo_class as string | null,
      requires_security_bindings: requested.requires_security_bindings as boolean | null,
      security_owner: requested.security_owner as string | null,
    };
  } else if (expectedKind === "product") {
    if (
      !nullableText(requested.platform_owner) ||
      !nullableText(requested.security_owner) ||
      !nullableText(requested.runtime_owner) ||
      !nullableText(requested.intended_endpoint) ||
      !stringList(requested.source_owners, false)
    ) {
      throw invalid("Product intake metadata is invalid.");
    }
    return {
      ...(normalizedValidation ? { validation_behavior: normalizedValidation } : {}),
      intended_endpoint: requested.intended_endpoint as string | null,
      kind: "product",
      notes: String(requested.notes),
      platform_owner: requested.platform_owner as string | null,
      runtime_owner: requested.runtime_owner as string | null,
      security_owner: requested.security_owner as string | null,
      source_owners: [...(requested.source_owners as string[])],
    };
  } else if (
    !nullableText(requested.component_class) ||
    !nullableText(requested.owner_repo) ||
    !nullableText(requested.security_owner) ||
    !nullableText(requested.product)
  ) {
    throw invalid("Component intake metadata is invalid.");
  }
  return {
    ...(normalizedValidation ? { validation_behavior: normalizedValidation } : {}),
    component_class: requested.component_class as string | null,
    kind: "component",
    notes: String(requested.notes),
    owner_repo: requested.owner_repo as string | null,
    product: requested.product as string | null,
    security_owner: requested.security_owner as string | null,
  };
}

function nullableText(value: unknown) {
  return value === null || text(value);
}

function nullableBoolean(value: unknown) {
  return value === null || typeof value === "boolean";
}

function stringList(value: unknown, requireItem = true): value is string[] {
  return (
    Array.isArray(value) &&
    (!requireItem || value.length > 0) &&
    value.every((entry) => text(entry)) &&
    new Set(value).size === value.length
  );
}

function dateTime(value: unknown) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function text(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw invalid(`Workspace Intake ${label} is invalid.`);
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalid(message: string) {
  return new WorkspaceIntakeContractError(message);
}
