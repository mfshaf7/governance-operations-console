import type { OrchestrationDefinitionRecord } from "../domain/orchestration-definition-types.ts";
import type { OrchestrationRunControlId, OrchestrationRunRecord } from "../domain/orchestration-run-types.ts";
import { orchestrationAttentionQueue, orchestrationInFlightRuns, orchestrationMaterialEvents, orchestrationWorkspaceSummary } from "../read-model/workspace/orchestration-workspace-selectors.ts";
import type { OrchestrationWorkspaceReadModel } from "../read-model/workspace/orchestration-workspace-types.ts";
import type { OosOrchestrationDefinition, OosOrchestrationRun } from "./orchestration-live-types.ts";

export function projectLiveOrchestrationWorkspace(definitions: readonly OosOrchestrationDefinition[], runs: readonly OosOrchestrationRun[], observedAt: string): OrchestrationWorkspaceReadModel {
  const projectedDefinitions = definitions.map((definition) => projectDefinition(definition, observedAt));
  const projectedRuns = runs.map(projectRun);
  return {
    attention: orchestrationAttentionQueue({ definitions: projectedDefinitions, now: observedAt, runs: projectedRuns }),
    definitions: projectedDefinitions,
    inFlightRuns: orchestrationInFlightRuns(projectedRuns, observedAt),
    materialEvents: orchestrationMaterialEvents(projectedRuns),
    runs: projectedRuns,
    scenarioCoverage: [],
    summary: orchestrationWorkspaceSummary({ definitions: projectedDefinitions, runs: projectedRuns }),
    workspaceStatus: {
      ariaLabel: "Orchestration workspace status", kicker: "Workspace Status", statusLabel: "Live", summary: "Definitions, runs, controls, events, and receipts are projected from OOS without fixture fallback.", title: "OOS orchestration authority is connected", tone: "ok",
      items: [
        { id: "oos", label: "OOS API", state: "online", tone: "ok", detail: "Authenticated server-only OOS projection is current.", facts: [{ label: "Authority", value: "operator-orchestration-service" }] },
        { id: "catalog", label: "Catalog", state: "current", tone: "ok", detail: "Immutable definition versions come from the OOS catalog.", facts: [{ label: "Definitions", value: String(projectedDefinitions.length) }] },
        { id: "projection", label: "Run Projection", state: "current", tone: "ok", detail: "Aggregate run state and receipts come from OOS.", facts: [{ label: "Runs", value: String(projectedRuns.length) }] },
        { id: "execution", label: "Execution", state: projectedDefinitions.some((definition) => definition.lifecycle === "active") ? "ready" : "blocked", tone: projectedDefinitions.some((definition) => definition.lifecycle === "active") ? "ok" : "warn", detail: "Only OOS-projected controls are exposed.", facts: [] },
      ],
    },
  };
}

export function unavailableOrchestrationWorkspace(message: string, retained: OrchestrationWorkspaceReadModel | null = null): OrchestrationWorkspaceReadModel {
  const observedAt = new Date().toISOString();
  const definitions = (retained?.definitions ?? []).map((definition) => ({ ...definition, source: { ...definition.source, freshness: "stale" as const, observedAt } }));
  const runs = (retained?.runs ?? []).map((run) => ({
    ...run,
    controls: run.controls.map((control) => ({ ...control, available: false, disabledReason: "Current OOS run truth is unavailable." })),
    runtimeDiagnostics: { ...run.runtimeDiagnostics, detail: message, state: "unavailable" as const },
    source: { ...run.source, freshness: "stale" as const, observedAt },
  }));
  const unavailable: OrchestrationWorkspaceReadModel = {
    attention: orchestrationAttentionQueue({ definitions, now: observedAt, runs }), definitions, inFlightRuns: orchestrationInFlightRuns(runs, observedAt), materialEvents: orchestrationMaterialEvents(runs), runs, scenarioCoverage: retained?.scenarioCoverage ?? [],
    summary: retained ? orchestrationWorkspaceSummary({ definitions, runs }) : { definitions: metricDefinitions(), home: metricHome(), runs: metricRuns() },
    workspaceStatus: { ariaLabel: "Orchestration workspace status", kicker: "Workspace Status", statusLabel: "Unavailable", summary: message, title: "OOS orchestration truth is unavailable", tone: "warn", items: [
      { id: "oos", label: "OOS API", state: "offline", tone: "warn", detail: message, facts: [] },
      { id: "catalog", label: "Catalog", state: "offline", tone: "warn", detail: "Fixture definitions are suppressed in configured live mode.", facts: [] },
      { id: "projection", label: "Run Projection", state: "offline", tone: "warn", detail: "Fixture runs are suppressed in configured live mode.", facts: [] },
      { id: "execution", label: "Execution", state: "blocked", tone: "warn", detail: "Run controls are disabled until current owner truth returns.", facts: [] },
    ] },
  };
  return unavailable;
}

function projectDefinition(source: OosOrchestrationDefinition, observedAt: string): OrchestrationDefinitionRecord {
  const gates = source.admission.gates;
  return {
    admissionChecks: gates.map((gate) => ({ area: gateArea(gate.gate_id), detail: gate.detail, evidenceRefs: [], owner: gate.owner, state: gate.satisfied ? "ready" : "blocked", tone: gate.satisfied ? "ok" : "warn" })),
    approvalRequirements: [...source.approval_requirements], businessOwner: source.business_owner, cancellationBoundary: source.cancellation_boundary,
    classification: source.lifecycle === "active" ? "admitted-durable" : "durable-candidate", completionCondition: source.completion_condition,
    definitionFamilyId: null, definitionId: source.definition_id, evidenceRequirements: Object.keys(source.evidence_and_retention),
    executionNodes: source.execution_graph.map((raw, index) => { const node = record(raw); return { adapter: string(node.adapter, "OOS adapter"), artifactRefs: [], branchCondition: null, dependencies: strings(node.dependencies), id: string(node.node_id, `node-${index + 1}`), idempotency: "OOS definition-owned", inputRefs: [], label: string(node.label, `Execution node ${index + 1}`), logRefs: [], optional: node.optional === true, outputRefs: [], owner: string(node.owner, source.execution_owner), parallelGroup: null, receiptRefs: [], skipReason: null, timeout: "Definition-owned", type: nodeType(node.node_type) }; }),
    executionOwner: source.execution_owner, expectedReceipt: source.expected_receipt, failureStrategy: jsonSummary(source.rollout_and_rollback), id: `${source.definition_id}:v${source.definition_version}`, implementationRepo: source.implementation_repo, lifecycle: source.lifecycle,
    purpose: source.purpose, qualification: { decidedAt: observedAt, decidedBy: "operator-orchestration-service", decision: source.lifecycle === "active" ? "admitted-durable" : "durable-candidate", rationale: "Projected from the immutable OOS definition catalog.", reevaluationCondition: null, status: "recorded", suggestedClassification: null },
    recordKind: "definition", returnProjection: source.return_projection, scenarioKind: "live-authority", securityClassification: jsonSummary(source.security_requirements),
    source: { authority: "operator-orchestration-service", freshness: "current", mode: "live-authority", observedAt, ref: `oos://orchestration/definitions/${source.definition_id}/versions/${source.definition_version}`, schemaVersion: "1", sourceVersion: String(source.definition_version) },
    sourceDomain: source.source_domain, sourceRecordType: source.source_record_type, title: source.title, trigger: jsonSummary(source.trigger), updatedAt: observedAt, version: String(source.definition_version), versionHistory: [{ lifecycle: source.lifecycle, recordedAt: observedAt, summary: "Current immutable OOS definition version.", version: String(source.definition_version) }],
  };
}

function projectRun(source: OosOrchestrationRun): OrchestrationRunRecord {
  const run = source as Record<string, unknown>;
  const current = record(run.current_node); const retry = record(run.retry_status); const runtime = record(run.runtime);
  const receiptIds = receiptPointers(run.receipt_refs).map((receipt) => receipt.receipt_id);
  const state = source.state;
  const controls = array(run.control_availability).map((raw) => { const control = record(raw); const action = controlId(control.action); return { available: control.available === true, disabledReason: control.disabled_reason === null ? null : string(control.disabled_reason, "Unavailable"), expectedEffect: string(control.expected_effect, "OOS controls the effect."), id: action, idempotencyPosture: "OOS-retained immutable control binding", label: action === "provide-signal" ? "Provide Signal" : title(action), owner: string(control.authority, "operator") }; });
  const aggregate = run.aggregate_receipt === null ? null : record(run.aggregate_receipt);
  return {
    artifactRefs: strings(run.artifact_refs), blocker: blocker(run.blocker), businessState: { label: `Source projection ${string(run.source_projection_version, "unknown")}`, sourceDomain: string(run.source_domain, "unknown") }, causationRef: string(run.causation_ref, "unknown"), completedAt: nullableString(run.completed_at), controls, correlationRef: string(run.correlation_ref, "unknown"), createdAt: string(run.created_at, new Date(0).toISOString()), currentNodeId: string(current.node_id, null), definitionFamilyId: null, definitionId: source.definition_id, definitionVersion: String(source.definition_version), effectPosture: effect(run.effect_posture), evidenceRefs: receiptIds,
    events: array(run.events).map((raw, index) => { const event = record(raw); return { eventId: string(event.event_id, `event-${index + 1}`), material: true, nodeId: nullableString(event.node_id), occurredAt: string(event.occurred_at, string(run.last_projected_at, new Date(0).toISOString())), sequence: number(event.sequence, index + 1), state: runState(event.state), summary: string(event.summary, "OOS run event") }; }),
    failure: failure(run.failure), id: source.run_id, logRefs: strings(run.log_refs), nodes: [{ artifactRefs: strings(run.artifact_refs), attempt: number(current.attempt, 0), completedAt: state === "completed" ? nullableString(run.completed_at) : null, duration: null, id: string(current.node_id, "current-node"), inputRefs: [], label: string(current.label, "Current execution node"), logRefs: strings(run.log_refs), outputRefs: [], owner: string(current.owner, "operator-orchestration-service"), parallelGroup: null, receiptRefs: receiptIds, skipReason: null, startedAt: string(run.created_at, null), state: nodeState(current.state), type: nodeType(current.node_type) }],
    receipt: aggregate ? { outcome: receiptOutcome(aggregate.outcome), receiptId: string(aggregate.receipt_id, "oos-receipt"), recordedAt: string(aggregate.recorded_at, string(run.last_projected_at, new Date(0).toISOString())), ref: `oos://orchestration/receipts/${string(aggregate.receipt_id, "unknown")}`, verified: true } : null,
    requestId: source.request_id, retry: { attempts: number(retry.attempts, 0), available: retry.retry_available === true, backoff: "OOS definition-owned", maxAttempts: number(retry.max_attempts, 1), nextEligibleAt: nullableString(retry.next_eligible_at) }, runId: source.run_id,
    runtimeDiagnostics: { adapter: string(runtime.adapter, "OOS durable adapter"), detail: "Runtime identity is projected by OOS and remains secondary diagnostic evidence.", liveRuntimeClaimed: true, state: "online", worker: string(runtime.workflow_type, "OOS worker") }, scenarioKind: "live-authority",
    source: { authority: "operator-orchestration-service", freshness: "current", mode: "live-authority", observedAt: string(run.last_projected_at, new Date(0).toISOString()), ref: `oos://orchestration/runs/${source.run_id}`, schemaVersion: "1", sourceVersion: string(run.source_projection_version, "unknown") },
    sourceDomain: string(run.source_domain, "unknown"), sourceProjectionRef: string(run.source_projection_ref, "unknown"), sourceProjectionVersion: string(run.source_projection_version, "unknown"), sourceRecordRef: string(run.source_record_ref, "unknown"), state, updatedAt: string(run.last_projected_at, new Date(0).toISOString()), wait: wait(run.wait),
  };
}

function gateArea(id: string): "implementation" | "platform" | "runtime" | "security" | "validation" { if (id.includes("security") || id.includes("authorized")) return "security"; if (id.includes("platform") || id.includes("profile")) return "platform"; if (id.includes("runtime") || id.includes("worker")) return "runtime"; if (id.includes("implement") || id.includes("replay") || id.includes("failure")) return "implementation"; return "validation"; }
function blocker(value: unknown) { if (value === null) return null; const v = record(value); return { detail: string(v.detail, "Blocked"), evidenceRefs: strings(v.evidence_refs), id: string(v.blocker_id, "blocker"), owner: string(v.owner, "unknown"), remediation: string(v.remediation, "Follow OOS next action."), supportedDispositions: strings(v.supported_dispositions).filter((x): x is "accept-risk" | "defer" | "remove" | "workaround" => ["accept-risk", "defer", "remove", "workaround"].includes(x)) }; }
function failure(value: unknown) { if (value === null) return null; const v = record(value); return { detail: string(v.detail, "Failed"), failedNodeId: string(v.failed_node_id, "current-node"), id: string(v.failure_id, "failure"), owner: string(v.owner, "unknown"), retryExhausted: v.retry_exhausted === true, retryable: v.retryable === true }; }
function wait(value: unknown) { if (value === null) return null; const v = record(value); return { deadline: nullableString(v.deadline), enteredAt: string(v.entered_at, new Date(0).toISOString()), expectedRef: string(v.expected_signal, "unknown"), id: string(v.wait_id, "wait"), kind: ["authority-decision", "dependency", "external-event", "timer"].includes(String(v.kind)) ? v.kind as "authority-decision" | "dependency" | "external-event" | "timer" : "dependency", owner: string(v.owner, "unknown"), reason: string(v.reason_ref, "Waiting"), requiresOperatorAction: true, timeoutBehavior: string(v.timeout_behavior, "definition-owned") }; }
function controlId(value: unknown): OrchestrationRunControlId { return value === "signal" ? "provide-signal" : ["cancel", "defer", "resume", "retry"].includes(String(value)) ? value as OrchestrationRunControlId : "retry"; }
function nodeType(value: unknown): "activity" | "subworkflow" | "wait" { return ["activity", "subworkflow", "wait"].includes(String(value)) ? value as "activity" | "subworkflow" | "wait" : "activity"; }
function nodeState(value: unknown): OrchestrationRunRecord["nodes"][number]["state"] { return ["blocked", "cancelled", "completed", "failed", "queued", "running", "skipped", "waiting"].includes(String(value)) ? value as OrchestrationRunRecord["nodes"][number]["state"] : "queued"; }
function runState(value: unknown): OrchestrationRunRecord["state"] { return ["blocked", "cancelled", "completed", "failed", "queued", "running", "waiting"].includes(String(value)) ? value as OrchestrationRunRecord["state"] : "queued"; }
function effect(value: unknown): OrchestrationRunRecord["effectPosture"] { return ["none", "partial", "possible", "verified"].includes(String(value)) ? value as OrchestrationRunRecord["effectPosture"] : "none"; }
function receiptOutcome(value: unknown): "cancelled_no_effect" | "cancelled_with_effects" | "completed" | "failed_no_effect" | "failed_with_effects" { if (value === "completed") return "completed"; if (value === "cancelled-no-effect") return "cancelled_no_effect"; if (value === "cancelled-with-retained-evidence") return "cancelled_with_effects"; return value === "failed-with-retained-evidence" ? "failed_with_effects" : "failed_no_effect"; }
function metricDefinitions() { return ["Candidates", "Qualified", "Ready", "In Review", "Active"].map((label, index) => ({ id: `definition-${index}`, label: label as "Active" | "Candidates" | "In Review" | "Qualified" | "Ready", tone: "muted" as const, value: "0" })); }
function metricHome() { return ["Active Runs", "Waiting", "Blocked", "Failed", "Definition Work"].map((label, index) => ({ id: `home-${index}`, label: label as "Active Runs" | "Waiting" | "Blocked" | "Failed" | "Definition Work", tone: "muted" as const, value: "0" })); }
function metricRuns() { return ["Active", "Waiting", "Blocked", "Failed", "Completed"].map((label, index) => ({ id: `run-${index}`, label: label as "Active" | "Waiting" | "Blocked" | "Failed" | "Completed", tone: "muted" as const, value: "0" })); }
function record(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function strings(value: unknown): string[] { return array(value).filter((entry): entry is string => typeof entry === "string"); }
function receiptPointers(value: unknown): Array<{ digest: string; receipt_id: string }> { return array(value).map(record).filter((entry): entry is Record<string, string> => typeof entry.receipt_id === "string" && typeof entry.digest === "string").map((entry) => ({ digest: entry.digest, receipt_id: entry.receipt_id })); }
function string(value: unknown, fallback: string | null): string { return typeof value === "string" && value ? value : (fallback ?? ""); }
function nullableString(value: unknown): string | null { return typeof value === "string" && value ? value : null; }
function number(value: unknown, fallback: number): number { return Number.isSafeInteger(value) ? Number(value) : fallback; }
function title(value: string) { return value.replaceAll("-", " ").replace(/\b\w/g, (character) => character.toUpperCase()); }
function jsonSummary(value: unknown) { return JSON.stringify(value); }
