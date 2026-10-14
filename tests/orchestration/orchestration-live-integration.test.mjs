import assert from "node:assert/strict";
import test from "node:test";

import {
  assertOosOrchestrationDefinitions,
  assertOosOrchestrationRun,
} from "../../src/domain-workspaces/orchestration/live-runtime/orchestration-live-contract.ts";
import {
  projectLiveOrchestrationWorkspace,
} from "../../src/domain-workspaces/orchestration/live-runtime/orchestration-live-projection.ts";
import {
  controlOrchestrationRun,
} from "../../src/domain-workspaces/orchestration/server/orchestration-oos-client.ts";

const now = "2026-10-15T00:00:00.000Z";
const digest = `sha256:${"a".repeat(64)}`;
const config = { baseUrl: "http://127.0.0.1:8080", callerId: "governance-operations-console", callerSecret: "test-secret", operatorId: "operator:mfshaf7" };

test("case:1289-positive projects only exact OOS definition, run, controls, and receipt references", () => {
  const definitions = assertOosOrchestrationDefinitions({ schema_version: 1, definitions: [definition()] });
  const run = assertOosOrchestrationRun(runProjection());
  const readModel = projectLiveOrchestrationWorkspace(definitions, [run], now);
  assert.equal(readModel.definitions[0].source.mode, "live-authority");
  assert.equal(readModel.runs[0].source.mode, "live-authority");
  assert.deepEqual(readModel.runs[0].evidenceRefs, ["receipt:wgcf:1"]);
  assert.deepEqual(readModel.runs[0].controls.filter(({ available }) => available).map(({ id }) => id), ["cancel"]);
  assert.equal(readModel.workspaceStatus.statusLabel, "Live");
});

test("case:1289-negative rejects malformed nested OOS truth instead of projecting defaults", () => {
  const malformed = runProjection();
  malformed.current_node = { ...malformed.current_node, owner: "" };
  assert.throws(() => assertOosOrchestrationRun(malformed), /current_node.*malformed/i);
  const extra = definition();
  extra.execution_graph[0] = { ...extra.execution_graph[0], invented: true };
  assert.throws(() => assertOosOrchestrationDefinitions({ schema_version: 1, definitions: [extra] }), /execution_graph.*malformed/i);
});

test("run control binds the reviewed input digest and preserves bounded OOS denial", async () => {
  let sent;
  const fetchImpl = async (_url, init) => {
    sent = JSON.parse(String(init.body));
    const projection = runProjection();
    projection.controls = [{ ...sent, recorded_at: now }];
    return Response.json(projection);
  };
  await controlOrchestrationRun("run:test", { action: "cancel", intent: { acknowledgement: "cancel-is-not-rollback", controlId: "cancel", reason: "Stop future work." }, requestId: "request:control:1" }, { config, fetchImpl });
  assert.equal(sent.action, "cancel");
  assert.equal(sent.operator_id, config.operatorId);
  assert.match(sent.reason_ref, /^console-reason:sha256:[0-9a-f]{64}$/);
  assert.equal(sent.control_id, "console-control:request:control:1");

  await assert.rejects(
    controlOrchestrationRun("run:test", { action: "cancel", intent: { acknowledgement: "cancel-is-not-rollback", controlId: "cancel", reason: "Stop future work." }, requestId: "request:control:1" }, { config, fetchImpl: async () => Response.json({ error: "orchestration_control_unavailable", message: "Control is unavailable." }, { status: 409 }) }),
    (error) => error.code === "orchestration_control_unavailable" && error.message === "Control is unavailable.",
  );
});

function definition() {
  return {
    schema_version: 1, definition_id: "validation-readiness-run", definition_version: 1, title: "Validation readiness run", purpose: "Validate readiness.", qualification: "durable-candidate", lifecycle: "active", source_domain: "workspace-governance-control-fabric", source_record_type: "workspace-delivery-art-initiative", business_owner: "workspace-governance", implementation_repo: "operator-orchestration-service", execution_owner: "operator-orchestration-service", execution_node_owners: ["workspace-governance-control-fabric"], trigger: { request_type: "validation-readiness" }, approval_requirements: ["explicit-operator-approval"], source_version_refs: { immutable: true }, idempotency_strategy: { key: "request" }, lock_strategy: { required: false },
    execution_graph: [{ node_id: "wgcf-validation-readiness", node_type: "activity", label: "Evaluate readiness", owner: "workspace-governance-control-fabric", adapter: "temporal-activity", task_queue: "wgcf.validation-readiness.v1", activity_name: "wgcf.validation-readiness.evaluate", dependencies: [], optional: false }],
    wait_and_signal_contract: { accepted_controls: ["cancel"] }, retry_and_timeout_contract: { automatic_max_attempts: 3 }, compensation_strategy: { required: false }, cancellation_boundary: "Cancellation stops future work.", completion_condition: "WGCF returns a decision.", expected_receipt: "orchestration-validation-readiness-receipt", return_projection: "oos.validation-readiness-run.v1", evidence_and_retention: { owner_receipt_refs_only: true }, security_requirements: { allowed_caller_ids: ["governance-operations-console"] }, rollout_and_rollback: { start_disabled_by_default: true }, admission: { start_allowed: true, gates: Array.from({ length: 14 }, (_, index) => ({ gate_id: `gate-${index + 1}`, satisfied: true, owner: "platform-engineering", detail: "Runtime gate is satisfied." })) },
  };
}

function runProjection() {
  return {
    activation_evidence_digest: digest, schema_version: 1, request_id: "request:test", run_id: "run:test", workflow_id: "workflow:test", definition_id: "validation-readiness-run", definition_version: 1, source_domain: "workspace-governance-control-fabric", source_record_ref: "art:delivery-698", source_version_ref: "source:v1", intent_digest: digest, correlation_ref: "correlation:test", causation_ref: "causation:test", caller_ref: "governance-operations-console", operator_ref: "operator:mfshaf7", approval_ref: "approval:test", state: "running",
    current_node: { node_id: "wgcf-validation-readiness", node_type: "activity", label: "Evaluate readiness", owner: "workspace-governance-control-fabric", state: "running", attempt: 1 },
    progress: { planned: 1, active: 1, completed: 0, skipped: 0, failed: 0 }, wait: null, blocker: null, failure: null, retry_status: { attempts: 1, max_attempts: 3, retry_available: false, next_eligible_at: null }, effect_posture: "possible",
    control_availability: [{ action: "cancel", authority: "operator", available: true, disabled_reason: null, expected_effect: "Stop future execution without claiming rollback." }],
    artifact_refs: ["artifact:test"], log_refs: ["log:test"], receipt_refs: [{ receipt_id: "receipt:wgcf:1", digest }], event_refs: ["event:test:1"], events: [{ event_id: "event:test:1", sequence: 1, state: "running", node_id: "wgcf-validation-readiness", summary: "Run started.", occurred_at: now }], controls: [], aggregate_receipt: null, source_projection_ref: "projection:test", source_projection_version: "projection:v1",
    runtime: { activation_evidence_digest: digest, adapter: "temporal", execution_run_id: "temporal:test", workflow_type: "validationReadinessRunV1", workflow_task_queue: `oos.validation-readiness-run.v1.${"a".repeat(64)}`, activity_name: "wgcf.validation-readiness.evaluate", activity_task_queue: "wgcf.validation-readiness.v1" }, created_at: now, last_projected_at: now, completed_at: null,
  };
}
