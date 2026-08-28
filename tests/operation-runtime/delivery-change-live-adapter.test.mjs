import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

import {
  assertDeliveryChangeOperation,
  assertDeliveryChangeProjection,
  assertDeliveryChangeResult,
  deliveryChangeDeliveryId,
} from "../../src/domain-workspaces/delivery/live-runtime/delivery-change-live-contract.ts";
import {
  readDeliveryChangeProjection,
  submitDeliveryChangeCommand,
} from "../../src/domain-workspaces/delivery/server/delivery-change-oos-client.ts";
import { DeliveryOosError } from "../../src/domain-workspaces/delivery/server/delivery-oos-client.ts";
import {
  buildExecutionTreeChangePlan,
  createdWorkItemId,
} from "../../src/domain-workspaces/delivery/work-model/execution/execution-tree-change-plan.ts";
import { deliveryChangeOperationForExecutionAction } from "../../src/domain-workspaces/delivery/work-model/execution/execution-change-operation.ts";

const env = {
  GOVERNANCE_CONSOLE_OPERATOR_HANDLE: "console-owner",
  GOVERNANCE_CONSOLE_OPERATOR_ID: "operator:console-owner",
  OOS_BASE_URL: "http://127.0.0.1:8080",
  OOS_CALLER_ID: "governance-operations-console",
  OOS_CALLER_SECRET: "test-only-console-secret",
};

test("case:delivery-change-source-provenance-positive reads only canonical OOS change truth", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ headers: init.headers, method: init.method, url: String(url) });
    return jsonResponse(projection());
  };

  const current = await readDeliveryChangeProjection("delivery-console-v1", {
    env,
    fetchImpl,
  });

  assert.equal(current.delivery_id, "delivery-console-v1");
  assert.deepEqual(calls, [
    {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-oos-caller-id": "governance-operations-console",
        "x-oos-caller-secret": "test-only-console-secret",
      },
      method: "GET",
      url: "http://127.0.0.1:8080/v1/delivery-initiatives/delivery-console-v1/change-control",
    },
  ]);
  assert.equal(deliveryChangeDeliveryId(886), "delivery-886");
  assert.equal(deliveryChangeDeliveryId("delivery-console-v1"), "delivery-console-v1");
});

test("case:delivery-change-end-to-end-positive constructs operator acceptance only on the server", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const body = JSON.parse(String(init.body));
    calls.push({ body, url: String(url) });
    return jsonResponse(
      result({
        commandId: body.command_id,
        operationType: body.operation.type,
        status: body.operation.type === "request_repository" ? "routed" : "applied",
      }),
      201,
    );
  };
  const repositoryRequest = {
    payload: {
      reason: "Active Delivery work now requires independent source custody.",
      suggested_repo_name: "governance-console-extension",
      work_item_id: "work-item-1029",
    },
    type: "request_repository",
  };
  const repositoryLink = {
    payload: {
      catalog_item_id: "owner-repo",
      catalog_request: {
        action: "set",
        item_id: "owner-repo",
        value: "governance-operations-console",
      },
      owner_repo: "governance-operations-console",
      work_item_id: "work-item-1029",
    },
    type: "link_repository",
  };

  await submitDeliveryChangeCommand(
    "delivery-886",
    {
      acceptanceNote: "Route repository creation to its owning operation.",
      commandId: "delivery-change-command:console-request-repo-1029",
      expectedSourceRevision: revision("a"),
      operation: repositoryRequest,
    },
    { env, fetchImpl },
  );
  await submitDeliveryChangeCommand(
    "delivery-886",
    {
      acceptanceNote: "Link the admitted owner repository through Catalog.",
      commandId: "delivery-change-command:console-link-repo-1029",
      expectedSourceRevision: revision("a"),
      operation: repositoryLink,
    },
    { env, fetchImpl },
  );

  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /\/delivery-886\/change-control\/commands$/);
  assert.deepEqual(calls[0].body.operator, {
    handle: "console-owner",
    id: "operator:console-owner",
  });
  assert.equal(calls[0].body.acceptance.decision, "apply");
  assert.equal(calls[0].body.acceptance.accepted_by, "operator:console-owner");
  assert.equal(
    calls[0].body.acceptance.note,
    "Route repository creation to its owning operation.",
  );
  assert.match(calls[0].body.acceptance.accepted_at, /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(calls[0].body.operation, repositoryRequest);
  assert.deepEqual(calls[1].body.operation, repositoryLink);
});

test("case:delivery-change-source-provenance-negative preserves conflict and exact next action", async () => {
  await assert.rejects(
    readDeliveryChangeProjection("delivery-886", {
      env,
      fetchImpl: async () =>
        jsonResponse(
          {
            code: "delivery_change_source_revision_conflict",
            details: { current_source_revision: revision("b") },
            message: "The Delivery package changed after review.",
            next_action: {
              authority: "operator-orchestration-service",
              code: "refresh_delivery_package",
              label: "Refresh Delivery Package",
            },
            retryable: false,
            schema_version: 1,
          },
          409,
        ),
    }),
    (error) =>
      error instanceof DeliveryOosError &&
      error.code === "delivery_change_source_revision_conflict" &&
      error.status === 409 &&
      error.nextAction?.label === "Refresh Delivery Package" &&
      error.details?.current_source_revision === revision("b"),
  );

  assert.throws(
    () =>
      assertDeliveryChangeProjection({
        ...projection(),
        source_revision: "fixture-v1",
      }),
    /source revision is invalid/i,
  );
  assert.throws(
    () =>
      assertDeliveryChangeOperation({
        payload: { work_item_id: "work-item-1029" },
        type: "request_repository",
      }),
    /repository request reason is invalid/i,
  );
});

test("case:delivery-change-end-to-end-negative keeps reject and rollback truthful", () => {
  const rejected = result({
    commandId: "delivery-change-command:console-rollback-1029",
    operationType: "rollback_change",
    status: "rejected",
  });
  const parsed = assertDeliveryChangeResult(rejected);

  assert.equal(parsed.status, "rejected");
  assert.equal(parsed.next_action.code, "prepare_compensating_command");
  assert.equal(parsed.event.rollback.mode, "not_supported");
});

test("case:delivery-change-tree-edit sequences revisions and parent-first additions", () => {
  const baseline = draftNode({
    children: [draftNode({ id: "node-1029", legacyWorkPackageId: 1029, title: "Original child" })],
    id: "node-886",
    legacyWorkPackageId: 886,
    title: "Delivery Epic",
  });
  const newStory = draftNode({
    children: [draftNode({ id: "node-local-task", kind: "Task", title: "Prove the child" })],
    id: "node-local-story",
    kind: "User story",
    title: "Expose the governed change",
  });
  const draft = {
    ...baseline,
    children: [
      { ...baseline.children[0], title: "Revised child" },
      newStory,
    ],
  };

  const plan = buildExecutionTreeChangePlan({ baseline, draft });
  assert.deepEqual(
    plan.map((item) => item.id),
    ["revise-1029", "add-node-local-story", "add-node-local-task"],
  );
  assert.deepEqual(plan[0].buildOperation(new Map()), {
    payload: {
      changes: { subject: "Revised child" },
      work_item_id: "work-item-1029",
    },
    type: "revise_work_item",
  });
  const createdIds = new Map([["node-local-story", "work-item-1200"]]);
  assert.equal(
    plan[2].buildOperation(createdIds).payload.parent_work_item_id,
    "work-item-1200",
  );
  assert.equal(createdWorkItemId({ work_item_id: 1200 }), null);
  assert.equal(createdWorkItemId({ work_item_id: "1200" }), "work-item-1200");

  const noteOnlyDraft = {
    ...baseline,
    children: [{ ...baseline.children[0], remark: "Operator note only" }],
  };
  assert.deepEqual(
    buildExecutionTreeChangePlan({ baseline, draft: noteOnlyDraft }),
    [],
  );
});

test("case:delivery-change-action-routing maps blocker and parking actions to OOS operations", () => {
  const clearBlocker = deliveryChangeOperationForExecutionAction(
    actionSubmission("clear-blocker", { resume_status: "in-progress" }),
  );
  const park = deliveryChangeOperationForExecutionAction(
    actionSubmission("defer", {
      park_reason: "Awaiting an external decision.",
      park_review_date: "2026-09-15",
    }),
  );

  assert.deepEqual(clearBlocker, {
    payload: {
      action: "clear",
      resume_status: "in-progress",
      work_item_id: "work-item-1029",
    },
    type: "manage_blocker",
  });
  assert.equal(park.type, "manage_parking");
  assert.equal(park.payload.action, "park");
});

test("case:delivery-change-browser-boundary never holds OOS or OpenProject authority", () => {
  const sources = [
    "../../src/domain-workspaces/delivery/live-runtime/use-delivery-change-live-runtime.ts",
    "../../src/domain-workspaces/delivery/presentation/surfaces/execution-board/execution-board-surface.tsx",
    "../../src/domain-workspaces/delivery/presentation/surfaces/execution-board/execution-tree-change-review-dialog.tsx",
  ].map((path) => readFileSync(new URL(path, import.meta.url), "utf8"));

  for (const source of sources) {
    assert.doesNotMatch(source, /OOS_CALLER_SECRET/);
    assert.doesNotMatch(source, /x-oos-caller-secret/i);
    assert.doesNotMatch(source, /openproject:\/\//i);
    assert.doesNotMatch(source, /\/v1\/delivery-initiatives/);
  }
  assert.match(sources[0], /expectedSourceRevision/);
  assert.match(sources[0], /delivery-change-command:console-/);
  assert.match(sources[1], /mode === "disconnected-preview"/);
  assert.match(sources[1], /mode !== "live"/);
  assert.match(sources[1], /onOpenCatalog/);
  assert.doesNotMatch(sources[1], /recordLocalDeliveryExecutionAction/);
});

test("Delivery execution API routes share one Next dynamic segment identity", () => {
  const routeRoot = new URL(
    "../../src/app/api/delivery/execution/",
    import.meta.url,
  );
  assert.deepEqual(
    readdirSync(routeRoot)
      .filter((entry) => entry.startsWith("["))
      .sort(),
    ["[workItemId]"],
  );
});

function actionSubmission(actionType, operatorPayload) {
  return {
    action: { action_type: actionType, enabled: true, label: actionType, tone: "warn" },
    applyIntent: {
      operator_payload: operatorPayload,
      source_epic_id: 886,
      target_work_item_id: 1029,
    },
  };
}

function draftNode({
  children = [],
  id,
  kind = "Feature",
  legacyWorkPackageId = null,
  title,
}) {
  return {
    backendStatus: "new",
    children,
    description: "",
    draftBody: "",
    id,
    kind,
    legacyWorkPackageId,
    metadataStatus: "complete",
    remark: legacyWorkPackageId === null ? "" : `WP #${legacyWorkPackageId}`,
    title,
    tone: "info",
  };
}

function projection() {
  return {
    delivery_id: "delivery-console-v1",
    last_event_ref: null,
    package: {
      dependency_relations: [],
      execution_tree: {
        children: [],
        id: 886,
        record_ref: "openproject://work_packages/886",
        status: "in-progress",
        subject: "Governed Delivery initiative",
        type: "Epic",
      },
    },
    projected_at: "2026-08-29T00:00:00.000Z",
    projection_state: "current",
    record_ref: "openproject://work_packages/886",
    schema_version: 1,
    source_revision: revision("a"),
  };
}

function result({ commandId, operationType, status }) {
  const nextAction =
    status === "routed"
      ? {
          authority: "governance-operations-console/repository-operation",
          code: "open_repository_operation",
          label: "Open Repository Operation",
        }
      : status === "rejected"
        ? {
            authority: "operator-orchestration-service",
            code: "prepare_compensating_command",
            label: "Prepare Compensating Command",
          }
        : {
            authority: "operator-orchestration-service",
            code: "refresh_delivery_package",
            label: "Refresh Delivery Package",
          };
  const receipt = {
    digest: `sha256:${"c".repeat(64)}`,
    ref: `oos://delivery-change-receipts/${commandId}`,
  };
  return {
    after: {
      record_ref: "openproject://work_packages/886",
      source_revision: status === "applied" ? revision("b") : revision("a"),
    },
    before: {
      record_ref: "openproject://work_packages/886",
      source_revision: revision("a"),
    },
    command_id: commandId,
    event: {
      command_digest: `sha256:${"d".repeat(64)}`,
      command_id: commandId,
      delivery_id: "delivery-886",
      effect: operationType === "add_work_item" ? { work_item_id: "1200" } : {},
      event_id: `delivery-change-event:${commandId}:result`,
      next_action: nextAction,
      occurred_at: "2026-08-29T00:01:00.000Z",
      operation_type: operationType,
      operator_id: "operator:console-owner",
      receipt,
      rollback:
        status === "rejected"
          ? { mode: "not_supported", reason: "Use a compensating command." }
          : { mode: "compensating_command_required", reason: "Review first." },
      schema_version: 1,
      source_revision_after:
        status === "applied" ? revision("b") : revision("a"),
      source_revision_before: revision("a"),
      status,
    },
    next_action: nextAction,
    receipt,
    replayed: false,
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
