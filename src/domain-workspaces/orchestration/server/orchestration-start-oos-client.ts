import { createHash } from "node:crypto";

import { acceptCurrentConsoleSourceProjection, consoleSourceProjectionHeaders, requireCurrentConsoleSourceProjection } from "../../../console-integration/source-authority/console-source-authority.ts";
import { assertOosOrchestrationDefinitions, assertOosOrchestrationRun } from "../live-runtime/orchestration-live-contract.ts";
import { assertOrchestrationStartContext, assertOrchestrationStartDraft, orchestrationInitiativeId, originalOrchestrationRunId, type OrchestrationStartContext } from "../work-model/run-start/run-start-model.ts";
import { OrchestrationOosError, orchestrationOosRequest, resolveOrchestrationConfig, type OrchestrationClientOptions } from "./orchestration-oos-client.ts";

export async function readOrchestrationStartContext(value: unknown, options: OrchestrationClientOptions = {}): Promise<OrchestrationStartContext> {
  let id: number;
  try { id = orchestrationInitiativeId(value); }
  catch { throw new OrchestrationOosError("Enter an ART Epic number.", "orchestration_start_input_invalid", 400); }
  const recordRef = `openproject://work_packages/${id}`;
  const [catalog, rawSource] = await Promise.all([
    orchestrationOosRequest("/v1/orchestration/definitions", { method: "GET" }, options),
    orchestrationOosRequest(`/v1/delivery-initiatives/delivery-${id}/change-control`,
      { method: "GET", headers: consoleSourceProjectionHeaders() }, { ...options, timeoutMs: 75_000 }),
  ]);
  const definitions = assertOosOrchestrationDefinitions(catalog);
  const definition = definitions.find(value => value.definition_id === "validation-readiness-run" && value.definition_version === 1);
  if (!definition) throw new OrchestrationOosError("The admitted definition is unavailable.", "orchestration_definition_unavailable", 503);
  const expected = { authority: "operator-orchestration-service", recordRef, sourceOwner: "workspace-delivery-art" };
  const envelope = requireCurrentConsoleSourceProjection(rawSource, expected, { now: options.now?.() });
  const source = object(acceptCurrentConsoleSourceProjection(rawSource, expected, { now: options.now?.() }));
  const item = object(object(source.package).execution_tree);
  if (source.schema_version !== 1 || source.delivery_id !== `delivery-${id}` || source.record_ref !== recordRef ||
      source.projection_state !== "current" || source.source_revision !== envelope.revision.source_revision ||
      item.id !== id || item.type !== "Epic" || item.record_ref !== recordRef || typeof item.subject !== "string" || !item.subject.trim()) {
    throw new OrchestrationOosError("OOS returned a different or incomplete initiative source.", "orchestration_start_source_invalid", 502);
  }
  const blockers = definition.admission.gates.filter(gate => !gate.satisfied).map(gate => gate.detail);
  if (!definition.admission.start_allowed && blockers.length === 0) blockers.push("The owner has not admitted new starts.");
  return assertOrchestrationStartContext({ initiativeId: id, title: item.subject, recordRef,
    sourceVersion: envelope.revision.source_revision, projectionRef: envelope.binding.source_ref,
    projectionVersion: envelope.revision.source_revision, startAllowed: definition.admission.start_allowed, blockers });
}

export async function startOrchestrationRun(value: unknown, options: OrchestrationClientOptions = {}) {
  let draft;
  try { draft = assertOrchestrationStartDraft(value); }
  catch (error) { throw new OrchestrationOosError(error instanceof Error ? error.message : "Review the start intent.", "orchestration_start_input_invalid", 400); }
  const config = options.config ?? resolveOrchestrationConfig();
  const now = options.now?.() ?? new Date();
  const issued = Date.parse(draft.issuedAt);
  if (issued > now.getTime() + 60_000 || now.getTime() - issued >= 15 * 60_000) {
    throw new OrchestrationOosError("Read the original run or renew the unsubmitted review; this approval is no longer current.", "orchestration_start_review_expired", 409);
  }
  const source = await readOrchestrationStartContext(draft.initiativeId, { ...options, config });
  if (!source.startAllowed) throw new OrchestrationOosError(source.blockers.join(" "), "orchestration_start_not_admitted", 409);
  if (source.sourceVersion !== draft.expectedSourceVersion) throw new OrchestrationOosError("The initiative changed since review. This attempt did not submit a start.", "orchestration_start_source_changed", 409);
  const body = buildOrchestrationStartRequest(draft, source, config.operatorId);
  const result = object(await orchestrationOosRequest("/v1/orchestration/runs", { method: "POST", body: JSON.stringify(body) }, { ...options, config }));
  const expectedRunId = originalOrchestrationRunId(draft.requestId);
  if (Object.keys(result).length !== 3 || !["duplicate", "run_id", "projection"].every(key => key in result) ||
      typeof result.duplicate !== "boolean" || result.run_id !== expectedRunId) {
    throw new OrchestrationOosError("OOS did not acknowledge the original run. Recover that same identity.", "orchestration_start_unconfirmed", 502);
  }
  let state: string | null = null;
  if (result.projection !== null) {
    const run = assertOosOrchestrationRun(result.projection);
    if (run.run_id !== expectedRunId || run.request_id !== body.request_id || run.intent_digest !== body.intent_digest ||
        run.source_record_ref !== body.source_record_ref || run.source_version_ref !== body.source_version_ref ||
        run.source_projection_ref !== body.source_projection_ref || run.source_projection_version !== body.source_projection_version ||
        run.operator_ref !== config.operatorId || run.caller_ref !== config.callerId || run.approval_ref !== body.approval_refs[0].decision_ref) {
      throw new OrchestrationOosError("The returned run belongs to a different immutable request.", "orchestration_start_binding_invalid", 502);
    }
    state = run.state;
  }
  return { duplicate: result.duplicate, runId: expectedRunId, state };
}

export async function readOriginalOrchestrationRun(runId: string, options: OrchestrationClientOptions = {}) {
  if (!/^oos:validation-readiness-run:v1:[A-Za-z0-9._:/@+-]+$/.test(runId) || runId.length > 256) throw new OrchestrationOosError("Enter the original admitted run reference.", "orchestration_run_reference_invalid", 400);
  const run = assertOosOrchestrationRun(await orchestrationOosRequest(`/v1/orchestration/runs/${encodeURIComponent(runId)}`, { method: "GET" }, options));
  if (run.run_id !== runId) throw new OrchestrationOosError("OOS returned a different original run.", "orchestration_run_binding_invalid", 502);
  return run;
}

export function buildOrchestrationStartRequest(draft: ReturnType<typeof assertOrchestrationStartDraft>, source: OrchestrationStartContext, operatorId: string) {
  // Wire canonical order is owned by OOS orchestrationIntentDigest.
  const intent = { schema_version: 1, definition_id: "validation-readiness-run", definition_version: 1,
    source_domain: "workspace-governance-control-fabric", source_record_ref: source.recordRef,
    source_version_ref: source.sourceVersion, request_type: "validation-readiness", intent_summary: draft.purpose.trim(),
    input_refs: [source.recordRef, source.projectionRef], lock_refs: [], expected_receipt: "orchestration-validation-readiness-receipt",
    return_projection: "oos.validation-readiness-run.v1", source_projection_ref: source.projectionRef, source_projection_version: source.projectionVersion };
  const digest = `sha256:${createHash("sha256").update(JSON.stringify(intent)).digest("hex")}`;
  return { ...intent, request_id: `console-orchestration-request:${draft.requestId}`, intent_digest: digest,
    approval_refs: [{ decision_kind: "operator-approved", authority: operatorId, scope_ref: source.recordRef,
      source_version_ref: source.sourceVersion, intent_digest: digest, decision_ref: `console-orchestration-approval:${draft.requestId}`,
      decided_at: draft.issuedAt, expires_at: new Date(Date.parse(draft.issuedAt) + 15 * 60_000).toISOString() }],
    idempotency_key: `console-orchestration-start:${draft.requestId}`, operator_id: operatorId,
    correlation_ref: `console-orchestration:${draft.requestId}`, causation_ref: `console-operator-review:${draft.requestId}` };
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new OrchestrationOosError("Owner run source is malformed.", "orchestration_projection_invalid", 502);
  return value as Record<string, unknown>;
}
