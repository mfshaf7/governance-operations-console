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
  closeDeliveryWorkSession,
  continueDeliveryWorkSession,
  deliveryWorkSessionOperator,
  mergeDeliveryWorkSession,
  prepareDeliveryWorkSessionDecision,
  readDeliveryWorkSession,
  startDeliveryWorkSession,
} from "../../src/domain-workspaces/delivery/server/delivery-work-session-oos-client.ts";
import { DeliveryOosError } from "../../src/domain-workspaces/delivery/server/delivery-oos-client.ts";
import {
  directExecutionWorkSessionTarget,
  packageExecutionWorkSessionTarget,
  parseExecutionWorkItemReference,
} from "../../src/domain-workspaces/delivery/presentation/surfaces/execution-board/work-session/execution-work-session-target.ts";

const env = {
  GOVERNANCE_CONSOLE_OPERATOR_ID: "operator:console-owner",
  OOS_BASE_URL: "http://127.0.0.1:8080",
  OOS_CALLER_ID: "governance-operations-console",
  OOS_CALLER_SECRET: "test-only-console-secret",
};

test("case:delivery-execution-source-provenance-positive reads and advances only OOS-owned state", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const body = init.body ? JSON.parse(String(init.body)) : null;
    calls.push({ body, headers: init.headers, method: init.method, url: String(url) });
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
  assert.equal(calls[0].headers["x-oos-operator-id"], "operator:console-owner");
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
    "governance-operations-console",
  );
  assert.equal(
    calls[0].headers["x-oos-caller-secret"],
    "test-only-console-secret",
  );
  assert.equal(
    calls[0].headers["x-oos-operator-id"],
    "operator:console-owner",
  );
  assert.deepEqual(deliveryWorkSessionOperator(env), {
    decision_source: "operator",
    id: "operator:console-owner",
  });
});

test("case:delivery-work-session-terminal-actions preserve exact revision and bounded routes", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ body: JSON.parse(String(init.body)), url: String(url) });
    return jsonResponse(projection({ receipt: true }));
  };
  const command = {
    commandId: "work-session-command:console-terminal-714-1",
    expectedSessionRevision: "2026-08-27T02:00:00.000Z",
  };

  await mergeDeliveryWorkSession(714, command, { env, fetchImpl });
  await closeDeliveryWorkSession(714, command, { env, fetchImpl });

  assert.match(calls[0].url, /\/work-session\/merge$/);
  assert.match(calls[1].url, /\/work-session\/close$/);
  for (const call of calls) {
    assert.deepEqual(call.body, {
      command: {
        command_id: command.commandId,
        expected_session_revision: command.expectedSessionRevision,
      },
    });
  }
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

test("case:delivery-execution-source-provenance-negative rejects mismatched source and malformed drafts", async () => {
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

  const malformedDecision = acceptedDecision();
  malformedDecision.architecture.artifact_location = null;
  assert.throws(
    () => assertDeliveryWorkSessionDecision(malformedDecision),
    /architecture must name/i,
  );
  assert.throws(() => deliveryWorkSessionTargetId(0), /target is invalid/i);
  assert.throws(
    () => deliveryWorkSessionTargetId(Number.MAX_SAFE_INTEGER + 1),
    /target is invalid/i,
  );
});

test("Delivery work-session target entry normalizes exact ART references without inventing package truth", () => {
  assert.equal(parseExecutionWorkItemReference("1175"), 1175);
  assert.equal(parseExecutionWorkItemReference(" #1175 "), 1175);
  assert.equal(parseExecutionWorkItemReference("work-item-1175"), 1175);
  for (const invalid of ["", "#0", "item-1175", "1175 extra", "9007199254740992"]) {
    assert.throws(() => parseExecutionWorkItemReference(invalid), /valid ART work item/i);
  }

  assert.deepEqual(directExecutionWorkSessionTarget(1175), {
    description:
      "Authoritative OOS state determines whether this Delivery work item can start or continue.",
    entry: "direct",
    sourceLabel: "Entry route",
    sourceValue: "Direct ART target",
    title: "ART Work Item #1175",
    workItemId: 1175,
  });
  assert.deepEqual(
    packageExecutionWorkSessionTarget(
      {
        delivery_package_id: "package-1",
        display_name: "Selected package",
        source_ref: "openproject://work_packages/714",
        summary: "Package-owned execution target.",
      },
      714,
    ),
    {
      description: "Package-owned execution target.",
      entry: "package",
      sourceLabel: "Package",
      sourceValue: "openproject://work_packages/714",
      title: "Selected package",
      workItemId: 714,
    },
  );
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
  assert.match(hookSource, /command\("merge"\)/);
  assert.match(hookSource, /command\("close"\)/);
  assert.match(modalSource, /projection\.command_receipt/);
  assert.match(modalSource, /source-merge-approval-required/);
  assert.match(modalSource, /art-closeout-required/);
  assert.match(modalSource, /draft-finalization/);
  assert.match(modalSource, /project-review-evidence/);
  assert.match(modalSource, /cleanup-required/);
  assert.match(modalSource, /cleanup-retry-required/);
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

test("Delivery work-session contracts validate lifecycle and terminal evidence projections", () => {
  const terminal = {
    ...projection(),
    cleanup_receipt: { outcome: "complete" },
    lifecycle_context: {
      commissioned: true,
      default_mode: "packet",
      latest_binding: null,
      measurements: {
        denied_count: 0,
        packet_count: 2,
        raw_fallback_count: 0,
      },
    },
    projection: {
      complete: true,
      gate: null,
      state: "complete",
      summary: "Source and evidence are complete.",
    },
    pull_request: { state: "merged" },
  };
  assert.equal(
    assertDeliveryWorkSessionProjection(terminal).cleanup_receipt.outcome,
    "complete",
  );
  assert.throws(
    () =>
      assertDeliveryWorkSessionProjection({
        ...terminal,
        lifecycle_context: {
          ...terminal.lifecycle_context,
          measurements: {
            ...terminal.lifecycle_context.measurements,
            raw_fallback_count: -1,
          },
        },
      }),
    /raw_fallback_count is invalid/i,
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
    caller_id: "governance-operations-console",
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
            caller_id: "governance-operations-console",
            command_id: "work-session-command:console-continue-714-1",
            completed_at: revision,
            digest: `sha256:${"a".repeat(64)}`,
            executor_id: "source-executor:dev-integration",
            operator_id: "operator:console-owner",
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
