import type {
  RepositoryLifecycleAction,
  RepositoryLifecycleArtifactRef,
  RepositoryLifecycleAudit,
  RepositoryLifecycleLiveApiError,
  RepositoryLifecycleLiveSnapshot,
  RepositoryLifecycleReceipt,
  RepositoryLifecycleRequest,
  RepositoryLifecycleState,
  RepositoryLifecycleWorkflowResult,
} from "./repository-lifecycle-live-types.ts";

const actions = [
  "archive-provider",
  "restore-workspace-record",
  "retire-workspace-record",
  "transfer-workspace-custody",
  "unarchive-provider",
] as const;
const digestPattern = /^sha256:[a-f0-9]{64}$/;
const requestIdPattern = /^repository-lifecycle-request:[A-Za-z0-9._:-]+$/;

export function assertRepositoryLifecycleLiveSnapshot(
  value: unknown,
): RepositoryLifecycleLiveSnapshot {
  const snapshot = record(value, "Repository lifecycle snapshot");
  oneOf(snapshot.mode, ["disconnected-preview", "live"], "snapshot mode");
  oneOf(
    snapshot.status,
    ["current", "not-initialized", "offline"],
    "snapshot status",
  );
  dateTime(snapshot.observedAt, "snapshot timestamp");
  nullableString(snapshot.error, "snapshot error");
  const audit =
    snapshot.audit === null ? null : assertRepositoryLifecycleAudit(snapshot.audit);
  if (snapshot.status === "current") required(audit, "current lifecycle audit");
  if (snapshot.status !== "current") exact(audit, null, "unavailable lifecycle audit");
  if (snapshot.mode === "disconnected-preview") {
    exact(snapshot.status, "not-initialized", "preview lifecycle status");
    exact(snapshot.error, null, "preview lifecycle error");
  }
  return value as RepositoryLifecycleLiveSnapshot;
}

export function assertRepositoryLifecycleWorkflowResult(
  value: unknown,
): RepositoryLifecycleWorkflowResult {
  const result = record(value, "Repository lifecycle result");
  exact(result.schema_version, 1, "result schema version");
  exact(result.workflow_id, "repository-lifecycle", "workflow identity");
  exact(result.workflow_version, "1", "workflow version");
  string(result.execution_id, "execution identity");
  oneOf(
    result.status,
    ["applying", "cancelled", "denied", "failed", "succeeded"],
    "workflow status",
  );
  boolean(result.replayed, "replay state");
  boolean(result.retryable, "retry state");
  oneOf(
    result.next_action,
    ["await-provider", "await-workspace", "complete", "request-correction", "retry"],
    "next action",
  );

  const request = assertRepositoryLifecycleRequest(result.request);
  exact(
    result.execution_id,
    request.workflow.execution_id,
    "result execution binding",
  );
  const decision = record(result.decision, "Repository lifecycle decision");
  exact(decision.schema_version, 1, "decision schema version");
  exact(
    decision.artifact_type,
    "repository_lifecycle_decision",
    "decision artifact type",
  );
  exact(decision.action, request.action, "decision action");
  string(decision.decision_id, "decision identity");
  dateTime(decision.evaluated_at, "decision timestamp");
  oneOf(decision.outcome, ["allowed", "denied", "requires-action"], "decision outcome");
  oneOf(
    decision.next_action,
    [
      "apply-workspace-custody",
      "archive-provider",
      "request-correction",
      "restore-workspace-record",
      "retire-workspace-record",
      "stop",
      "unarchive-provider",
    ],
    "decision next action",
  );
  string(decision.policy_version, "decision policy version");
  const decisionRequestRef = artifactRef(decision.request_ref, "decision request reference");
  exact(decisionRequestRef.digest, request.request_digest, "decision request digest");
  const decisionIntegrity = integrity(decision.integrity, "decision integrity");
  const decisionRef = artifactRef(result.decision_ref, "decision reference");
  exact(decisionRef.digest, decisionIntegrity.content_digest, "decision digest");
  lifecycleState(decision.current_state, "decision current state");
  sameState(decision.current_state, request.current_state, "decision request state");
  if (decision.approved_target !== null) {
    sameState(decision.approved_target, request.target, "decision approved target");
  }
  if (decision.outcome === "allowed") {
    required(decision.approved_target, "allowed decision target");
  }
  const decisionImpact = record(decision.impact, "decision impact");
  exact(decisionImpact.downstream_mutation, "none", "decision downstream mutation");
  exact(
    artifactRef(decisionImpact.impact_assessment_ref, "decision impact reference").digest,
    request.impact.impact_assessment_ref.digest,
    "decision impact digest",
  );
  exact(decisionImpact.finding_count, request.impact.finding_count, "decision finding count");
  exact(
    decisionImpact.blocking_finding_count,
    request.impact.blocking_finding_count,
    "decision blocking finding count",
  );
  blockerDisposition(decisionImpact.blocker_disposition);
  sameDisposition(
    decisionImpact.blocker_disposition,
    request.impact.blocker_disposition,
    "decision blocker disposition",
  );
  array(decision.findings, "decision findings").forEach((candidate) => {
    const finding = record(candidate, "Repository lifecycle finding");
    string(finding.code, "finding code");
    oneOf(finding.severity, ["blocking", "info", "warning"], "finding severity");
    string(finding.summary, "finding summary");
  });
  array(decision.required_human_gates, "required human gates").forEach((gate) =>
    string(gate, "required human gate"),
  );
  array(decision.obligations, "decision obligations").forEach((obligation) =>
    string(obligation, "decision obligation"),
  );

  const operation = record(result.operation, "Repository lifecycle operation");
  nonNegativeInteger(operation.attempt_count, "operation attempt count");
  oneOf(
    operation.command,
    [
      "apply-workspace-custody",
      "archive-provider",
      "restore-workspace-record",
      "retire-workspace-record",
      "unarchive-provider",
    ],
    "operation command",
  );
  exact(
    operation.command,
    repositoryLifecycleCommandForAction(request.action),
    "operation action binding",
  );
  oneOf(
    operation.state,
    [
      "command-issued",
      "not-started",
      "provider-acknowledged",
      "recovery-required",
      "verified",
      "workspace-acknowledged",
    ],
    "operation state",
  );
  if (operation.completion_path !== null) {
    oneOf(operation.completion_path, ["provider", "recovered", "workspace"], "completion path");
  }

  const currentState = lifecycleState(result.current_state, "result current state");
  const receipt =
    result.receipt === null
      ? null
      : assertRepositoryLifecycleReceipt(result.receipt, request, decisionRef);
  const receiptRef = nullableArtifactRef(result.receipt_ref, "receipt reference");
  const audit =
    result.audit === null ? null : assertRepositoryLifecycleAudit(result.audit);
  const providerReadback =
    result.provider_readback === null
      ? null
      : repositoryLifecycleProviderReadback(result.provider_readback, request);
  const providerReadbackRef = nullableArtifactRef(
    result.provider_readback_ref,
    "provider readback reference",
  );
  if (providerReadback) {
    required(providerReadbackRef, "provider readback reference");
    exact(
      providerReadbackRef?.digest,
      providerReadback.integrity.content_digest,
      "provider readback digest",
    );
  } else {
    exact(providerReadbackRef, null, "absent provider readback reference");
  }
  const failure =
    result.failure === null ? null : record(result.failure, "workflow failure");
  if (failure) {
    string(failure.code, "failure code");
    string(failure.message, "failure message");
    boolean(failure.retryable, "failure retry state");
    exact(result.retryable, failure.retryable, "result retry state");
  }

  if (result.status === "applying") {
    exact(receipt, null, "applying receipt");
    exact(receiptRef, null, "applying receipt reference");
    exact(audit, null, "applying audit");
    exact(failure, null, "applying failure");
  } else {
    required(receipt, "terminal receipt");
    required(receiptRef, "terminal receipt reference");
    required(audit, "terminal audit");
    exact(
      receiptRef?.digest,
      receipt?.integrity.content_digest,
      "terminal receipt digest",
    );
    sameState(audit?.current_state, currentState, "terminal audit state");
    exact(
      audit?.repository_identity.provider_repository_id,
      request.repository_identity.provider_repository_id,
      "terminal audit repository identity",
    );
    exact(
      audit?.latest_terminal_receipt_ref?.digest,
      receiptRef?.digest,
      "terminal audit receipt",
    );
  }
  if (result.status === "succeeded") {
    exact(result.retryable, false, "successful retry state");
    exact(failure, null, "successful failure");
    exact(result.next_action, "complete", "successful next action");
    sameState(receipt?.after, currentState, "successful receipt state");
  } else if (result.status !== "applying") {
    required(failure, "terminal failure");
    exact(
      result.next_action,
      failure?.retryable ? "retry" : "request-correction",
      "failure next action",
    );
  }
  return value as RepositoryLifecycleWorkflowResult;
}

export function assertRepositoryLifecycleAudit(
  value: unknown,
): RepositoryLifecycleAudit {
  const audit = record(value, "Repository lifecycle audit");
  exact(audit.schema_version, 1, "audit schema version");
  exact(
    audit.artifact_type,
    "repository_lifecycle_audit",
    "audit artifact type",
  );
  string(audit.audit_id, "audit identity");
  dateTime(audit.projected_at, "audit timestamp");
  exact(audit.source_authority, "operator-orchestration-service", "audit authority");
  exact(audit.mutation, false, "audit mutation state");
  const identity = repositoryIdentity(audit.repository_identity);
  const currentState = lifecycleState(audit.current_state, "audit current state");
  const impact = record(audit.impact_summary, "audit impact summary");
  nullableArtifactRef(impact.latest_assessment_ref, "latest impact assessment");
  nonNegativeInteger(impact.finding_count, "impact finding count");
  nonNegativeInteger(impact.blocking_finding_count, "blocking impact count");
  if (impact.blocker_disposition !== null) {
    oneOf(
      impact.blocker_disposition,
      ["accept-risk", "defer", "remove", "workaround"],
      "blocker disposition",
    );
  }
  nullableArtifactRef(audit.latest_terminal_receipt_ref, "latest receipt reference");
  array(audit.history, "audit history").forEach((candidate) => {
    const item = record(candidate, "Repository lifecycle history item");
    action(item.action, "history action");
    oneOf(item.outcome, ["cancelled", "denied", "failed", "succeeded"], "history outcome");
    dateTime(item.completed_at, "history timestamp");
    artifactRef(item.receipt_ref, "history receipt reference");
    nullableArtifactRef(item.reversal_of_receipt_ref, "history reversal reference");
  });
  integrity(audit.integrity, "audit integrity");
  if (identity.provider !== "github" || !currentState.workspace_owner_ref) {
    invalid("Repository lifecycle audit does not carry a supported repository state.");
  }
  return value as RepositoryLifecycleAudit;
}

export function assertRepositoryLifecycleRequest(
  value: unknown,
): RepositoryLifecycleRequest {
  const request = record(value, "Repository lifecycle request");
  exact(request.schema_version, 1, "request schema version");
  exact(
    request.artifact_type,
    "repository_lifecycle_request",
    "request artifact type",
  );
  pattern(request.request_id, requestIdPattern, "request identity");
  dateTime(request.requested_at, "request timestamp");
  const requestAction = action(request.action, "request action");
  artifactRef(request.operator_ref, "operator reference");
  const workflow = record(request.workflow, "lifecycle workflow");
  exact(workflow.workflow_id, "repository-lifecycle", "workflow identity");
  exact(workflow.workflow_version, "1", "workflow version");
  string(workflow.execution_id, "execution identity");
  repositoryIdentity(request.repository_identity);
  lifecycleState(request.current_state, "request current state");
  const target = record(request.target, "lifecycle target");
  nullableString(target.workspace_owner_ref, "target workspace owner");
  if (target.provider_lifecycle_state !== null) {
    oneOf(target.provider_lifecycle_state, ["active", "archived"], "target provider state");
  }
  if (target.workspace_record_state !== null) {
    oneOf(target.workspace_record_state, ["active", "retired"], "target workspace state");
  }
  const impact = record(request.impact, "lifecycle impact");
  artifactRef(impact.impact_assessment_ref, "impact assessment reference");
  nonNegativeInteger(impact.finding_count, "impact finding count");
  nonNegativeInteger(impact.blocking_finding_count, "blocking finding count");
  blockerDisposition(impact.blocker_disposition);
  const authority = record(request.authority, "lifecycle authority");
  artifactRef(authority.policy_profile_ref, "policy profile reference");
  artifactRef(authority.approval_ref, "approval reference");
  nullableArtifactRef(authority.source_owner_acceptance_ref, "source owner acceptance");
  nullableArtifactRef(authority.target_owner_acceptance_ref, "target owner acceptance");
  nullableArtifactRef(authority.provider_credential_binding_ref, "provider credential binding");
  nullableArtifactRef(request.reversal_of_receipt_ref, "reversal reference");
  const correlation = record(request.correlation, "request correlation");
  string(correlation.correlation_id, "correlation identity");
  nullableString(correlation.causation_id, "causation identity");
  string(request.idempotency_key, "idempotency key");
  digest(request.request_digest, "request digest");
  assertActionShape(requestAction, request as unknown as Record<string, unknown>);
  return value as RepositoryLifecycleRequest;
}

export function isRepositoryLifecycleLiveApiError(
  value: unknown,
): value is RepositoryLifecycleLiveApiError {
  return (
    isRecord(value) &&
    typeof value.code === "string" &&
    typeof value.error === "string" &&
    value.mode === "live" &&
    typeof value.retryable === "boolean" &&
    value.status === "offline"
  );
}

function assertRepositoryLifecycleReceipt(
  value: unknown,
  request: RepositoryLifecycleRequest,
  decisionRef: RepositoryLifecycleArtifactRef,
): RepositoryLifecycleReceipt {
  const receipt = record(value, "Repository lifecycle receipt");
  exact(receipt.schema_version, 1, "receipt schema version");
  exact(
    receipt.artifact_type,
    "repository_lifecycle_receipt",
    "receipt artifact type",
  );
  string(receipt.receipt_id, "receipt identity");
  exact(receipt.action, request.action, "receipt action");
  oneOf(receipt.outcome, ["cancelled", "denied", "failed", "succeeded"], "receipt outcome");
  dateTime(receipt.completed_at, "receipt timestamp");
  const receiptRequestRef = artifactRef(receipt.request_ref, "receipt request reference");
  exact(receiptRequestRef.digest, request.request_digest, "receipt request digest");
  exact(
    artifactRef(receipt.decision_ref, "receipt decision reference").digest,
    decisionRef.digest,
    "receipt decision digest",
  );
  nullableArtifactRef(receipt.provider_readback_ref, "receipt provider readback");
  sameState(receipt.before, request.current_state, "receipt before state");
  lifecycleState(receipt.after, "receipt after state");
  exact(
    artifactRef(receipt.impact_assessment_ref, "receipt impact assessment").digest,
    request.impact.impact_assessment_ref.digest,
    "receipt impact assessment digest",
  );
  blockerDisposition(receipt.blocker_disposition);
  sameDisposition(
    receipt.blocker_disposition,
    request.impact.blocker_disposition,
    "receipt blocker disposition",
  );
  const confirmations = record(receipt.confirmations, "receipt confirmations");
  sameArtifactReference(
    artifactRef(confirmations.operator_approval_ref, "operator approval"),
    request.authority.approval_ref,
    "receipt operator approval",
  );
  sameArtifactReference(
    nullableArtifactRef(confirmations.source_owner_acceptance_ref, "source owner acceptance"),
    request.authority.source_owner_acceptance_ref,
    "receipt source owner acceptance",
  );
  sameArtifactReference(
    nullableArtifactRef(confirmations.target_owner_acceptance_ref, "target owner acceptance"),
    request.authority.target_owner_acceptance_ref,
    "receipt target owner acceptance",
  );
  sameArtifactReference(
    nullableArtifactRef(confirmations.provider_credential_binding_ref, "provider credential binding"),
    request.authority.provider_credential_binding_ref,
    "receipt provider credential binding",
  );
  nullableArtifactRef(receipt.reversal_of_receipt_ref, "receipt reversal reference");
  sameArtifactReference(
    receipt.reversal_of_receipt_ref,
    request.reversal_of_receipt_ref,
    "receipt reversal reference",
  );
  artifactRef(receipt.history_event_ref, "history event reference");
  exact(receipt.downstream_mutation, "none", "downstream mutation");
  exact(receipt.workflow_status, receipt.outcome, "receipt workflow status");
  exact(
    repositoryIdentity(receipt.repository_identity).provider_repository_id,
    request.repository_identity.provider_repository_id,
    "receipt repository identity",
  );
  array(receipt.findings, "receipt findings").forEach((finding) => string(finding, "receipt finding"));
  integrity(receipt.integrity, "receipt integrity");
  return value as RepositoryLifecycleReceipt;
}

function repositoryLifecycleCommandForAction(action: RepositoryLifecycleAction) {
  switch (action) {
    case "transfer-workspace-custody":
      return "apply-workspace-custody";
    case "archive-provider":
      return "archive-provider";
    case "unarchive-provider":
      return "unarchive-provider";
    case "retire-workspace-record":
      return "retire-workspace-record";
    case "restore-workspace-record":
      return "restore-workspace-record";
  }
}

function repositoryLifecycleProviderReadback(
  value: unknown,
  request: RepositoryLifecycleRequest,
) {
  const readback = record(value, "Repository lifecycle provider readback");
  string(readback.readback_id, "provider readback identity");
  dateTime(readback.observed_at, "provider readback timestamp");
  oneOf(readback.provider_lifecycle_state, ["active", "archived"], "provider readback state");
  string(readback.provider_version, "provider readback version");
  const identity = repositoryIdentity(readback.repository_identity);
  exact(
    identity.provider_repository_id,
    request.repository_identity.provider_repository_id,
    "provider readback repository identity",
  );
  const coordinates = record(readback.coordinates, "provider coordinates");
  string(coordinates.name, "provider repository name");
  string(coordinates.owner, "provider repository owner");
  const readbackIntegrity = integrity(readback.integrity, "provider readback integrity");
  return {
    integrity: readbackIntegrity,
  };
}

function sameDisposition(left: unknown, right: unknown, label: string) {
  if (JSON.stringify(left) !== JSON.stringify(right)) invalid(`${label} is inconsistent.`);
}

function sameArtifactReference(left: unknown, right: unknown, label: string) {
  if (JSON.stringify(left) !== JSON.stringify(right)) invalid(`${label} is inconsistent.`);
}

function assertActionShape(
  requestAction: RepositoryLifecycleAction,
  request: Record<string, unknown>,
) {
  const current = request.current_state as RepositoryLifecycleState;
  const target = request.target as RepositoryLifecycleRequest["target"];
  const authority = request.authority as RepositoryLifecycleRequest["authority"];
  const reversal = request.reversal_of_receipt_ref;
  if (requestAction === "transfer-workspace-custody") {
    required(target.workspace_owner_ref, "target workspace owner");
    exact(target.provider_lifecycle_state, null, "transfer provider target");
    exact(target.workspace_record_state, null, "transfer record target");
    required(authority.source_owner_acceptance_ref, "source owner acceptance");
    required(authority.target_owner_acceptance_ref, "target owner acceptance");
    exact(authority.provider_credential_binding_ref, null, "transfer credential binding");
    exact(reversal, null, "transfer reversal");
    exact(current.workspace_record_state, "active", "transfer record state");
    return;
  }
  exact(target.workspace_owner_ref, null, "workspace owner target");
  exact(authority.source_owner_acceptance_ref, null, "source owner acceptance");
  exact(authority.target_owner_acceptance_ref, null, "target owner acceptance");
  if (requestAction === "archive-provider" || requestAction === "unarchive-provider") {
    required(authority.provider_credential_binding_ref, "provider credential binding");
    exact(target.workspace_record_state, null, "provider action record target");
    exact(
      target.provider_lifecycle_state,
      requestAction === "archive-provider" ? "archived" : "active",
      "provider action target",
    );
    if (requestAction === "archive-provider") exact(reversal, null, "archive reversal");
    else required(reversal, "unarchive reversal");
    return;
  }
  exact(authority.provider_credential_binding_ref, null, "workspace action credential binding");
  exact(target.provider_lifecycle_state, null, "workspace action provider target");
  exact(
    target.workspace_record_state,
    requestAction === "retire-workspace-record" ? "retired" : "active",
    "workspace action target",
  );
  if (requestAction === "retire-workspace-record") exact(reversal, null, "retirement reversal");
  else required(reversal, "restore reversal");
}

function action(value: unknown, label: string) {
  return oneOf(value, actions, label);
}

function repositoryIdentity(value: unknown) {
  const identity = record(value, "repository identity");
  exact(identity.provider, "github", "repository provider");
  pattern(identity.provider_repository_id, /^[1-9][0-9]*$/, "provider repository identity");
  return identity as { provider: "github"; provider_repository_id: string };
}

function lifecycleState(value: unknown, label: string) {
  const state = record(value, label);
  oneOf(state.custody_state, ["linked", "provisioned"], `${label} custody state`);
  string(state.workspace_owner_ref, `${label} workspace owner`);
  oneOf(state.provider_lifecycle_state, ["active", "archived", "unavailable"], `${label} provider state`);
  oneOf(state.workspace_record_state, ["active", "retired"], `${label} workspace state`);
  string(state.custody_version, `${label} custody version`);
  nullableString(state.provider_version, `${label} provider version`);
  return state as RepositoryLifecycleState;
}

function blockerDisposition(value: unknown) {
  if (value === null) return null;
  const disposition = record(value, "blocker disposition");
  oneOf(disposition.decision, ["accept-risk", "defer", "remove", "workaround"], "blocker decision");
  string(disposition.justification, "blocker justification");
  artifactRef(disposition.evidence_ref, "blocker evidence reference");
  return disposition;
}

function artifactRef(value: unknown, label: string): RepositoryLifecycleArtifactRef {
  const candidate = record(value, label);
  string(candidate.uri, `${label} URI`);
  try {
    new URL(candidate.uri as string);
  } catch {
    invalid(`${label} URI is invalid.`);
  }
  digest(candidate.digest, `${label} digest`);
  return candidate as RepositoryLifecycleArtifactRef;
}

function nullableArtifactRef(value: unknown, label: string) {
  return value === null ? null : artifactRef(value, label);
}

function integrity(value: unknown, label: string) {
  const candidate = record(value, label);
  exact(candidate.canonicalization, "RFC8785", `${label} canonicalization`);
  exact(candidate.algorithm, "sha256", `${label} algorithm`);
  digest(candidate.content_digest, `${label} content digest`);
  return candidate as { content_digest: string };
}

function sameState(left: unknown, right: unknown, label: string) {
  if (JSON.stringify(left) !== JSON.stringify(right)) invalid(`${label} is inconsistent.`);
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

function nullableString(value: unknown, label: string) {
  if (value !== null) string(value, label);
}

function boolean(value: unknown, label: string): asserts value is boolean {
  if (typeof value !== "boolean") invalid(`${label} is invalid.`);
}

function dateTime(value: unknown, label: string) {
  string(value, label);
  if (Number.isNaN(Date.parse(value))) invalid(`${label} is invalid.`);
}

function digest(value: unknown, label: string) {
  if (typeof value !== "string" || !digestPattern.test(value)) invalid(`${label} is invalid.`);
}

function pattern(value: unknown, expected: RegExp, label: string) {
  if (typeof value !== "string" || !expected.test(value)) invalid(`${label} is invalid.`);
}

function nonNegativeInteger(value: unknown, label: string) {
  if (!Number.isInteger(value) || Number(value) < 0) invalid(`${label} is invalid.`);
}

function exact(value: unknown, expected: unknown, label: string) {
  if (value !== expected) invalid(`${label} is invalid.`);
}

function required<T>(value: T | null | undefined, label: string): asserts value is T {
  if (value === null || value === undefined) invalid(`${label} is required.`);
}

function oneOf<const T extends readonly unknown[]>(
  value: unknown,
  expected: T,
  label: string,
): T[number] {
  if (!expected.includes(value)) invalid(`${label} is invalid.`);
  return value as T[number];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalid(message: string): never {
  throw new Error(message);
}
