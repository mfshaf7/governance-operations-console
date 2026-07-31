import assert from "node:assert/strict";
import test from "node:test";

import {
  executionActionIntentBlockers,
  executionActionIntentReady,
} from "../../src/domain-workspaces/delivery/work-model/execution/execution-action-eligibility.ts";

test("execution action is ready only when gates and required payload are clear", () => {
  const intent = executionIntent();

  assert.equal(executionActionIntentReady(intent), true);
  assert.deepEqual(executionActionIntentBlockers(intent), []);
});

test("failed gates and placeholder payload block execution apply", () => {
  const intent = executionIntent({
    gate_checks: [{ label: "Readiness proof exists", passed: false, tone: "warn" }],
    operator_payload: { status: "CHECK" },
  });

  assert.equal(executionActionIntentReady(intent), false);
  assert.deepEqual(executionActionIntentBlockers(intent), [
    "Readiness proof exists is not clear.",
    "status is required.",
  ]);
});

test("stale source revision blocks execution apply", () => {
  const intent = executionIntent({ dirty_state: "stale" });

  assert.equal(executionActionIntentReady(intent), false);
  assert.deepEqual(executionActionIntentBlockers(intent), [
    "The source revision is stale.",
  ]);
});

function executionIntent(overrides = {}) {
  return {
    action_type: "start-work",
    artifacts: ["READY-1"],
    advisor_reason: null,
    current_backend_status: "ready",
    current_package_posture: "Ready",
    delivery_package_id: "pkg-1",
    dirty_state: "clean",
    expected_backend_route: "POST /v1/delivery-work-items/{work_item_id}/update",
    gate_checks: [{ label: "Source current", passed: true, tone: "ok" }],
    intent_id: "intent-1",
    operator_payload: { status: "in-progress" },
    receipt_category: null,
    required_payload_fields: ["status"],
    scope: "execution_target",
    source_epic_id: 1,
    source_revision: "delivery-v1",
    target_display_name: "Story 1",
    target_id: "story-1",
    target_type: "User story",
    ...overrides,
  };
}
