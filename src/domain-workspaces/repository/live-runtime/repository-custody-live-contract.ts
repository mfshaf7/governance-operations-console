import type {
  RepositoryCustodyArtifactRef,
  RepositoryCustodyDecision,
  RepositoryCustodyLiveApiError,
  RepositoryCustodyReceipt,
  RepositoryCustodyRequest,
  RepositoryCustodyWorkflowResult,
  RepositoryProviderReadback,
} from "./repository-custody-live-types.ts";

const digestPattern = /^sha256:[a-f0-9]{64}$/;
const requestIdPattern = /^repository-custody-request:[A-Za-z0-9._:-]+$/;
const githubRepositoryIdPattern = /^[1-9][0-9]*$/;

export function assertRepositoryCustodyWorkflowResult(
  value: unknown,
): RepositoryCustodyWorkflowResult {
  const result = record(value, "Repository custody result");
  exact(result.schema_version, 1, "result schema version");
  exact(result.workflow_id, "repository-custody", "workflow identity");
  exact(result.workflow_version, "1", "workflow version");
  string(result.execution_id, "execution identity");
  boolean(result.replayed, "replay state");
  boolean(result.retryable, "retry state");
  oneOf(result.status, ["denied", "failed", "succeeded"], "workflow status");
  oneOf(
    result.next_action,
    ["complete", "request-correction", "retry-provider"],
    "next action",
  );

  const request = assertRepositoryCustodyRequest(result.request);
  const decision = assertDecision(result.decision, request);
  const decisionRef = artifactRef(result.decision_ref, "decision reference");
  exact(
    decisionRef.digest,
    decision.integrity.content_digest,
    "decision reference digest",
  );
  const readback =
    result.provider_readback === null
      ? null
      : assertProviderReadback(result.provider_readback, request);
  const readbackRef = nullableArtifactRef(
    result.provider_readback_ref,
    "provider readback reference",
  );
  if (readback) {
    required(readbackRef, "provider readback reference");
    exact(
      readbackRef.digest,
      readback.integrity.content_digest,
      "provider readback reference digest",
    );
  } else {
    exact(readbackRef, null, "provider readback reference");
  }

  const receipt = assertReceipt(result.receipt, {
    decisionRef,
    readback,
    readbackRef,
    request,
    status: result.status,
  });
  const receiptRef = artifactRef(result.receipt_ref, "receipt reference");
  exact(
    receiptRef.digest,
    receipt.integrity.content_digest,
    "receipt reference digest",
  );

  if (result.execution_id !== request.workflow.execution_id) {
    invalid("Result execution identity does not match its request.");
  }
  if (result.status === "succeeded") {
    exact(result.retryable, false, "successful retry state");
    exact(result.failure, null, "successful failure state");
    exact(result.next_action, "complete", "successful next action");
    required(readback, "successful provider readback");
  } else {
    const failure = record(result.failure, "Repository custody failure");
    string(failure.code, "failure code");
    string(failure.message, "failure message");
    boolean(failure.retryable, "failure retry state");
    exact(result.retryable, failure.retryable, "result retry state");
    exact(
      result.next_action,
      failure.retryable ? "retry-provider" : "request-correction",
      "failed next action",
    );
  }
  return value as RepositoryCustodyWorkflowResult;
}

export function assertRepositoryCustodyRequest(
  value: unknown,
): RepositoryCustodyRequest {
  const request = record(value, "Repository custody request");
  exact(request.schema_version, 1, "request schema version");
  exact(
    request.artifact_type,
    "repository_custody_request",
    "request artifact type",
  );
  exact(request.action, "link-existing", "repository custody action");
  pattern(request.request_id, requestIdPattern, "request identity");
  dateTime(request.requested_at, "request timestamp");
  digest(request.request_digest, "request digest");
  string(request.idempotency_key, "idempotency key");
  artifactRef(request.operator_ref, "operator reference");

  const workflow = record(request.workflow, "Repository custody workflow");
  exact(workflow.workflow_id, "repository-custody", "workflow identity");
  exact(workflow.workflow_version, "1", "workflow version");
  string(workflow.execution_id, "execution identity");

  const target = record(request.target, "Repository custody target");
  exact(target.provider, "github", "repository provider");
  exact(target.provider_host, "github.com", "repository provider host");
  string(target.owner, "repository owner");
  string(target.name, "repository name");
  pattern(
    target.provider_repository_id,
    githubRepositoryIdPattern,
    "provider repository identity",
  );

  const custody = record(
    request.requested_custody,
    "Requested repository custody",
  );
  string(custody.workspace_owner_ref, "workspace owner reference");
  oneOf(
    custody.custody_kind,
    [
      "dedicated-owner-repo",
      "external-repo",
      "incubation-repo",
      "shared-owner-repo",
    ],
    "custody kind",
  );

  const authority = record(request.authority, "Repository custody authority");
  artifactRef(authority.policy_profile_ref, "policy profile reference");
  artifactRef(authority.approval_ref, "approval reference");
  artifactRef(authority.credential_binding_ref, "credential binding reference");

  const correlation = record(
    request.correlation,
    "Repository custody correlation",
  );
  string(correlation.correlation_id, "correlation identity");
  if (correlation.causation_id !== null) {
    string(correlation.causation_id, "causation identity");
  }
  return value as RepositoryCustodyRequest;
}

export function isRepositoryCustodyLiveApiError(
  value: unknown,
): value is RepositoryCustodyLiveApiError {
  return (
    isRecord(value) &&
    typeof value.code === "string" &&
    typeof value.error === "string" &&
    value.mode === "live" &&
    typeof value.retryable === "boolean" &&
    value.status === "offline"
  );
}

function assertDecision(
  value: unknown,
  request: RepositoryCustodyRequest,
): RepositoryCustodyDecision {
  const decision = record(value, "Repository custody decision");
  exact(decision.schema_version, 1, "decision schema version");
  exact(
    decision.artifact_type,
    "repository_custody_decision",
    "decision artifact type",
  );
  string(decision.decision_id, "decision identity");
  dateTime(decision.evaluated_at, "decision timestamp");
  string(decision.policy_version, "policy version");
  oneOf(
    decision.outcome,
    ["allowed", "denied", "requires-action"],
    "decision outcome",
  );
  oneOf(
    decision.next_action,
    ["apply-custody", "read-provider", "request-correction", "stop"],
    "decision next action",
  );
  const requestRef = artifactRef(decision.request_ref, "decision request reference");
  exact(requestRef.digest, request.request_digest, "decision request digest");
  integrity(decision.integrity, "decision integrity");
  array(decision.findings, "decision findings").forEach((candidate) => {
    const finding = record(candidate, "Repository custody finding");
    string(finding.code, "finding code");
    oneOf(
      finding.severity,
      ["blocking", "info", "warning"],
      "finding severity",
    );
    string(finding.summary, "finding summary");
  });
  array(decision.obligations, "decision obligations").forEach((candidate) =>
    string(candidate, "decision obligation"),
  );
  if (decision.outcome === "allowed") {
    exact(decision.next_action, "read-provider", "allowed decision next action");
    const identity = record(decision.resolved_identity, "Resolved repository identity");
    exact(identity.provider, "github", "resolved provider");
    exact(
      identity.provider_repository_id,
      request.target.provider_repository_id,
      "resolved provider repository identity",
    );
  }
  return value as RepositoryCustodyDecision;
}

function assertProviderReadback(
  value: unknown,
  request: RepositoryCustodyRequest,
): RepositoryProviderReadback {
  const readback = record(value, "Repository provider readback");
  exact(readback.schema_version, 1, "readback schema version");
  exact(
    readback.artifact_type,
    "repository_provider_readback",
    "readback artifact type",
  );
  string(readback.readback_id, "readback identity");
  dateTime(readback.observed_at, "readback timestamp");
  string(readback.canonical_owner, "canonical owner");
  string(readback.canonical_name, "canonical name");
  string(readback.canonical_url, "canonical URL");
  string(readback.default_branch, "default branch");
  string(readback.provider_version, "provider version");
  oneOf(readback.visibility, ["internal", "private", "public"], "visibility");
  oneOf(
    readback.provider_lifecycle_state,
    ["active", "archived", "unavailable"],
    "provider lifecycle",
  );
  const requestRef = artifactRef(readback.request_ref, "readback request reference");
  exact(requestRef.digest, request.request_digest, "readback request digest");
  const identity = record(readback.repository_identity, "Readback repository identity");
  exact(identity.provider, "github", "readback provider");
  exact(
    identity.provider_repository_id,
    request.target.provider_repository_id,
    "readback provider repository identity",
  );
  const binding = artifactRef(
    readback.credential_binding_ref,
    "readback credential binding reference",
  );
  exact(
    binding.digest,
    request.authority.credential_binding_ref.digest,
    "readback credential binding digest",
  );
  integrity(readback.integrity, "readback integrity");
  return value as RepositoryProviderReadback;
}

function assertReceipt(
  value: unknown,
  context: {
    decisionRef: RepositoryCustodyArtifactRef;
    readback: RepositoryProviderReadback | null;
    readbackRef: RepositoryCustodyArtifactRef | null;
    request: RepositoryCustodyRequest;
    status: unknown;
  },
): RepositoryCustodyReceipt {
  const receipt = record(value, "Repository custody receipt");
  exact(receipt.schema_version, 1, "receipt schema version");
  exact(
    receipt.artifact_type,
    "repository_custody_receipt",
    "receipt artifact type",
  );
  exact(receipt.action, "link-existing", "receipt action");
  string(receipt.receipt_id, "receipt identity");
  dateTime(receipt.completed_at, "receipt timestamp");
  oneOf(receipt.outcome, ["denied", "failed", "succeeded"], "receipt outcome");
  exact(receipt.outcome, context.status, "receipt outcome binding");
  exact(receipt.workflow_status, context.status, "receipt workflow status");
  const requestRef = artifactRef(receipt.request_ref, "receipt request reference");
  exact(requestRef.digest, context.request.request_digest, "receipt request digest");
  const decisionRef = artifactRef(receipt.decision_ref, "receipt decision reference");
  exact(decisionRef.digest, context.decisionRef.digest, "receipt decision digest");
  const readbackRef = nullableArtifactRef(
    receipt.provider_readback_ref,
    "receipt provider readback reference",
  );
  exact(readbackRef?.digest ?? null, context.readbackRef?.digest ?? null, "receipt readback digest");
  const custody = record(receipt.custody, "Receipt custody");
  exact(custody.before, "unrecorded", "custody before state");
  exact(
    custody.workspace_owner_ref,
    context.request.requested_custody.workspace_owner_ref,
    "custody owner binding",
  );
  if (context.status === "succeeded") {
    exact(custody.after, "linked", "successful custody state");
    required(context.readback, "successful receipt provider readback");
    const identity = record(
      receipt.repository_identity,
      "Receipt repository identity",
    );
    exact(identity.provider, "github", "receipt repository provider");
    exact(
      identity.provider_repository_id,
      context.request.target.provider_repository_id,
      "receipt provider repository identity",
    );
  } else {
    exact(custody.after, "unrecorded", "failed custody state");
    exact(receipt.repository_identity, null, "failed receipt repository identity");
  }
  array(receipt.findings, "receipt findings").forEach((item) =>
    string(item, "receipt finding"),
  );
  const handoffs = record(
    receipt.downstream_handoffs,
    "Receipt downstream handoffs",
  );
  for (const key of [
    "active_inventory",
    "delivery_catalog",
    "product_admission",
    "workspace_intake",
  ]) {
    oneOf(
      handoffs[key],
      ["not-requested", "request-available", "separate-action-required"],
      `${key} handoff`,
    );
  }
  integrity(receipt.integrity, "receipt integrity");
  return value as RepositoryCustodyReceipt;
}

function artifactRef(value: unknown, label: string): RepositoryCustodyArtifactRef {
  const reference = record(value, label);
  string(reference.uri, `${label} URI`);
  digest(reference.digest, `${label} digest`);
  return value as RepositoryCustodyArtifactRef;
}

function nullableArtifactRef(
  value: unknown,
  label: string,
): RepositoryCustodyArtifactRef | null {
  return value === null ? null : artifactRef(value, label);
}

function integrity(value: unknown, label: string) {
  const candidate = record(value, label);
  exact(candidate.canonicalization, "RFC8785", `${label} canonicalization`);
  exact(candidate.algorithm, "sha256", `${label} algorithm`);
  digest(candidate.content_digest, `${label} digest`);
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) invalid(`${label} is invalid.`);
  return value;
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) invalid(`${label} is invalid.`);
  return value;
}

function string(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !value.trim()) invalid(`${label} is invalid.`);
}

function boolean(value: unknown, label: string): asserts value is boolean {
  if (typeof value !== "boolean") invalid(`${label} is invalid.`);
}

function digest(value: unknown, label: string): asserts value is string {
  pattern(value, digestPattern, label);
}

function dateTime(value: unknown, label: string) {
  string(value, label);
  if (Number.isNaN(Date.parse(value))) invalid(`${label} is invalid.`);
}

function pattern(value: unknown, expected: RegExp, label: string) {
  string(value, label);
  if (!expected.test(value)) invalid(`${label} is invalid.`);
}

function oneOf(value: unknown, options: readonly unknown[], label: string) {
  if (!options.includes(value)) invalid(`${label} is invalid.`);
}

function exact(value: unknown, expected: unknown, label: string) {
  if (value !== expected) invalid(`${label} is invalid.`);
}

function required<T>(value: T | null, label: string): asserts value is T {
  if (value === null) invalid(`${label} is required.`);
}

function invalid(message: string): never {
  throw new Error(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
