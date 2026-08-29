import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

import {
  assertDeliveryCloseoutOperation,
  assertDeliveryCloseoutProjection,
  assertDeliveryCloseoutResult,
  deliveryCloseoutDeliveryId,
} from "../../src/domain-workspaces/delivery/live-runtime/delivery-closeout-live-contract.ts";
import {
  readDeliveryCloseoutProjection,
  submitDeliveryCloseoutCommand,
} from "../../src/domain-workspaces/delivery/server/delivery-closeout-oos-client.ts";
import { DeliveryOosError } from "../../src/domain-workspaces/delivery/server/delivery-oos-client.ts";
import {
  executionCloseoutEvidenceComplete,
  executionCloseoutImpactComplete,
  executionCloseoutOperation,
  executionCloseoutReadyToApply,
  initialExecutionCloseoutDraft,
} from "../../src/domain-workspaces/delivery/presentation/surfaces/execution-board/action-session/closeout/execution-closeout-model.ts";

const env = {
  GOVERNANCE_CONSOLE_OPERATOR_HANDLE: "console-owner",
  GOVERNANCE_CONSOLE_OPERATOR_ID: "operator:console-owner",
  OOS_BASE_URL: "http://127.0.0.1:8080",
  OOS_CALLER_ID: "governance-operations-console",
  OOS_CALLER_SECRET: "test-only-console-secret",
};

test("case:delivery-closeout-source-provenance-positive reads canonical OOS truth", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ headers: init.headers, method: init.method, url: String(url) });
    return jsonResponse(projection());
  };

  const current = await readDeliveryCloseoutProjection("delivery-886", {
    env,
    fetchImpl,
  });

  assert.equal(current.projection_state, "ready");
  assert.deepEqual(calls, [
    {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-oos-caller-id": "governance-operations-console",
        "x-oos-caller-secret": "test-only-console-secret",
      },
      method: "GET",
      url: "http://127.0.0.1:8080/v1/delivery-initiatives/delivery-886/closeout",
    },
  ]);
  assert.equal(deliveryCloseoutDeliveryId(886), "delivery-886");
});

test("case:delivery-closeout-end-to-end-positive constructs identity and acceptance only on the server", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const body = JSON.parse(String(init.body));
    calls.push({ body, url: String(url) });
    return jsonResponse(result({ commandId: body.command_id }), 201);
  };
  const operation = closeoutOperation();

  const applied = await submitDeliveryCloseoutCommand(
    "delivery-886",
    {
      acceptanceNote: "Apply the reviewed Delivery closeout.",
      commandId: "delivery-closeout-command:console-1031",
      expectedSourceRevision: revision("a"),
      operation,
    },
    { env, fetchImpl },
  );

  assert.equal(applied.status, "applied");
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/delivery-886\/closeout\/commands$/);
  assert.deepEqual(calls[0].body.operator, {
    handle: "console-owner",
    id: "operator:console-owner",
  });
  assert.equal(calls[0].body.acceptance.decision, "apply");
  assert.equal(calls[0].body.acceptance.accepted_by, "operator:console-owner");
  assert.equal(
    calls[0].body.acceptance.note,
    "Apply the reviewed Delivery closeout.",
  );
  assert.match(calls[0].body.acceptance.accepted_at, /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(calls[0].body.operation, operation);
});

test("case:delivery-closeout-source-provenance-negative preserves conflict and exact next action", async () => {
  await assert.rejects(
    readDeliveryCloseoutProjection("delivery-886", {
      env,
      fetchImpl: async () =>
        jsonResponse(
          {
            code: "delivery_closeout_source_revision_stale",
            details: { current_source_revision: revision("b") },
            message: "The Delivery package changed after review.",
            next_action: {
              authority: "operator-orchestration-service",
              code: "refresh_delivery_closeout",
              label: "Refresh Delivery Closeout",
            },
            retryable: false,
            schema_version: 1,
          },
          409,
        ),
    }),
    (error) =>
      error instanceof DeliveryOosError &&
      error.code === "delivery_closeout_source_revision_stale" &&
      error.status === 409 &&
      error.nextAction?.label === "Refresh Delivery Closeout" &&
      error.details?.current_source_revision === revision("b"),
  );

  assert.throws(
    () =>
      assertDeliveryCloseoutProjection({
        ...projection(),
        source_revision: "fixture-v1",
      }),
    /source revision is invalid/i,
  );
  assert.throws(
    () =>
      assertDeliveryCloseoutOperation({
        payload: { evidence: {}, impact: { kind: "none" } },
        type: "apply_closeout",
      }),
    /closeout evidence changed_surfaces is invalid/i,
  );
});

test("case:delivery-closeout-result preserves partial failure, replay, and outcome history", () => {
  const partial = result({
    commandId: "delivery-closeout-command:console-partial-1031",
    replayed: true,
    status: "partial_failure",
  });
  const parsed = assertDeliveryCloseoutResult(partial);
  const projected = assertDeliveryCloseoutProjection({
    ...projection(),
    last_event_ref: partial.event.event_id,
    outcome_history: [partial.event],
    projection_state: "reconciliation_required",
    next_action: partial.next_action,
  });

  assert.equal(parsed.status, "partial_failure");
  assert.equal(parsed.replayed, true);
  assert.equal(parsed.next_action.code, "reconcile_source_closeout");
  assert.equal(projected.outcome_history[0].outcome_ref, partial.event.outcome_ref);
});

test("case:delivery-closeout-form projection blocks incomplete work and builds admitted impact", () => {
  const draft = completeDraft();
  assert.equal(executionCloseoutEvidenceComplete(draft), true);
  assert.equal(executionCloseoutImpactComplete(draft), true);
  assert.equal(
    executionCloseoutReadyToApply({ draft, projection: projection() }),
    true,
  );
  assert.deepEqual(
    executionCloseoutOperation({ draft, projection: projection() }),
    closeoutOperation(),
  );
  assert.equal(
    executionCloseoutReadyToApply({
      draft: { ...draft, acceptanceNote: "" },
      projection: projection(),
    }),
    false,
  );

  const repositoryDraft = {
    ...draft,
    impactKind: "workspace-entrant",
    workspaceEntrant: {
      ...draft.workspaceEntrant,
      entrantKind: "repository",
      repoClass: "product-source",
      requiresSecurityBindings: "no",
      securityOwner: "",
    },
  };
  assert.equal(executionCloseoutImpactComplete(repositoryDraft), true);
  assert.deepEqual(
    executionCloseoutOperation({
      draft: repositoryDraft,
      projection: projection(),
    }).payload.impact,
    {
      candidate: {
        candidate_ref: "delivery://candidates/console",
        candidate_version: "candidate-v1",
        canonical_key: "governance-console",
        correlation_ref: "delivery-closeout:delivery-886",
        entrant_kind: "repository",
        evidence_refs: ["review-packet://delivery-886/final"],
        intake_metadata: {
          repo_class: "product-source",
          requires_security_bindings: false,
          security_owner: null,
          validation_behavior: {
            catalog_refs: ["component-contracts"],
            notes: "Validate in the owner repo.",
            posture: "owner-repo-validated",
            wgcf_graph_role: "product-readiness-aggregate",
          },
        },
        name: "Governance Console",
        source_owner_ref: "repo://governance-operations-console",
      },
      kind: "workspace_entrant",
    },
  );
});

test("case:delivery-closeout-browser-boundary holds no OOS or OpenProject authority", () => {
  const sources = [
    "../../src/domain-workspaces/delivery/live-runtime/use-delivery-closeout-live-runtime.ts",
    "../../src/domain-workspaces/delivery/presentation/surfaces/execution-board/execution-board-surface.tsx",
    "../../src/domain-workspaces/delivery/presentation/surfaces/execution-board/action-session/closeout/execution-closeout-modal.tsx",
  ].map((path) => readFileSync(new URL(path, import.meta.url), "utf8"));

  for (const source of sources) {
    assert.doesNotMatch(source, /OOS_CALLER_SECRET/);
    assert.doesNotMatch(source, /x-oos-caller-secret/i);
    assert.doesNotMatch(source, /openproject:\/\//i);
    assert.doesNotMatch(source, /\/v1\/delivery-initiatives/);
  }
  assert.match(sources[0], /expectedSourceRevision/);
  assert.match(sources[0], /delivery-closeout-command:console-/);
  assert.match(sources[0], /mode === "disconnected-preview"/);
  assert.match(sources[1], /mode !== "disconnected-preview"/);
  assert.doesNotMatch(sources[1], /recordLocalDeliveryExecutionAction/);
});

test("Delivery execution closeout routes retain one Next dynamic segment identity", () => {
  const routeRoot = new URL("../../src/app/api/delivery/execution/", import.meta.url);
  assert.deepEqual(
    readdirSync(routeRoot)
      .filter((entry) => entry.startsWith("["))
      .sort(),
    ["[workItemId]"],
  );
});

function completeDraft() {
  return {
    ...structuredClone(initialExecutionCloseoutDraft),
    acceptanceNote: "Apply the reviewed Delivery closeout.",
    changedSurfaces: "Delivery closeout API.",
    completionSummary: "Delivery work is complete.",
    demoEvidence: "System demo receipt.",
    demoOutcome: "reviewed",
    demoSummary: "The completed behavior was demonstrated.",
    inspectActionItems: "No remaining closeout actions.",
    inspectSummary: "Closeout evidence was inspected.",
    testResultEvidence: "PASS: npm test",
    validationEvidence: "PASS: composed closeout proof",
    workspaceEntrant: {
      ...initialExecutionCloseoutDraft.workspaceEntrant,
      candidateRef: "delivery://candidates/console",
      candidateVersion: "candidate-v1",
      canonicalKey: "governance-console",
      name: "Governance Console",
      sourceOwnerRef: "repo://governance-operations-console",
      validationCatalogRefs: ["component-contracts"],
      validationNotes: "Validate in the owner repo.",
      validationPosture: "owner-repo-validated",
      validationWgcfGraphRole: "product-readiness-aggregate",
    },
  };
}

function closeoutOperation() {
  return {
    payload: {
      evidence: {
        changed_surfaces: "Delivery closeout API.",
        completion_summary: "Delivery work is complete.",
        demo_evidence: "System demo receipt.",
        demo_outcome: "reviewed",
        demo_summary: "The completed behavior was demonstrated.",
        evidence_refs: ["review-packet://delivery-886/final"],
        inspect_action_items: "No remaining closeout actions.",
        inspect_summary: "Closeout evidence was inspected.",
        test_result_evidence: "PASS: npm test",
        validation_evidence: "PASS: composed closeout proof",
      },
      impact: { kind: "none" },
    },
    type: "apply_closeout",
  };
}

function projection() {
  return {
    delivery_id: "delivery-886",
    last_event_ref: null,
    next_action: {
      authority: "operator-orchestration-service",
      code: "prepare_delivery_closeout",
      label: "Prepare Delivery Closeout",
    },
    outcome_history: [],
    package: {
      status: "in-progress",
      subject: "Governed Console Execution",
    },
    projected_at: "2026-08-29T00:00:00.000Z",
    projection_state: "ready",
    readiness: {
      counts: {
        blocked: 0,
        open_descendants: 0,
        weak_done_narrative: 0,
        weak_evidence: 0,
        without_evidence: 0,
        without_owner: 0,
      },
      evidence_refs: ["review-packet://delivery-886/final"],
      readiness_ref: "openproject://work_packages/886#closeout-readiness@a",
      ready_for_closing: true,
      ready_for_closeout: true,
      reasons: [],
    },
    record_ref: "openproject://work_packages/886",
    schema_version: 1,
    source_revision: revision("a"),
  };
}

function result({ commandId, replayed = false, status = "applied" }) {
  const nextAction =
    status === "partial_failure"
      ? {
          authority: "operator-orchestration-service",
          code: "reconcile_source_closeout",
          label: "Reconcile Source Closeout",
        }
      : {
          authority: "operator-orchestration-service",
          code: "inspect_delivery_outcome_history",
          label: "Inspect Delivery Outcome History",
        };
  const receipt = {
    digest: `sha256:${"c".repeat(64)}`,
    ref: `oos://delivery-closeout-receipts/${commandId}`,
  };
  const event = {
    command_digest: `sha256:${"d".repeat(64)}`,
    command_id: commandId,
    delivery_id: "delivery-886",
    effect: { closeout: { delivery_initiative: { status: "done" } } },
    event_id: `delivery-closeout-event:${commandId}:result`,
    impact: { kind: "none" },
    next_action: nextAction,
    occurred_at: "2026-08-29T00:01:00.000Z",
    operation_type: "apply_closeout",
    operator_id: "operator:console-owner",
    outcome_ref: "delivery-outcome://delivery-886/closeout",
    receipt,
    schema_version: 1,
    source_revision_after: revision("b"),
    source_revision_before: revision("a"),
    status,
  };
  return {
    after: {
      record_ref: "openproject://work_packages/886",
      source_revision: revision("b"),
    },
    before: {
      record_ref: "openproject://work_packages/886",
      source_revision: revision("a"),
    },
    command_id: commandId,
    event,
    next_action: nextAction,
    receipt,
    replayed,
    schema_version: 1,
    status,
  };
}

function revision(character) {
  return `delivery-package:sha256:${character.repeat(64)}`;
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}
