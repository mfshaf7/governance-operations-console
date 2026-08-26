import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  assertDeliveryWorkSessionDecision,
  assertDeliveryWorkSessionProjection,
  assertDeliveryWorkSessionSnapshot,
  deliveryWorkSessionTargetId,
} from "../../src/domain-workspaces/delivery/live-runtime/delivery-work-session-live-contract.ts";
import {
  continueDeliveryWorkSession,
  deliveryWorkSessionOperator,
  prepareDeliveryWorkSessionDecision,
  readDeliveryWorkSession,
  startDeliveryWorkSession,
} from "../../src/domain-workspaces/delivery/server/delivery-work-session-oos-client.ts";
import { DeliveryOosError } from "../../src/domain-workspaces/delivery/server/delivery-oos-client.ts";

const env = {
  GOVERNANCE_CONSOLE_OPERATOR_ID: "operator:console-owner",
  OOS_BASE_URL: "http://127.0.0.1:8080",
  OOS_CALLER_ID: "operator:console-owner",
  OOS_CALLER_SECRET: "test-only-console-secret",
};

test("case:delivery-execution-source-provenance-positive reads and advances only OOS-owned state", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const body = init.body ? JSON.parse(String(init.body)) : null;
    calls.push({ body, method: init.method, url: String(url) });
    return jsonResponse(
      projection({
        receipt: init.method === "POST",
        revision:
          init.method === "POST"
            ? "2026-08-27T02:01:00.000Z"
            : "2026-08-27T02:00:00.000Z",
      }),
    );
  };

  const current = await readDeliveryWorkSession(714, { env, fetchImpl });
  const continued = await continueDeliveryWorkSession(
    714,
    {
      commandId: "work-session-command:console-continue-714-1",
      expectedSessionRevision: current.session_revision,
    },
    { env, fetchImpl },
  );

  assert.equal(current.work_item_id, "work-item-714");
  assert.equal(continued.command_receipt.result_state, "source-work");
  assert.equal(
    calls[0].url,
    "http://127.0.0.1:8080/v1/delivery-work-items/714/work-session",
  );
  assert.equal(calls[0].method, "GET");
  assert.equal(calls[1].method, "POST");
  assert.match(calls[1].url, /\/work-session\/continue$/);
  assert.deepEqual(calls[1].body, {
    command: {
      command_id: "work-session-command:console-continue-714-1",
      expected_session_revision: "2026-08-27T02:00:00.000Z",
    },
  });
});

test("case:delivery-work-session-start preserves the reviewed decision and command identity", async () => {
  const calls = [];
  const decision = acceptedDecision();
  const fetchImpl = async (url, init) => {
    calls.push({
      body: JSON.parse(String(init.body)),
      headers: init.headers,
      url: String(url),
    });
    return jsonResponse(projection({ receipt: true }));
  };

  await startDeliveryWorkSession(
    714,
    {
      commandId: "work-session-command:console-start-714-1",
      decision,
      expectedSessionRevision: null,
    },
    { env, fetchImpl },
  );

  assert.deepEqual(calls[0].body.command.decision, decision);
  assert.equal(
    calls[0].headers["x-oos-caller-id"],
    "operator:console-owner",
  );
  assert.equal(
    calls[0].headers["x-oos-caller-secret"],
    "test-only-console-secret",
  );
  assert.deepEqual(deliveryWorkSessionOperator(env), {
    decision_source: "operator",
    id: "operator:console-owner",
  });
});

test("case:delivery-execution-end-to-end-positive rebuilds accepted input from a fresh OOS-owned draft", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const body = JSON.parse(String(init.body));
    calls.push({ body, url: String(url) });
    return jsonResponse({
      ...projection({ session: false }),
      decision_draft: preparedDecisionDraft(),
    });
  };

  const decision = await prepareDeliveryWorkSessionDecision(
    714,
    decisionInput(),
    "work-session-command:console-start-714-2",
    null,
    { env, fetchImpl },
  );
  assert.equal(calls.length, 1);
  assert.match(
    calls[0].body.command.command_id,
    /^work-session-command:console-prepare-[a-f0-9]{64}$/,
  );
  assert.equal(calls[0].body.command.decision, undefined);
  assert.deepEqual(decision, acceptedDecision());
});

test("case:delivery-execution-source-provenance-negative rejects mismatched source, caller, and malformed drafts", async () => {
  await assert.rejects(
    readDeliveryWorkSession(714, {
      env,
      fetchImpl: async () =>
        jsonResponse({ ...projection(), work_item_id: "work-item-715" }),
    }),
    (error) =>
      error instanceof DeliveryOosError &&
      error.code === "delivery_work_session_target_mismatch" &&
      error.status === 502,
  );

  await assert.rejects(
    readDeliveryWorkSession(714, {
      env: { ...env, OOS_CALLER_ID: "governance-operations-console" },
      fetchImpl: async () => {
        throw new Error("OOS must not run with a mismatched caller binding.");
      },
    }),
    (error) =>
      error instanceof DeliveryOosError &&
      error.code === "delivery_work_session_caller_binding_invalid" &&
      error.status === 503,
  );

  const malformedDecision = acceptedDecision();
  malformedDecision.architecture.artifact_location = null;
  assert.throws(
    () => assertDeliveryWorkSessionDecision(malformedDecision),
    /architecture must name/i,
  );
  assert.throws(() => deliveryWorkSessionTargetId(0), /target is invalid/i);
});

test("case:delivery-execution-end-to-end-negative keeps browser authority bounded", () => {
  const hookSource = readFileSync(
    new URL(
      "../../src/domain-workspaces/delivery/live-runtime/use-delivery-work-session-live-runtime.ts",
      import.meta.url,
    ),
    "utf8",
  );
  const modalSource = readFileSync(
    new URL(
      "../../src/domain-workspaces/delivery/presentation/surfaces/execution-board/work-session/execution-work-session-modal.tsx",
      import.meta.url,
    ),
    "utf8",
  );

  for (const source of [hookSource, modalSource]) {
    assert.doesNotMatch(source, /OOS_CALLER_SECRET/);
    assert.doesNotMatch(source, /fetch\([^)]*openproject:/is);
    assert.doesNotMatch(source, /\/v1\/.*openproject/i);
    assert.doesNotMatch(source, /recordLocalDeliveryExecutionAction/);
    assert.doesNotMatch(source, /submitExecutionActionCommand/);
  }
  assert.match(hookSource, /work-session-command:console-/);
  assert.match(hookSource, /expectedSessionRevision/);
  assert.match(modalSource, /projection\.command_receipt/);
});

test("Delivery work-session contracts accept incomplete OOS drafts but require accepted decisions", () => {
  const draft = acceptedDecision();
  draft.architecture = { artifact_location: null, required: null };
  assert.equal(assertDeliveryWorkSessionDecision(draft, true).work_item_id, "work-item-714");
  assert.throws(
    () => assertDeliveryWorkSessionDecision(draft),
    /architecture requirement is required/i,
  );
  assert.equal(
    assertDeliveryWorkSessionProjection({
      ...projection(),
      decision_draft: draft,
    }).decision_draft.architecture.required,
    null,
  );
  assert.equal(
    assertDeliveryWorkSessionSnapshot({
      error: null,
      mode: "live",
      observedAt: "2026-08-27T02:00:00.000Z",
      projection: projection(),
      status: "current",
    }).status,
    "current",
  );
});

function acceptedDecision() {
  return {
    architecture: {
      artifact_location: {
        relative_path: ".art/architecture-packet-delivery-886-v1.json",
        repo: "operator-orchestration-service",
      },
      required: true,
    },
    artifact_type: "delivery_art_work_session_decision",
    covered_work_item_ids: ["work-item-714"],
    human_gate_work_item_ids: { security_acceptance: [] },
    landing_unit: {
      base_ref: "origin/main",
      branch: "feature/714-governed-work",
      decision: "child_isolated_landing_unit",
      id: "delivery-698-work-item-714",
      rollback_boundary: "Revert the selected child source unit.",
      split_reason: "The child has an independent review and rollback boundary.",
    },
    operator: {
      decision_source: "operator",
      id: "operator:console-owner",
    },
    schema_version: 1,
    work_item_id: "work-item-714",
  };
}

function preparedDecisionDraft() {
  const decision = acceptedDecision();
  decision.architecture = { artifact_location: null, required: null };
  decision.landing_unit.branch = "feature/714-replace-with-purpose";
  decision.landing_unit.rollback_boundary = "[operator-input-required] rollback";
  decision.landing_unit.split_reason = "[operator-input-required] split";
  return decision;
}

function decisionInput() {
  return {
    architecture: {
      artifactLocation: {
        relative_path: ".art/architecture-packet-delivery-886-v1.json",
        repo: "operator-orchestration-service",
      },
      required: true,
    },
    branch: "feature/714-governed-work",
    landingUnitDecision: "child_isolated_landing_unit",
    landingUnitId: "delivery-698-work-item-714",
    rollbackBoundary: "Revert the selected child source unit.",
    splitReason: "The child has an independent review and rollback boundary.",
  };
}

function projection({
  receipt = false,
  revision = "2026-08-27T02:00:00.000Z",
  session = true,
} = {}) {
  return {
    ...(receipt
      ? {
          command_receipt: {
            command_id: "work-session-command:console-continue-714-1",
            completed_at: revision,
            digest: `sha256:${"a".repeat(64)}`,
            executor_id: "source-executor:dev-integration",
            ref: "oos://delivery-art/work-session-command-receipts/continue-714-1",
            request_digest: `sha256:${"b".repeat(64)}`,
            result_state: "source-work",
            work_item_id: "work-item-714",
          },
          replayed: false,
        }
      : {}),
    delivery_id: "delivery-698",
    landing_unit_id: session ? "delivery-698-work-item-714" : null,
    next_action: {
      authority: "governance-operations-console",
      code: "source-work-required",
      reason: "Complete the bounded source change.",
    },
    session_id: session ? "work-session:delivery-698:delivery-698-work-item-714" : null,
    session_revision: session ? revision : null,
    source: {
      base_commit: "c".repeat(40),
      branch: "feature/714-governed-work",
      changed_files: ["src/example.ts"],
      head_commit: "d".repeat(40),
      state: "unpushed",
      upstream_commit: null,
    },
    state: "source-work",
    work_item_id: "work-item-714",
    workflow_id: "delivery-art-work-session",
  };
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}
