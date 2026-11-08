import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { environmentCatalog, environmentOperation } from "./environment-operations-ui-fixture.mjs";
const require = createRequire(import.meta.url);
const { assertPlatformOperationRecord } = require("../../src/environment-lifecycle/live-runtime/platform-operation-contract.ts");
const canonical = value => value && typeof value === "object" ? Array.isArray(value) ? `[${value.map(canonical)}]` : `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}` : JSON.stringify(value);
const hash = value => "sha256:" + createHash("sha256").update(canonical(value)).digest("hex");
export function sourceIntent(overrides = {}) {
  return { schema_version: 1, purpose: "ordinary-source", intent_id: "source-intent:sample", caller_id: "operator-orchestration-service", operator_id: "operator:synthetic",
    subject: { kind: "prototype", prototype_id: "prototype:sample", registry_ref: "record://prototypes/sample", registry_revision: "a".repeat(40), source_ref: "repo://sample/project/prototypes/sample", source_revision: "a".repeat(40) },
    source_start_digest: "sha256:" + "a".repeat(64), repository: "sample/project", repository_id: 101, installation_id: 102,
    landing_unit_id: "sample-authoring", branch: "feature/sample-authoring", fetched_base: "a".repeat(40), human_reviewer_id: "synthetic-reviewer", expires_at: "2030-01-01T00:00:00Z", supersedes_intent_digest: null, ...overrides };
}
export function sourceOperation(id, action, state, intent = sourceIntent()) {
  const op = structuredClone(environmentOperation(id, { state }));
  op.command.action = action; op.command.capability_id = action; op.command.input = { source_intent: intent, session_id: null };
  op.command.actor_ref = intent.operator_id; op.command.approval.operator_id = intent.operator_id;
  op.provider_operation.action = action; op.provider_operation.capability_id = action;
  if (state === "succeeded") {
    const revoked = action === "agent-source.revoke";
    const credential = { schema_version: 1, artifact_type: "source-intent-credential-receipt", command_id: op.command.command_id, action, outcome: revoked ? "revoked" : "issued",
      source_intent_digest: hash(intent), source_intent_id: intent.intent_id, supersedes_intent_digest: intent.supersedes_intent_digest, subject: intent.subject, session_id: null,
      landing_unit_id: intent.landing_unit_id, repository: intent.repository, repository_id: intent.repository_id, installation_id: intent.installation_id, branch: intent.branch, fetched_base: intent.fetched_base,
      human_reviewer_id: intent.human_reviewer_id, caller_id: intent.caller_id, operator_id: intent.operator_id, source_start_digest: intent.source_start_digest,
      identity_id: "agent-gary", logical_agent_id: "gary", provider_principal: "sample-gary[bot]", app_id: 103, definition_digest: hash("definition"), permissions: { metadata: "read", contents: "write", pull_requests: "write", checks: "read" },
      token_expires_at: revoked ? null : "2030-01-01T00:00:00Z", authorization_expires_at: intent.expires_at, recorded_at: op.updated_at, secret_values_embedded: false };
    op.provider_operation.receipt.source_credential = { ...credential, receipt_digest: hash(credential) };
  } else if (state === "failed") {
    op.next_action = { code: "request-correction", authority: "platform-engineering", reason: "The exact source binding requires correction." };
    op.provider_operation.failure = { code: "platform_provider_source_stale", detail: op.next_action.reason, owner: "platform-engineering" };
  }
  return assertPlatformOperationRecord(op);
}
export function projectionRepairFixture() {
  const diagnostic = structuredClone(environmentOperation("diagnostic", { state: "failed", retryable: true }));
  diagnostic.next_action = { code: "retry", authority: "operator", reason: "The old status check failed." };
  diagnostic.provider_operation.failure = { code: "platform_owner_command_failed", detail: diagnostic.next_action.reason, owner: "platform-engineering" };
  const failed = sourceOperation("failed-source", "agent-source.issue", "failed");
  const revoked = sourceOperation("revoked-source", "agent-source.revoke", "succeeded");
  const records = [assertPlatformOperationRecord(diagnostic), failed, revoked];
  return { catalog: environmentCatalog(), records, diagnostic, failed, revoked };
}
