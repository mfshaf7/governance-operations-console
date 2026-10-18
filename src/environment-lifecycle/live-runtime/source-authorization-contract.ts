export type SourceCredentialSubject =
  | { kind: "delivery"; work_item_ref: string; snapshot_digest: string }
  | { kind: "prototype"; prototype_id: string; registry_ref: string; registry_revision: string; source_ref: string; source_revision: string };
export type SourceAuthorizationSelector = { kind: "prototype"; prototype_id: string; source_request_id: string } | { kind: "delivery"; work_item_ref: string };
export type SourceCredentialIntent = {
  schema_version: 1; purpose: "ordinary-source"; intent_id: string; caller_id: string; operator_id: string;
  subject: SourceCredentialSubject; source_start_digest: string; repository: string; repository_id: number; installation_id: number;
  landing_unit_id: string; branch: string; fetched_base: string; human_reviewer_id: string; expires_at: string; supersedes_intent_digest: string | null;
};
export type SourceAuthorizationPreparation = {
  schema_version: 1; workflow_id: "source-credential-preparation"; intent_id: string;
  source_intent: SourceCredentialIntent; source_intent_digest: string; session_id: string | null; created_at: string;
  operation_refs: { issue: string | null; revoke: string | null };
  start_decision: Record<string, unknown> | null;
  authorization: { state: "prepared" | "approved" | "expired" | "revocation-requested" | "revoked"; approval_ref: string | null; credential_receipt: SourceCredentialReceipt | null };
  authority: "operator-orchestration-service"; secret_values_embedded: false;
};
export type SourceCredentialReceipt = Record<string, unknown> & { receipt_digest: string; source_intent_digest: string; source_intent_id: string; session_id: string | null; action: string; token_expires_at: string | null };
const intentFields = ["schema_version", "purpose", "intent_id", "caller_id", "operator_id", "subject", "source_start_digest", "repository", "repository_id", "installation_id", "landing_unit_id", "branch", "fetched_base", "human_reviewer_id", "expires_at", "supersedes_intent_digest"];
const receiptFields = ["schema_version", "artifact_type", "command_id", "action", "outcome", "source_intent_digest", "source_intent_id", "supersedes_intent_digest", "subject", "session_id", "landing_unit_id", "repository", "repository_id", "installation_id", "branch", "fetched_base", "human_reviewer_id", "caller_id", "operator_id", "source_start_digest", "identity_id", "logical_agent_id", "provider_principal", "app_id", "definition_digest", "permissions", "token_expires_at", "authorization_expires_at", "recorded_at", "secret_values_embedded", "receipt_digest"];
const id = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:/@+\-]{0,255}$/.test(value);
const digest = (value: unknown) => typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value);
const commit = (value: unknown) => typeof value === "string" && /^[a-f0-9]{40}$/.test(value);
const timestamp = (value: unknown) => typeof value === "string" && /^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value));
const positive = (value: unknown) => Number.isSafeInteger(value) && Number(value) > 0;
function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== "object" || Array.isArray(value)) invalid(); return value as Record<string, unknown>; }
function closed(value: unknown, fields: string[]) { const item = object(value); if (Object.keys(item).sort().join(",") !== [...fields].sort().join(",")) invalid(); return item; }
export function assertSourceCredentialIntent(value: unknown): SourceCredentialIntent {
  const item = closed(value, intentFields), subject = object(item.subject);
  if (item.schema_version !== 1 || item.purpose !== "ordinary-source" || !["intent_id", "caller_id", "operator_id", "human_reviewer_id"].every(field => id(item[field])) || !digest(item.source_start_digest) || !timestamp(item.expires_at) || (item.supersedes_intent_digest !== null && !digest(item.supersedes_intent_digest))) invalid();
  if (typeof item.repository !== "string" || !/^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(item.repository) || !positive(item.repository_id) || !positive(item.installation_id) || !commit(item.fetched_base) || typeof item.landing_unit_id !== "string" || !/^[a-z0-9][a-z0-9-]{2,127}$/.test(item.landing_unit_id)) invalid();
  if (typeof item.branch !== "string" || !/^[a-z0-9][a-z0-9._/-]*$/.test(item.branch) || item.branch === "main" || item.branch.includes("..") || item.branch.includes("//") || item.branch.endsWith("/")) invalid();
  if (subject.kind === "delivery") {
    closed(subject, ["kind", "work_item_ref", "snapshot_digest"]);
    if (typeof subject.work_item_ref !== "string" || !/^work-item-[1-9][0-9]*$/.test(subject.work_item_ref) || !digest(subject.snapshot_digest)) invalid();
  } else if (subject.kind === "prototype") {
    closed(subject, ["kind", "prototype_id", "registry_ref", "registry_revision", "source_ref", "source_revision"]);
    if (typeof subject.prototype_id !== "string" || !/^prototype:[a-z0-9]+(?:-[a-z0-9]+)*$/.test(subject.prototype_id) || subject.registry_ref !== `record://prototypes/${subject.prototype_id.slice(10)}` || !commit(subject.registry_revision) || !commit(subject.source_revision) || typeof subject.source_ref !== "string" || !/^repo:\/\/[a-z0-9][a-z0-9._/-]*$/.test(subject.source_ref) || subject.source_ref.slice(7).split("/").some(part => ["", ".", ".."].includes(part))) invalid();
  } else invalid();
  return value as SourceCredentialIntent;
}
export function sourceIntentFromReceipt(item: SourceCredentialReceipt): SourceCredentialIntent {
  return assertSourceCredentialIntent({ schema_version: 1, purpose: "ordinary-source", intent_id: item.source_intent_id, caller_id: item.caller_id, operator_id: item.operator_id, subject: item.subject,
    source_start_digest: item.source_start_digest, repository: item.repository, repository_id: item.repository_id, installation_id: item.installation_id, landing_unit_id: item.landing_unit_id, branch: item.branch, fetched_base: item.fetched_base, human_reviewer_id: item.human_reviewer_id, expires_at: item.authorization_expires_at, supersedes_intent_digest: item.supersedes_intent_digest });
}
export function assertSourceCredentialReceipt(value: unknown): SourceCredentialReceipt {
  const item = closed(value, receiptFields), permissions = closed(item.permissions, ["metadata", "contents", "pull_requests", "checks"]);
  if (item.schema_version !== 1 || item.artifact_type !== "source-intent-credential-receipt" || item.secret_values_embedded !== false || !["command_id", "source_intent_id", "identity_id", "logical_agent_id"].every(field => id(item[field])) || !["source_intent_digest", "definition_digest", "receipt_digest"].every(field => digest(item[field])) || !timestamp(item.recorded_at) || !positive(item.app_id) || (item.session_id !== null && !id(item.session_id))) invalid();
  if (typeof item.provider_principal !== "string" || !/^[A-Za-z0-9][A-Za-z0-9-]*\[bot\]$/.test(item.provider_principal) || permissions.metadata !== "read" || permissions.contents !== "write" || permissions.pull_requests !== "write" || permissions.checks !== "read") invalid();
  const outcomes: Record<string, string[]> = { "agent-source.issue": ["issued", "current"], "agent-source.renew": ["renewed", "current"], "agent-source.revoke": ["revoked"] };
  if (!outcomes[String(item.action)]?.includes(String(item.outcome)) || (item.action === "agent-source.revoke" ? item.token_expires_at !== null : !timestamp(item.token_expires_at))) invalid();
  const result = value as SourceCredentialReceipt; sourceIntentFromReceipt(result); return result;
}
export function assertSourceAuthorizationPreparation(value: unknown): SourceAuthorizationPreparation {
  const item = closed(value, ["schema_version", "workflow_id", "intent_id", "source_intent", "source_intent_digest", "session_id", "created_at", "operation_refs", "start_decision", "authorization", "authority", "secret_values_embedded"]);
  const refs = closed(item.operation_refs, ["issue", "revoke"]);
  for (const value of Object.values(refs)) if (value !== null && (typeof value !== "string" || !/^platform-operation:[0-9a-f]{24}$/.test(value))) invalid();
  const intent = assertSourceCredentialIntent(item.source_intent), auth = closed(item.authorization, ["state", "approval_ref", "credential_receipt"]);
  if (intent.subject.kind === "prototype") { if (item.start_decision !== null) invalid(); }
  else {
    const decision = closed(item.start_decision, ["schema_version", "artifact_type", "work_item_id", "covered_work_item_ids", "caller_id", "operator", "landing_unit", "architecture", "human_gate_work_item_ids"]);
    if (decision.schema_version !== 1 || decision.artifact_type !== "delivery_art_work_session_decision" || decision.work_item_id !== intent.subject.work_item_ref) invalid();
    closed(decision.operator, ["id", "decision_source"]);
    const landing = object(decision.landing_unit);
    closed(landing, ["id", "decision", "split_reason", "base_ref", "branch", "rollback_boundary", ...(Object.hasOwn(landing, "supersedes_recoveries") ? ["supersedes_recoveries"] : [])]);
    if (landing.supersedes_recoveries !== undefined) {
      if (!Array.isArray(landing.supersedes_recoveries)) invalid();
      for (const value of landing.supersedes_recoveries) closed(value, ["landing_unit_id", "recovery_receipt_id", "session_id"]);
    }
    const architecture = closed(decision.architecture, ["required", "artifact_location"]);
    if (architecture.artifact_location !== null) closed(architecture.artifact_location, ["repo", "relative_path"]);
    closed(decision.human_gate_work_item_ids, ["security_acceptance"]);
    if (JSON.stringify(decision).length > 32768) invalid();
  }
  if (item.schema_version !== 1 || item.workflow_id !== "source-credential-preparation" || item.authority !== "operator-orchestration-service" || item.secret_values_embedded !== false || item.intent_id !== intent.intent_id || !digest(item.source_intent_digest) || !timestamp(item.created_at) || (item.session_id !== null && !id(item.session_id)) || !["prepared", "approved", "expired", "revocation-requested", "revoked"].includes(String(auth.state)) || (auth.approval_ref !== null && !id(auth.approval_ref))) invalid();
  if (auth.credential_receipt !== null) {
    const receipt = assertSourceCredentialReceipt(auth.credential_receipt);
    if (receipt.source_intent_id !== intent.intent_id || receipt.source_intent_digest !== item.source_intent_digest || (receipt.session_id !== null && receipt.session_id !== item.session_id)) invalid();
  }
  return value as SourceAuthorizationPreparation;
}
function invalid(): never { throw new Error("Source authorization contains malformed, mismatched or unauthorized fields."); }
