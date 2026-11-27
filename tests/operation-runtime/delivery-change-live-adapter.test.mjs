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
import { applyPIPlanningEpic } from "../../src/domain-workspaces/delivery/live-runtime/pi-planning-change.ts";
import { DeliveryOosError } from "../../src/domain-workspaces/delivery/server/delivery-oos-client.ts";
import {
  buildExecutionTreeChangePlan,
  createdWorkItemId,
  executionCreationPlanningChoices,
  executionTreeChildKinds,
  executionTreePlanningInputIssues,
} from "../../src/domain-workspaces/delivery/work-model/execution/execution-tree-change-plan.ts";
import { deliveryChangeOperationForExecutionAction } from "../../src/domain-workspaces/delivery/work-model/execution/execution-change-operation.ts";
import {withExecutionTreeDependencies,executionDependencyIssues} from "../../src/domain-workspaces/delivery/work-model/execution/execution-tree-dependencies.ts";
import {
  assertCanonicalSourceRequest,
  canonicalSourceResponse,
  consoleSourceProjectionMediaType,
} from "../support/console-source-projection.mjs";

const env = {
  GOVERNANCE_CONSOLE_OPERATOR_HANDLE: "console-owner",
  GOVERNANCE_CONSOLE_OPERATOR_ID: "operator:console-owner",
  OOS_BASE_URL: "http://127.0.0.1:8080",
  OOS_CALLER_ID: "governance-operations-console",
  OOS_CALLER_SECRET: "test-only-console-secret",
};

test("canonical change readback preserves description text and rejects malformed narratives", async () => {
  const native=projection();
  native.delivery_id="delivery-886";
  const result=await readDeliveryChangeProjection("delivery-886",{env,fetchImpl:async()=>canonicalSourceResponse(native,{recordRef:"openproject://work_packages/886",sourceOwner:"workspace-delivery-art"})});
  assert.equal(result.package.execution_tree.description,native.package.execution_tree.description);
  assert.throws(()=>assertDeliveryChangeProjection({...native,package:{...native.package,execution_tree:{...native.package.execution_tree,description:23}}}),/description/);
});

const dependencyNode=(id,refs=[])=>({id:`node-${id}`,legacyWorkPackageId:id,kind:"User story",title:`Work ${id}`,draftBody:"Original narrative",remark:"",children:[],dependsOnIds:refs});
test("dependency editing preserves native external links and does not rewrite unchanged lag or notes",()=>{
 const tree={...dependencyNode(1),kind:"Epic",children:[dependencyNode(2),dependencyNode(3)]};
 const relation={relation_type:"follows",depends_on:{id:900,subject:"External prerequisite"},target:{id:2},lag:4,description:"Keep original supporting note"};
 const baseline=withExecutionTreeDependencies(tree,[relation]);
 assert.deepEqual(baseline.children[0].dependsOnIds,["work-item-900"]);
 assert.deepEqual(buildExecutionTreeChangePlan({baseline,draft:structuredClone(baseline)}),[]);
 const draft=structuredClone(baseline);draft.children[0].dependsOnIds.push("work-item-3");
 const operations=buildExecutionTreeChangePlan({baseline,draft}).map(item=>item.buildOperation(new Map()));
 assert.deepEqual(operations,[{type:"manage_dependency",payload:{action:"set",target_work_item_id:"work-item-2",depends_on_work_item_id:"work-item-3"}}]);
 assert.equal(Object.hasOwn(operations[0].payload,"lag"),false);
 assert.equal(Object.hasOwn(operations[0].payload,"description"),false);
 assert.throws(()=>withExecutionTreeDependencies(tree,[{depends_on:{id:"900"},target:{id:2}}]),/no links were discarded/);
});
test("dependency replacements clear old links before additions and reject self links, cycles and deleted local prerequisites",()=>{
 const baseline={...dependencyNode(1),children:[dependencyNode(2,["work-item-3"]),dependencyNode(3)]};
 const draft=structuredClone(baseline);draft.children[0].dependsOnIds=[];draft.children[1].dependsOnIds=["work-item-2"];
 const ops=buildExecutionTreeChangePlan({baseline,draft}).map(item=>item.buildOperation(new Map()));
 assert.deepEqual(ops.map(op=>op.payload.action),["clear","set"]);
 assert.deepEqual(executionDependencyIssues(draft),[]);
 draft.children[0].dependsOnIds=["work-item-2"];
 assert.match(executionDependencyIssues(draft).join(),/itself/);
 draft.children[0].dependsOnIds=["work-item-3"];
 assert.match(executionDependencyIssues(draft).join(),/cycle/);
 draft.children[0].dependsOnIds=["deleted-local-node"];
 assert.match(executionDependencyIssues(draft).join(),/removed from this draft/);
});
test("new dependent and prerequisite identities resolve only after their creation commands",()=>{
 const baseline={...dependencyNode(1),kind:"Epic"};
 const first={...dependencyNode(null),id:"first-local",title:"First new work"},second={...dependencyNode(null),id:"second-local",title:"Second new work",dependsOnIds:["first-local"]};
 const plan=buildExecutionTreeChangePlan({baseline,draft:{...baseline,children:[first,second]}});
 assert.deepEqual(plan.map(item=>item.buildOperation===undefined),[false,false,false]);
 assert.equal(plan[0].buildOperation(new Map()).type,"add_work_item");
 assert.equal(plan[1].buildOperation(new Map()).type,"add_work_item");
 assert.throws(()=>plan[2].buildOperation(new Map()),/Create the prerequisite/);
 assert.deepEqual(plan[2].buildOperation(new Map([["first-local","work-item-101"],["second-local","work-item-102"]])),{type:"manage_dependency",payload:{action:"set",target_work_item_id:"work-item-102",depends_on_work_item_id:"work-item-101"}});
});

test("execution add actions match canonical parent rules and expose a real Epic-level PI Objective", () => {
  assert.deepEqual(executionTreeChildKinds("Epic"), ["PI Objective", "Feature", "Risk", "Milestone", "Defect"]);
  assert.deepEqual(executionTreeChildKinds("Feature"), ["User story", "Defect"]);
  assert.deepEqual(executionTreeChildKinds("User story"), ["Task", "Defect"]);
  assert.deepEqual(executionTreeChildKinds("Defect"), ["Task"]);
  for (const kind of ["PI Objective", "Task", "Risk", "Milestone"]) {
    assert.deepEqual(executionTreeChildKinds(kind), []);
  }
  const root = {id:"epic",legacyWorkPackageId:1306,kind:"Epic",title:"Existing product",draftBody:"",remark:"",children:[]};
  const objective = {id:"objective-local",legacyWorkPackageId:null,kind:"PI Objective",title:"Deliver the actual app",draftBody:"Real operator outcome",remark:"",targetPi:"PI-2026-04",iteration:"PI-2026-04 / Iteration 1",children:[]};
  const plan = buildExecutionTreeChangePlan({baseline:root,draft:{...root,children:[objective]}});
  assert.equal(plan.length, 1);
  const operation = plan[0].buildOperation(new Map());
  assertDeliveryChangeOperation(operation);
  assert.equal(operation.type, "add_work_item");
  assert.equal(operation.payload.type, "PI Objective");
  assert.equal(operation.payload.parent_work_item_id, "work-item-1306");
  assert.equal(operation.payload.target_pi, "PI-2026-04");
  assert.equal(operation.payload.iteration, "PI-2026-04 / Iteration 1");
  const choices = new Map([["PI-2026-04", [{ value: "PI-2026-04 / Iteration 1" }]]]);
  assert.deepEqual(executionTreePlanningInputIssues({...root,children:[objective]}, choices), []);
});

test("inline creation captures native planning requirements without inventing Ready authority", () => {
  const root = {id:"root",legacyWorkPackageId:1306,kind:"Epic",title:"Product",draftBody:"",remark:"",children:[]};
  const child = {id:"new",legacyWorkPackageId:null,kind:"PI Objective",title:"Outcome",draftBody:"",remark:"",children:[]};
  const pi = "PI-2027-01";
  const key = `${pi} / Iteration 1`;
  const choices = executionCreationPlanningChoices([
    { catalog_item_id: "catalog-target-pi", value_key: pi, lifecycle_state: "active" },
    { catalog_item_id: "catalog-pi-planning-date", value_key: "2027-01-11/2027-01-24",
      parent_catalog_value_key: pi, lifecycle_state: "read_only" },
    { catalog_item_id: "catalog-iteration", value_key: key, parent_catalog_value_key: pi, lifecycle_state: "active",
      iteration_window: { sequence: 1, start_date: "2027-01-11", end_date: "2027-01-24" } },
    { catalog_item_id: "catalog-iteration", value_key: `${pi} / Iteration 2`, parent_catalog_value_key: pi, lifecycle_state: "active" },
    { catalog_item_id: "catalog-iteration", value_key: "Program-wide / Continuous", lifecycle_state: "active" },
  ]);
  for (const kind of ["PI Objective", "Task", "Milestone"]) {
    assert.match(executionTreePlanningInputIssues({...root,children:[{...child,kind}]}, choices).join(), /Choose a Target PI/);
    assert.match(executionTreePlanningInputIssues({...root,targetPi:pi,children:[{...child,kind}]}, choices).join(), /Choose a saved iteration/);
    assert.deepEqual(executionTreePlanningInputIssues({...root,targetPi:pi,children:[{...child,kind,iteration:key}]}, choices), []);
    assert.deepEqual(executionTreePlanningInputIssues({...root,targetPi:pi,children:[{...child,kind,iteration:"Program-wide / Continuous"}]}, choices), []);
  }
  assert.match(executionTreePlanningInputIssues({...root,children:[{...child,targetPi:pi,iteration:`${pi} / Iteration 2`}]}, choices).join(), /Choose a saved iteration/);
  assert.match(executionTreePlanningInputIssues({...root,targetPi:pi,children:[{...child,kind:"Feature"}]}, choices).join(), /reviewed initiative plan/);
  for (const kind of ["Feature", "User story", "Defect", "Risk"]) {
    assert.deepEqual(executionTreePlanningInputIssues({...root,children:[{...child,kind}]}), []);
  }
  const committed = buildExecutionTreeChangePlan({baseline:root,draft:{...root,children:[{...child,targetPi:" PI-A ",iteration:" PI-A / Iteration 1 "}]}})[0];
  const payload = committed.buildOperation(new Map()).payload;
  assert.equal(payload.target_pi, "PI-A");
  assert.equal(payload.iteration,"PI-A / Iteration 1");
  assert.equal(Object.hasOwn(payload,"status"),false);
  assert.match(committed.label,/Target PI: PI-A; Iteration: PI-A \/ Iteration 1/);
});

test("case:delivery-change-source-provenance-positive reads only canonical OOS change truth", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ headers: init.headers, method: init.method, url: String(url) });
    assertCanonicalSourceRequest(init);
    return canonicalSourceResponse(projection(), {
      recordRef: "openproject://work_packages/console-v1",
      sourceOwner: "workspace-delivery-art",
    });
  };

  const current = await readDeliveryChangeProjection("delivery-console-v1", {
    env,
    fetchImpl,
  });

  assert.equal(current.delivery_id, "delivery-console-v1");
  assert.deepEqual(calls, [
    {
      headers: {
        Accept: consoleSourceProjectionMediaType,
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
  await submitDeliveryChangeCommand(
    "delivery-886",
    {
      acceptedAt: "2026-08-29T00:00:00.000Z",
      acceptanceNote: "Route repository creation to its owning operation.",
      commandId: "delivery-change-command:console-request-repo-1029",
      expectedSourceRevision: revision("a"),
      operation: repositoryRequest,
    },
    { env, fetchImpl },
  );
  assert.equal(calls.length, 1);
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
  const [noteChange] = buildExecutionTreeChangePlan({ baseline, draft: noteOnlyDraft });
  assert.deepEqual(noteChange.buildOperation(new Map()), {
    type: "revise_work_item",
    payload: { work_item_id: "work-item-1029", changes: {}, work_note: "Operator note only" },
  });
  const [newNote] = buildExecutionTreeChangePlan({
    baseline, draft: { ...baseline, children: [...baseline.children, { ...newStory, children: [], remark: "Retain creation context" }] },
  });
  assert.equal(newNote.buildOperation(new Map()).payload.work_note, "Retain creation context");
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
        description: "## Existing narrative\nPreserve Unicode — text and operator notes.",
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

test("PI planning reads the original operation after a lost response without applying it twice", async t => {
  const commandId = "delivery-change-command:console-apply_pi_plan-reconcile-886";
  const storage = new Map();
  const originalWindow = globalThis.window;
  globalThis.window = {
    sessionStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key),
    },
  };
  t.after(() => {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  });
  const terminal = result({ commandId, operationType: "apply_pi_plan", status: "applied" });
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, init = {}) => {
    calls.push({ method: init.method ?? "GET", url });
    if (init.method === "POST") return Response.json({ error: "Reply lost" }, { status: 502 });
    assert.deepEqual([...storage.values()].map(JSON.parse), [{ kind: "change-control", target: "delivery-886", commandId }]);
    assert.equal(url, `/api/delivery/execution/delivery-886/change-control/commands/${encodeURIComponent(commandId)}`);
    return Response.json({ state: "completed", result: terminal });
  });
  let checking = 0;
  const applied = await applyPIPlanningEpic(886, JSON.stringify({ commandId }), "PI-2026-04", () => { checking += 1; });
  assert.equal(checking, 1);
  assert.equal(applied.receipt.digest, terminal.receipt.digest);
  assert.deepEqual(calls.map(call => call.method), ["POST", "GET"]);
  assert.equal(storage.size, 0);
});
