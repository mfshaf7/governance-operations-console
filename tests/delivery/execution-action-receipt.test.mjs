import assert from "node:assert/strict";
import test from "node:test";

import { executionActionContracts } from "../../src/domain-workspaces/delivery/work-model/execution/execution-action-contracts.ts";
import { submitExecutionActionCommand } from "../../src/domain-workspaces/delivery/local-runtime/commands/execution-action-runtime.ts";

test("execution receipt retains the complete applied intent", async () => {
  const action = {
    action_type: "start-work",
    enabled: true,
    expected_backend_route: "POST /v1/delivery-work-items/{work_item_id}/update",
    label: "Start Work",
    reason: "Begin the selected execution target.",
    scope: "execution_target",
    tone: "ok",
  };
  const applyIntent = {
    action_type: "start-work",
    artifacts: ["ready-evidence-1"],
    advisor_reason: null,
    current_backend_status: "ready",
    current_package_posture: "Ready",
    delivery_package_id: "execution-receipt-package",
    dirty_state: "clean",
    expected_backend_route: action.expected_backend_route,
    gate_checks: [{ label: "Source current", passed: true, tone: "ok" }],
    intent_id: "execution-receipt-intent",
    operator_payload: { status: "in-progress" },
    receipt_category: "accepted",
    required_payload_fields: ["status"],
    scope: "execution_target",
    source_epic_id: 900,
    source_revision: "delivery-v1",
    target_display_name: "Story 900",
    target_id: "story-900",
    target_type: "User story",
  };
  const packageSummary = {
    delivery_package_id: "execution-receipt-package",
    display_name: "Execution receipt package",
    source_ref: "OpenProject Epic #900",
  };
  const { receipt, run } = await submitExecutionActionCommand({
    action,
    actionContract: executionActionContracts["start-work"],
    applyIntent,
    packageSummary,
    submittedAt: "2026-07-10T10:00:00.000Z",
  });

  assert.equal(run.state, "completed");
  assert.ok(receipt);
  assert.equal(receipt.receipt.resultState, "recorded");
  assert.equal(receipt.receipt.commandName, "delivery.execution.start-work");
  assert.deepEqual(receipt.receipt.appliedIntent.gate_checks, applyIntent.gate_checks);
  assert.deepEqual(
    receipt.receipt.appliedIntent.operator_payload,
    applyIntent.operator_payload,
  );
  assert.notEqual(receipt.receipt.appliedIntent, applyIntent);
});
