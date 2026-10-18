import type {
  PlatformOperationAction,
  PlatformOperationCatalog,
  PlatformOperationRecord,
} from "./platform-operation-types.ts";
import { assertSourceCredentialIntent, assertSourceCredentialReceipt } from "./source-authorization-contract.ts";

const actions = new Set<PlatformOperationAction>([
  "agent-source.issue", "agent-source.renew", "agent-source.revoke",
  "dev-integration.request-profile",
  "dev-integration.start",
  "dev-integration.status",
  "dev-integration.access",
  "dev-integration.smoke",
  "dev-integration.stop",
  "dev-integration.reset",
  "dev-integration.promote-check",
  "governed-release.execute-step",
  "governed-release.change-runtime-lifecycle",
]);
const states = new Set([
  "requested", "queued", "running", "blocked", "succeeded", "failed", "cancelled",
]);

export function assertPlatformOperationCatalog(value: unknown): PlatformOperationCatalog {
  const catalog = record(value, "catalog");
  exact(catalog, ["schema_version", "catalog_id", "source_version", "observed_at", "freshness", "subjects"], "catalog");
  if (catalog.schema_version !== 1 || !isText(catalog.catalog_id) || !isText(catalog.source_version) || !timestamp(catalog.observed_at) || !new Set(["current", "stale", "unavailable"]).has(String(catalog.freshness)) || !Array.isArray(catalog.subjects) || catalog.subjects.length > 512) invalid("catalog");
  const identities = new Set<string>();
  for (const [index, raw] of catalog.subjects.entries()) {
    const subject = record(raw, `subjects[${index}]`);
    exact(subject, ["kind", "ref", "source_version", "owner", "capabilities"], `subjects[${index}]`);
    if (!new Set(["dev-integration-profile", "profile-request", "product-release", "product-runtime-lifecycle"]).has(String(subject.kind)) || !isText(subject.ref) || !isText(subject.source_version) || !isText(subject.owner) || !Array.isArray(subject.capabilities) || subject.capabilities.length > 64) invalid(`subjects[${index}]`);
    const identity = `${subject.kind}:${subject.ref}`;
    if (identities.has(identity)) invalid("duplicate subject identity");
    identities.add(identity);
    const capabilityIds = new Set<string>();
    for (const [capabilityIndex, rawCapability] of subject.capabilities.entries()) {
      const capability = record(rawCapability, `capabilities[${capabilityIndex}]`);
      exact(capability, ["capability_id", "action", "available", "unavailable_reason", "required_capability", "approval_required", "destructive"], `capabilities[${capabilityIndex}]`);
      if (!isText(capability.capability_id) || !actions.has(capability.action as PlatformOperationAction) || typeof capability.available !== "boolean" || (capability.unavailable_reason !== null && !isText(capability.unavailable_reason)) || !isText(capability.required_capability) || typeof capability.approval_required !== "boolean" || typeof capability.destructive !== "boolean" || capabilityIds.has(String(capability.capability_id))) invalid(`capabilities[${capabilityIndex}]`);
      capabilityIds.add(String(capability.capability_id));
    }
  }
  return value as PlatformOperationCatalog;
}

export function assertPlatformOperationRecord(value: unknown): PlatformOperationRecord {
  const operation = record(value, "operation");
  exact(operation, ["schema_version", "workflow_id", "operation_id", "command", "state", "provider_operation", "security_decision", "controls", "next_action", "created_at", "updated_at", "reconciled", "replayed"], "operation");
  const command = record(operation.command, "command");
  const subject = record(command.subject, "command.subject");
  const approval = record(command.approval, "command.approval");
  const provider = record(operation.provider_operation, "provider_operation");
  const security = record(operation.security_decision, "security_decision");
  const nextAction = record(operation.next_action, "next_action");
  exact(command, ["schema_version", "command_id", "idempotency_key", "correlation_id", "causation_id", "actor_ref", "subject", "capability_id", "action", "input", "requested_at", "intent_digest", "approval"], "command");
  exact(subject, ["kind", "ref", "expected_source_version"], "command.subject");
  exact(approval, ["decision", "operator_id", "decision_ref", "decided_at", "intent_digest"], "command.approval");
  exact(provider, ["schema_version", "operation_id", "command_id", "correlation_id", "state", "attempt", "subject_ref", "capability_id", "action", "retryable", "cancel_available", "blocker", "failure", "receipt", "safe_log_ref", "updated_at", "events"], "provider_operation");
  exact(security, ["uri", "digest", "revision"], "security_decision");
  exact(nextAction, ["code", "authority", "reason"], "next_action");
  if (operation.schema_version !== 1 || operation.workflow_id !== "platform-operation" || !identifier(operation.operation_id) || !states.has(String(operation.state)) || typeof operation.reconciled !== "boolean" || typeof operation.replayed !== "boolean" || !timestamp(operation.created_at) || !timestamp(operation.updated_at)) invalid("operation");
  if (command.schema_version !== 1 || !identifier(command.command_id) || !identifier(command.idempotency_key) || !identifier(command.correlation_id) || (command.causation_id !== null && !identifier(command.causation_id)) || !identifier(command.actor_ref) || !identifier(command.capability_id) || !actions.has(command.action as PlatformOperationAction) || !isRecord(command.input) || JSON.stringify(command.input).length > 32_768 || !timestamp(command.requested_at) || !digest(command.intent_digest)) invalid("command");
  if (!new Set(["dev-integration-profile", "profile-request", "product-release", "product-runtime-lifecycle"]).has(String(subject.kind)) || !identifier(subject.ref) || !identifier(subject.expected_source_version)) invalid("command.subject");
  if (approval.decision !== "approved" || !identifier(approval.operator_id) || !identifier(approval.decision_ref) || !timestamp(approval.decided_at) || !digest(approval.intent_digest) || approval.operator_id !== command.actor_ref || approval.intent_digest !== command.intent_digest) invalid("command.approval");
  if (provider.schema_version !== 1 || !identifier(provider.operation_id) || !identifier(provider.command_id) || !identifier(provider.correlation_id) || !states.has(String(provider.state)) || !positiveInteger(provider.attempt) || !identifier(provider.subject_ref) || !identifier(provider.capability_id) || !actions.has(provider.action as PlatformOperationAction) || typeof provider.retryable !== "boolean" || typeof provider.cancel_available !== "boolean" || (provider.safe_log_ref !== null && !identifier(provider.safe_log_ref)) || !timestamp(provider.updated_at) || !Array.isArray(provider.events) || provider.events.length > 1024) invalid("provider_operation");
  if (provider.command_id !== command.command_id || provider.correlation_id !== command.correlation_id || provider.subject_ref !== subject.ref || provider.capability_id !== command.capability_id || provider.action !== command.action || provider.state !== operation.state) invalid("provider binding");
  validateBlocker(provider.blocker);
  if (String(command.action).startsWith("agent-source.")) {
    exact(command.input, ["source_intent", "session_id"], "source input");
    const intent = assertSourceCredentialIntent(command.input.source_intent);
    if (intent.operator_id !== command.actor_ref || command.capability_id !== command.action || subject.kind !== "dev-integration-profile" || (command.input.session_id !== null && !identifier(command.input.session_id))) invalid("source input binding");
  }
  validateFailure(provider.failure, String(command.action));
  validateReceipt(provider.receipt, String(provider.state), command);
  validateEvents(provider.events, String(provider.state));
  if (!Array.isArray(operation.controls) || operation.controls.length > 128) invalid("controls");
  operation.controls.forEach(validateControl);
  if (!isText(security.uri) || !/^sha256:[0-9a-f]{64}$/.test(String(security.digest)) || !/^[0-9a-f]{40}$/.test(String(security.revision))) invalid("security_decision");
  if (!identifier(nextAction.code) || !identifier(nextAction.authority) || !isText(nextAction.reason)) invalid("next_action");
  return value as PlatformOperationRecord;
}

export function assertPlatformOperationList(value: unknown) {
  const list = record(value, "operation list");
  exact(list, ["workflow_id", "operations"], "operation list");
  if (list.workflow_id !== "platform-operation-list" || !Array.isArray(list.operations) || list.operations.length > 200) invalid("operation list");
  const operations = list.operations.map(assertPlatformOperationRecord);
  if (new Set(operations.map((operation) => operation.operation_id)).size !== operations.length) invalid("duplicate operation identity");
  return operations;
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid(label);
  return value as Record<string, unknown>;
}
function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function exact(value: Record<string, unknown>, fields: readonly string[], label: string) {
  if (Object.keys(value).some((key) => !fields.includes(key)) || fields.some((key) => !Object.hasOwn(value, key))) invalid(label);
}
function isText(value: unknown): value is string { return typeof value === "string" && value.length > 0 && value.length <= 2048; }
function identifier(value: unknown): value is string { return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:/@+\-]{0,255}$/.test(value); }
function digest(value: unknown): value is string { return typeof value === "string" && /^sha256:[0-9a-f]{64}$/.test(value); }
function positiveInteger(value: unknown) { return Number.isSafeInteger(value) && Number(value) >= 1; }
function timestamp(value: unknown) { return isText(value) && !Number.isNaN(Date.parse(value)); }
function validateBlocker(value: unknown) {
  if (value === null) return;
  const blocker = record(value, "provider_operation.blocker");
  exact(blocker, ["code", "owner", "reason", "supported_dispositions", "next_action"], "provider_operation.blocker");
  const dispositions = blocker.supported_dispositions;
  if (!identifier(blocker.code) || !identifier(blocker.owner) || !isText(blocker.reason) || !identifier(blocker.next_action) || !Array.isArray(dispositions) || dispositions.length === 0 || dispositions.length > 4 || new Set(dispositions).size !== dispositions.length || dispositions.some((entry) => !["remove", "workaround", "accept-risk", "defer"].includes(String(entry)))) invalid("provider_operation.blocker");
}
function validateFailure(value: unknown, action: string) {
  if (value === null) return;
  const failure = record(value, "provider_operation.failure");
  const uncertainty = action.startsWith("agent-source.") && ["platform_source_issuance_uncertain", "platform_source_revocation_expiry_pending"].includes(String(failure.code));
  exact(failure, ["code", "detail", "owner", ...(uncertainty ? ["retry_after"] : [])], "provider_operation.failure");
  if (uncertainty && !timestamp(failure.retry_after)) invalid("provider_operation.failure.retry_after");
  if (!identifier(failure.code) || !isText(failure.detail) || !identifier(failure.owner)) invalid("provider_operation.failure");
}
function validateReceipt(value: unknown, state: string, command: Record<string, unknown>) {
  const terminal = ["succeeded", "failed", "cancelled"].includes(state);
  if (value === null) { if (terminal) invalid("terminal receipt"); return; }
  if (!terminal) invalid("non-terminal receipt");
  const receipt = record(value, "provider_operation.receipt");
  const sourceSuccess = String(command.action).startsWith("agent-source.") && state === "succeeded";
  exact(receipt, ["receipt_ref", "outcome", "recorded_at", "source_version", "effect", ...(sourceSuccess ? ["source_credential"] : [])], "provider_operation.receipt");
  if (sourceSuccess) {
    const source = assertSourceCredentialReceipt(receipt.source_credential), input = record(command.input, "command.input"), intent = assertSourceCredentialIntent(input.source_intent);
    if (source.command_id !== command.command_id || source.action !== command.action || source.source_intent_id !== intent.intent_id || source.session_id !== input.session_id || receipt.effect !== "verified") invalid("source receipt binding");
  }
  if (!identifier(receipt.receipt_ref) || receipt.outcome !== state || !timestamp(receipt.recorded_at) || !identifier(receipt.source_version) || !["none", "partial", "verified"].includes(String(receipt.effect))) invalid("provider_operation.receipt");
}
function validateEvents(value: unknown[], state: string) {
  if (value.length === 0) invalid("provider_operation.events");
  value.forEach((raw, index) => {
    const event = record(raw, `provider_operation.events[${index}]`);
    exact(event, ["event_id", "sequence", "state", "occurred_at", "summary"], `provider_operation.events[${index}]`);
    if (!identifier(event.event_id) || event.sequence !== index + 1 || !states.has(String(event.state)) || !timestamp(event.occurred_at) || !isText(event.summary)) invalid(`provider_operation.events[${index}]`);
  });
  if ((value.at(-1) as Record<string, unknown>).state !== state) invalid("provider_operation.events");
}
function validateControl(raw: unknown, index: number) {
  const control = record(raw, `controls[${index}]`);
  exact(control, ["control_id", "idempotency_key", "request_digest", "action", "requested_at", "status"], `controls[${index}]`);
  if (!identifier(control.control_id) || !identifier(control.idempotency_key) || !digest(control.request_digest) || !["retry", "cancel"].includes(String(control.action)) || !timestamp(control.requested_at) || !["dispatching", "confirmed", "unknown"].includes(String(control.status))) invalid(`controls[${index}]`);
}
function invalid(label: string): never { throw new Error(`Platform operation ${label} is malformed.`); }
