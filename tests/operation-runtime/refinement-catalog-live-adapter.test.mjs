import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  applyRefinementDraft,
  bindCatalogRepositoryReadiness,
  buildCatalogMutationRequest,
  mutateCatalogValue,
  readCatalogProjection,
  readRefinementProjection,
  readRefinementRun,
  requestRefinementAdvice,
} from "../../src/domain-workspaces/delivery/server/refinement-catalog-oos-client.ts";
import { DeliveryOosError } from "../../src/domain-workspaces/delivery/server/delivery-oos-client.ts";
import { refinementHistoryReceiptRows, refinementHistoryTimelineRows, refinementHistoryViewProjection } from "../../src/domain-workspaces/delivery/presentation/workflows/refinement/view-model/refinement-history-model.ts";
import { refinementHubViewProjection, refinementHubStatusSummary } from "../../src/domain-workspaces/delivery/presentation/workflows/refinement/view-model/refinement-hub-model.ts";
import {
  assertRefinementApplyCommand,
  refinementPacketFromProjection,
} from "../../src/domain-workspaces/delivery/live-runtime/refinement-live-contract.ts";
import {
  assertCatalogMutationRequest,
  catalogReadModelFromProjection,
} from "../../src/domain-workspaces/delivery/live-runtime/catalog-live-contract.ts";
import {
  assertCanonicalSourceRequest,
  canonicalSourceResponse,
} from "../support/console-source-projection.mjs";

const env = {
  GOVERNANCE_CONSOLE_OPERATOR_HANDLE: "Console Owner",
  GOVERNANCE_CONSOLE_OPERATOR_ID: "operator:console-owner",
  OOS_BASE_URL: "http://127.0.0.1:8080",
  OOS_CALLER_ID: "governance-operations-console",
  OOS_CALLER_SECRET: "test-only-server-secret",
};

test("case:refinement-live-positive reads, advises, applies, and polls canonical OOS truth", async (t) => {
  const deadlines = [];
  t.mock.method(AbortSignal, "timeout", (ms) => { deadlines.push(ms); return new AbortController().signal; });
  const projection = refinementProjection();
  const calls = [];
  const fetchImpl = async (url, init) => {
    const request = {
      body: init.body ? JSON.parse(String(init.body)) : null,
      method: init.method,
      url: String(url),
    };
    calls.push(request);
    if (request.url.includes("/assist")) {
      return jsonResponse(refinementAssistResult(request.body));
    }
    if (request.url.includes("/apply")) {
      return jsonResponse(refinementRun(request.body));
    }
    if (request.url.includes("/runs/")) {
      assertCanonicalSourceRequest(init);
      return canonicalSourceResponse(refinementRun(), {
        recordRef: "delivery-package://delivery-package:846",
        sourceOwner: "workspace-delivery-art",
        sourceRef: `oos://v1/delivery-refinement/delivery-package%3A846/runs/${encodeURIComponent(refinementRun().run_id)}`,
      });
    }
    assertCanonicalSourceRequest(init);
    return canonicalSourceResponse(projection, {
      recordRef: "openproject://work_packages/846",
      sourceOwner: "workspace-delivery-art",
    });
  };

  const read = await readRefinementProjection("delivery-package:846", {
    env,
    fetchImpl,
  });
  const advice = await requestRefinementAdvice(
    "delivery-package:846",
    read,
    refinementAssistCommand(),
    { env, fetchImpl },
  );
  const apply = await applyRefinementDraft(
    "delivery-package:846",
    read,
    refinementApplyCommand(),
    { env, fetchImpl },
  );
  const polled = await readRefinementRun("delivery-package:846", apply.run_id, {
    env,
    fetchImpl,
  });
  await requestRefinementAdvice("delivery-package:846", read,
    refinementAssistCommand(), { env, fetchImpl });
  assert.notEqual(calls[4].body.request_id, calls[1].body.request_id,
    "each explicit advice call is distinct from canonical apply retry identity");
  assert.notEqual(calls[4].body.correlation_id, calls[1].body.correlation_id);
  assert.deepEqual(calls[4].body.target, calls[1].body.target);
  assert.deepEqual(deadlines, [12_000, 180_000, 12_000, 12_000, 180_000],
    "only synchronous model advice gets the long budget; reads and async acknowledgement remain short");
  const packet = refinementPacketFromProjection({
    ...read,
    latest_run: polled,
  });

  assert.equal(read.packet.packet_revision, "packet-version-3");
  assert.equal(advice.suggestion.value, "PI-2026-04");
  assert.equal(apply.receipt.receipt_id, "refinement-receipt:846");
  assert.equal(packet.receipt.receipt_id, "refinement-receipt:846");
  assert.match(calls[0].url, /source_ref=openproject%3A%2F%2Fwork_packages%2F846$/);
  assert.equal(calls[1].body.operator.id, "operator:console-owner");
  assert.equal(calls[2].body.acceptance.decision, "apply");
  assert.equal(
    apply.receipt.accepted_draft_digest,
    calls[2].body.accepted_draft.draft_digest,
  );
  assert.equal(
    calls[2].body.accepted_draft.metadata_values["target_pi:846"],
    "PI-2026-04",
  );
  assert.equal(
    calls[2].body.accepted_draft.metadata_resolutions["target_pi:846"],
    "accepted",
  );
});

test("Refinement run polling retains native package/route authority in running and cold completed reads", async () => {
  for (const state of ["running", "completed"]) {
    const run = refinementRun();
    if (state === "running") {run.state = state;run.receipt = null;}
    const result = await readRefinementRun("delivery-package:846", run.run_id, {env,fetchImpl:async(_url, init)=>{
      assertCanonicalSourceRequest(init);
      return canonicalSourceResponse(run, {
        recordRef:"delivery-package://delivery-package:846",sourceOwner:"workspace-delivery-art",
        sourceRef:`oos://v1/delivery-refinement/delivery-package%3A846/runs/${encodeURIComponent(run.run_id)}`,
      });
    }});
    assert.equal(result.state,state);
    if (state === "completed") assert.equal(result.receipt.receipt_id,"refinement-receipt:846");
  }
});

test("Refinement run polling rejects foreign authority, package, route, run, poll path and receipt", async () => {
  const runId = refinementRun().run_id;
  for (const change of [
    ({binding})=>{binding.authority="foreign-owner";},
    ({binding})=>{binding.sourceOwner="foreign-owner";},
    ({binding})=>{binding.recordRef="delivery-package://delivery-package:999";},
    ({binding})=>{binding.recordRef="openproject://work_packages/846";},
    ({binding})=>{binding.sourceRef="oos://v1/delivery-refinement/delivery-package%3A999/runs/refinement-run%3A846";},
    ({run})=>{run.run_id="refinement-run:999";},
    ({run})=>{run.poll_ref="/v1/delivery-refinement/delivery-package:999/runs/refinement-run:846";},
    ({run})=>{run.poll_ref="/v1/delivery-refinement/delivery-package:846/runs/refinement-run:999";},
    ({run})=>{run.receipt.run_id="refinement-run:999";},
    ({run})=>{run.receipt.target.delivery_ref="openproject://work_packages/999";},
  ]) {
    const candidate={run:refinementRun(),binding:{recordRef:"delivery-package://delivery-package:846",sourceOwner:"workspace-delivery-art",sourceRef:`oos://v1/delivery-refinement/delivery-package%3A846/runs/${encodeURIComponent(runId)}`}};
    change(candidate);
    await assert.rejects(readRefinementRun("delivery-package:846",runId,{env,fetchImpl:async()=>canonicalSourceResponse(candidate.run,candidate.binding)}));
  }
});

test("Refinement read-only history does not invent a same-operator gate", async () => {
  const run=refinementRun();run.receipt.applied_by="operator:another-authorized-operator";
  const result=await readRefinementRun("delivery-package:846",run.run_id,{env,fetchImpl:async()=>canonicalSourceResponse(run,{recordRef:"delivery-package://delivery-package:846",sourceOwner:"workspace-delivery-art",sourceRef:`oos://v1/delivery-refinement/delivery-package%3A846/runs/${encodeURIComponent(run.run_id)}`})});
  assert.equal(result.receipt.applied_by,"operator:another-authorized-operator");
});

test("canonical Refinement recovery preserves native receipt provenance, event times and completed status", () => {
  const run=refinementRun();
  const packet=refinementPacketFromProjection({...refinementProjection(),active_run:null,latest_run:run,history:[run]});
  const recordedReceipt=packet.receipt;
  assert.equal(recordedReceipt.canonical_evidence.receipt_ref,run.receipt.receipt_ref);
  assert.equal(recordedReceipt.canonical_evidence.receipt_digest,run.receipt.receipt_digest);
  assert.equal(recordedReceipt.canonical_evidence.accepted_draft_digest,run.receipt.accepted_draft_digest);
  assert.equal(recordedReceipt.canonical_evidence.applied_by,run.receipt.applied_by);
  assert.equal(recordedReceipt.canonical_evidence.source_revision,run.receipt.target.source_revision);
  const history=refinementHistoryViewProjection(recordedReceipt);
  assert.match(history.receiptDescription,/Canonical OOS/);
  assert.equal(history.packetTimeLabel,"Source Handoff Recorded");
  assert.match(history.packetTimeDescription,/not Refinement completion/);
  assert.doesNotMatch(history.receiptDescription,/local receipt/);
  const rows=refinementHistoryReceiptRows({packet,recordedReceipt});
  for (const value of [run.receipt.receipt_ref,run.receipt.receipt_digest,run.receipt.accepted_draft_digest,run.run_id,run.receipt.applied_by,run.receipt.target.source_revision]) {
    assert.ok(rows.some(row=>row.value===value));
  }
  assert.doesNotMatch(rows.map(row=>row.detail).join(" "),/local prototype|Local immutable/);
  const events=refinementHistoryTimelineRows({packet,recordedReceipt});
  assert.deepEqual(events.map(event=>event.timestamp),run.events.map(event=>event.recorded_at));
  assert.deepEqual(events.map(event=>event.detail),run.events.map(event=>event.message));
  const deliveryPackage={delivery_package_id:"delivery-package:846",workflow_phase:"refinement",package_posture:"New",tone:"info",source_ref:"openproject://work_packages/846"};
  const hub=refinementHubViewProjection({activeReceipt:recordedReceipt,deliveryPackage,hubAction:null,metadataReady:true,packet});
  assert.equal(hub.statusTitle,"Receipt Recorded");
  assert.equal(hub.statusLabel,"receipt recorded");
  assert.equal(hub.statusFacts.find(row=>row.label==="Applied At").value,run.receipt.applied_at);
  assert.match(hub.statusDescription,/canonical OOS/);
  assert.doesNotMatch(hub.statusDescription,/before submitting|local Refinement/);
  assert.match(refinementHubStatusSummary({activeReceipt:recordedReceipt,deliveryPackage,metadataReady:true,packet:{...packet,receipt:null}}),/canonical OOS/);
  const view=readFileSync(new URL("../../src/domain-workspaces/delivery/presentation/workflows/refinement/hub/refinement-hub-view.tsx",import.meta.url),"utf8");
  assert.match(view,/statusLabel=\{hubProjection.statusLabel\}/);
});

test("Refinement preview and absent receipts never acquire canonical evidence", () => {
  const packet=refinementPacketFromProjection({...refinementProjection(),active_run:null,latest_run:null,history:[]});
  assert.equal(packet.receipt,null);
  const local={...refinementRun().receipt,canonical_evidence:undefined,receipt_id:"local-preview",lines:["Preview"],tone:"ok",outcome:"accepted"};
  assert.match(refinementHistoryViewProjection(local).receiptDescription,/local receipt archive/);
  assert.ok(refinementHistoryReceiptRows({packet,recordedReceipt:local}).some(row=>/local prototype/.test(row.detail)));
  assert.equal(refinementHistoryReceiptRows({packet,recordedReceipt:null}).some(row=>row.label==="Durable Receipt"),false);
  assert.equal(refinementHistoryReceiptRows({packet,recordedReceipt:local}).some(row=>row.label==="Durable Receipt"),false);
});

test("case:catalog-live-positive reads, mutates, and maps canonical readback", async () => {
  const projection = catalogProjection();
  const calls = [];
  const fetchImpl = async (url, init) => {
    const body = init.body ? JSON.parse(String(init.body)) : null;
    calls.push({ body, url: String(url) });
    if (String(url).includes("/mutations")) {
      return jsonResponse(catalogMutationResult(body));
    }
    assertCanonicalSourceRequest(init);
    return canonicalSourceResponse(projection, {
      recordRef: "openproject://projects/workspace-delivery-art",
      sourceOwner: "workspace-delivery-art",
    });
  };

  const read = await readCatalogProjection({ env, fetchImpl });
  const result = await mutateCatalogValue(
    "catalog-owner-repo",
    read,
    catalogMutationCommand(),
    { env, fetchImpl },
  );
  const model = catalogReadModelFromProjection(read);

  assert.equal(model.source_revision, "catalog-version-9");
  assert.equal(model.items[0].tone, "warn");
  assert.equal(result.readback_complete, true);
  assert.equal(calls[1].body.source_revision, "catalog-version-9");
  assert.equal(
    calls[1].body.draft.repository_binding.receipt.issuer,
    "workspace-governance-control-fabric",
  );
  assert.equal(calls[1].body.acceptance.accepted_by, "operator:console-owner");
});

test("case:catalog-readiness-positive prepares the first Owner Repo binding through OOS", async () => {
  const command = catalogMutationCommand();
  command.repositoryReadiness = null;
  const calls = [];
  const prepared = await bindCatalogRepositoryReadiness(command, {
    env,
    fetchImpl: async (url, init) => {
      calls.push({
        body: JSON.parse(String(init.body)),
        method: init.method,
        url: String(url),
      });
      return jsonResponse({
        repository_readiness_reference: repositoryReadiness(),
        schema_version: 1,
      });
    },
  });

  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/v1\/delivery-catalog\/repository-readiness$/);
  assert.equal(calls[0].method, "POST");
  assert.deepEqual(calls[0].body, {
    repo_name: "operator-orchestration-service",
    schema_version: 1,
  });
  assert.equal(
    prepared.repositoryReadiness.receipt.uri,
    repositoryReadiness().receipt.uri,
  );
});

test("case:catalog-idempotency scopes retries to one operator acceptance", () => {
  const command = catalogMutationCommand();
  const first = buildCatalogMutationRequest(
    "catalog-owner-repo",
    catalogProjection(),
    command,
    { env },
  );
  const retry = buildCatalogMutationRequest(
    "catalog-owner-repo",
    catalogProjection(),
    command,
    { env },
  );
  const laterAcceptance = buildCatalogMutationRequest(
    "catalog-owner-repo",
    catalogProjection(),
    { ...command, acceptanceId: "catalog-acceptance:owner-repo-later" },
    { env },
  );

  assert.equal(retry.idempotency_key, first.idempotency_key);
  assert.notEqual(laterAcceptance.idempotency_key, first.idempotency_key);
});

test("case:refinement-catalog-negative rejects stale identity, missing readiness, and unsafe browser authority", async () => {
  const mismatchedProjection = refinementProjection();
  mismatchedProjection.packet.source.source_ref =
    "openproject://work_packages/999";
  await assert.rejects(
    readRefinementProjection("delivery-package:846", {
      env,
      fetchImpl: async (_url, init) => {
        assertCanonicalSourceRequest(init);
        return canonicalSourceResponse(mismatchedProjection, {
          recordRef: "openproject://work_packages/846",
          sourceOwner: "workspace-delivery-art",
        });
      },
    }),
    /different source/i,
  );

  const command = catalogMutationCommand();
  command.repositoryReadiness = null;
  await assert.rejects(
    mutateCatalogValue("catalog-owner-repo", catalogProjection(), command, {
      env,
      fetchImpl: async () => {
        throw new Error("OOS must not be called without readiness evidence.");
      },
    }),
    (error) =>
      error instanceof DeliveryOosError &&
      error.code === "catalog_repository_readiness_required" &&
      error.status === 409,
  );

  await assert.rejects(
    mutateCatalogValue(
      "catalog-owner-repo",
      catalogProjection(),
      catalogMutationCommand(),
      {
        env,
        fetchImpl: async (_url, init) => {
          const request = JSON.parse(String(init.body));
          const result = catalogMutationResult(request);
          result.value.catalog_item_id = "catalog-target-pi";
          return jsonResponse(result);
        },
      },
    ),
    (error) =>
      error instanceof DeliveryOosError &&
      error.code === "catalog_mutation_mismatch" &&
      error.status === 502,
  );

  assert.throws(
    () =>
      assertRefinementApplyCommand({
        ...refinementApplyCommand(),
        metadataResolutions: { "target_pi:846": "invented" },
      }),
    /metadata resolutions is invalid/i,
  );
  assert.throws(
    () =>
      assertCatalogMutationRequest({
        ...catalogMutationCommand(),
        draft: { label: "Incomplete" },
      }),
    /mutation description is invalid/i,
  );

  for (const relativePath of [
    "../../src/domain-workspaces/delivery/live-runtime/use-refinement-live-runtime.ts",
    "../../src/domain-workspaces/delivery/live-runtime/use-catalog-live-runtime.ts",
  ]) {
    const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
    assert.doesNotMatch(source, /OOS_CALLER_SECRET/);
    assert.doesNotMatch(source, /openproject.*(?:POST|PATCH|PUT|DELETE)/is);
    assert.match(source, /disconnected-preview/);
  }

  const controllerSource = readFileSync(
    new URL(
      "../../src/domain-workspaces/delivery/presentation/workflows/refinement/session-controller/use-refinement-session-controller.ts",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(controllerSource, /projectionStatus === "current"/);
  assert.match(controllerSource, /mode === "disconnected-preview"/);
});

function refinementAssistCommand() {
  return {
    allowedValues: ["PI-2026-03", "PI-2026-04"],
    draftValue: "PI-2026-03",
    fieldKey: "target_pi",
    fieldKind: "select",
    fieldLabel: "Target PI",
    operatorPrompt: "Check the next delivery window.",
    required: true,
    selectedNodeIds: ["846"],
    sourceValue: "PI-2026-03",
  };
}

function refinementApplyCommand() {
  return {
    acceptanceId: "refinement-acceptance:846",
    acceptedAt: "2026-08-26T08:00:00.000Z",
    applyPlan: refinementPacket().apply_plan,
    metadataResolutions: { "target_pi:846": "accepted" },
    metadataValues: { "target_pi:846": "PI-2026-04" },
    note: "Apply reviewed metadata.",
  };
}

function refinementProjection() {
  return {
    active_run: null,
    history: [],
    latest_run: null,
    package_ref: "delivery-package:846",
    packet: refinementPacket(),
    projected_at: "2026-08-26T08:00:00.000Z",
    schema_version: 1,
    source_revision: "version-21",
  };
}

function refinementPacket() {
  return {
    active_step: "metadata_draft",
    apply_plan: {
      expected_routes: ["/v1/delivery/846/plan/apply"],
      operations: [
        {
          detail: "Update the reviewed Target PI.",
          kind: "plan_apply",
          label: "Apply Target PI",
          operation_id: "apply-target-pi",
          oos_route: "/v1/delivery/846/plan/apply",
          status: "planned",
          target: "delivery-846",
        },
      ],
      summary: "Apply reviewed Refinement metadata.",
    },
    draft_groups: [
      {
        fields: [
          {
            allowed_values: ["PI-2026-03", "PI-2026-04"],
            backend_field: "target_pi",
            field_key: "target_pi",
            field_kind: "select",
            label: "Target PI",
            required: true,
            route_binding: {
              operation_kind: "plan_apply",
              oos_route: "/v1/delivery/846/plan/apply",
              payload_key: "target_pi",
              target: "initiative",
            },
            status: "complete",
            target_node_ids: ["846"],
            target_statuses: { 846: "complete" },
            target_values: { 846: "PI-2026-03" },
            validation_hint: "Use an admitted Target PI.",
            value: "PI-2026-03",
          },
        ],
        group_id: "planning",
        summary: "Planning metadata",
        title: "Planning",
      },
    ],
    last_saved_at: "2026-08-26T07:59:00.000Z",
    packet_id: "refinement-packet:846",
    packet_revision: "packet-version-3",
    readiness_gates: [
      {
        detail: "Work Design handoff is current.",
        gate_id: "work-design-handoff",
        label: "Work Design Handoff",
        status: "passed",
      },
    ],
    schema_version: 1,
    source: {
      delivery_id: "delivery-846",
      finalized_brief_ref: "brief://work-design/846/final",
      package_ref: "delivery-package:846",
      source_ref: "openproject://work_packages/846",
      source_revision: "version-21",
      source_work_design_receipt_id: "work-design-receipt:846",
      tree_snapshot_ref: "tree://delivery/846",
    },
    status: "ready_for_review",
    target_tree: {
      children: [],
      description: "Delivery package 846.",
      draft_body: "Apply reviewed metadata.",
      id: "846",
      kind: "Epic",
      remark: "Ready for Refinement.",
      title: "Delivery 846",
    },
  };
}

function refinementAssistResult(request) {
  return {
    confidence: "high",
    correlation_id: request.correlation_id,
    evidence: {
      cgg_packet_ref: "cgg://packets/refinement-846",
      gateway_audit_ref: "cgg://audit/refinement-846",
      generated_at: "2026-08-26T08:00:01.000Z",
      model_profile_id: "delivery-refinement-advisor-v1",
      output_schema_ref: "schema://refinement-advice/v1",
      redaction_receipt_ref: "cgg://receipts/refinement-846",
      task_contract_ref: "oos.delivery-refinement.v1",
    },
    request_id: request.request_id,
    required_operator_action: "review",
    response_id: "refinement-response:846",
    schema_version: 1,
    status: "ready",
    suggestion: {
      field_key: request.target.field_key,
      rationale: "The next admitted planning window is available.",
      resolution: "ai_drafted",
      summary: "Use the next Target PI.",
      value: "PI-2026-04",
    },
  };
}

function refinementRun(request = null) {
  const requestId = request?.request_id ?? "console-refinement-apply:846";
  const correlationId =
    request?.correlation_id ?? "console-refinement-correlation:846";
  return {
    correlation_id: correlationId,
    events: [
      {
        event_id: "refinement-event:846:1",
        event_type: "readback_completed",
        message: "Canonical readback completed.",
        recorded_at: "2026-08-26T08:00:04.000Z",
        sequence: 1,
        status: "completed",
      },
    ],
    failure: null,
    poll_ref: "/v1/delivery-refinement/delivery-package:846/runs/refinement-run:846",
    receipt: {
      accepted_draft_digest:
        request?.accepted_draft?.draft_digest ?? `sha256:${"a".repeat(64)}`,
      applied_at: "2026-08-26T08:00:04.000Z",
      applied_by: "operator:console-owner",
      receipt_digest: `sha256:${"b".repeat(64)}`,
      receipt_id: "refinement-receipt:846",
      receipt_ref: "oos://refinement-receipts/846",
      run_id: "refinement-run:846",
      source_work_design_receipt_id: "work-design-receipt:846",
      target: {
        created_refs: [],
        delivery_ref: "openproject://work_packages/846",
        readback_complete: true,
        reused_refs: [],
        source_revision: "version-22",
        updated_refs: ["openproject://work_packages/846"],
      },
    },
    replayed: false,
    request_id: requestId,
    run_id: "refinement-run:846",
    schema_version: 1,
    state: "completed",
    submitted_at: "2026-08-26T08:00:02.000Z",
    updated_at: "2026-08-26T08:00:04.000Z",
  };
}

function catalogMutationCommand() {
  return {
    acceptanceId: "catalog-acceptance:owner-repo",
    acceptedAt: "2026-08-26T08:10:00.000Z",
    draft: {
      description: "Shared workflow authority.",
      label: "operator-orchestration-service",
      linkedRepository: ownerRepository(),
      parentCatalogValueKey: null,
      valueKey: "operator-orchestration-service",
    },
    mode: "edit",
    repositoryReadiness: repositoryReadiness(),
    targetValueId: "catalog-value-owner-repo-oos",
  };
}

function catalogProjection() {
  return {
    groups: [
      {
        description: "Repository ownership metadata.",
        expected_route: "/v1/delivery-catalog/catalog-owner-repo/mutations",
        group_id: "organization",
        item_ids: ["catalog-owner-repo"],
        route_status: "implemented",
        source_authority: "OpenProject",
        title: "Organization",
      },
    ],
    items: [
      {
        backend_route: "/v1/delivery-catalog/catalog-owner-repo/mutations",
        catalog_item_id: "catalog-owner-repo",
        console_capability: "request",
        create_authority: "OOS Catalog runtime",
        description: "Link an admitted owner repository.",
        evidence_refs: ["oos://catalog/projection"],
        gap_status: "console_requestable",
        group_id: "organization",
        label: "Owner Repo",
        last_projected_at: "2026-08-26T08:09:00.000Z",
        lifecycle_state: "active",
        next_action_detail: "Review and apply a repository link.",
        next_action_label: "Request Value",
        owner_route: "operator-orchestration-service",
        source_authority: "OpenProject",
        usage_count: 1,
        usage_summary: "Used by one Delivery package.",
        value_key: "owner_repo",
      },
    ],
    projected_at: "2026-08-26T08:09:00.000Z",
    projection_status: "ready",
    schema_version: 1,
    source_revision: "catalog-version-9",
    summary: {
      drift_count: 0,
      missing_route_count: 0,
      owner_routed_count: 0,
      requestable_count: 1,
      total_items: 1,
    },
    values: [catalogValue()],
  };
}

function catalogValue() {
  return {
    catalog_item_id: "catalog-owner-repo",
    catalog_value_id: "catalog-value-owner-repo-oos",
    description: "Shared workflow authority.",
    evidence_refs: ["wgcf://receipts/repo-oos"],
    label: "operator-orchestration-service",
    last_projected_at: "2026-08-26T08:09:00.000Z",
    lifecycle_state: "active",
    parent_catalog_item_id: null,
    parent_catalog_value_key: null,
    repository_binding: repositoryReadiness(),
    usage_count: 1,
    usage_summary: "Used by one Delivery package.",
    value_key: "operator-orchestration-service",
  };
}

function catalogMutationResult(request) {
  return {
    applied_at: "2026-08-26T08:10:01.000Z",
    applied_by: "operator:console-owner",
    correlation_id: request.correlation_id,
    mutation_id: "catalog-mutation:owner-repo",
    readback_complete: true,
    receipt: {
      digest: `sha256:${"d".repeat(64)}`,
      ref: "oos://catalog-receipts/owner-repo",
    },
    related_values: [],
    replayed: false,
    request_id: request.request_id,
    schema_version: 1,
    source_revision: "catalog-version-10",
    status: "applied",
    value: catalogValue(),
  };
}

function ownerRepository() {
  return {
    admissionState: "admitted",
    description: "Shared workflow authority.",
    id: "repo-oos",
    label: "operator-orchestration-service",
    owner: "workspace-platform",
    repoRef: "https://github.com/example/operator-orchestration-service",
    routeSource: "repository-operation",
    valueKey: "operator-orchestration-service",
  };
}

function repositoryReadiness() {
  return {
    catalog_value_key: "operator-orchestration-service",
    receipt: {
      digest: `sha256:${"c".repeat(64)}`,
      evaluated_at: "2026-08-26T08:08:00.000Z",
      generation: 4,
      issuer: "workspace-governance-control-fabric",
      outcome: "ready",
      receipt_id: "repo-readiness:operator-orchestration-service",
      target_scope: "repo:operator-orchestration-service",
      uri: "wgcf://receipts/repo-oos",
    },
    repo_name: "operator-orchestration-service",
    repo_ref: "repo://operator-orchestration-service",
  };
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}
