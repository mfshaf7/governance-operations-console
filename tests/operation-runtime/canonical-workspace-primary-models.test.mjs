import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { projectCanonicalDeliveryWorkspace } from "../../src/domain-workspaces/delivery/live-runtime/delivery-workspace-live-projection.ts";
import { readCanonicalDeliveryWorkspace } from "../../src/domain-workspaces/delivery/server/delivery-workspace-oos-client.ts";
import { projectCanonicalPrototypeWorkspace, prototypeOwnerProgressIsNewer } from "../../src/domain-workspaces/prototype/live-runtime/prototype-workspace-live-projection.ts";
import { readCanonicalPrototypeWorkspace } from "../../src/domain-workspaces/prototype/server/prototype-landing-oos-client.ts";
import { assertCanonicalSourceRequest, canonicalSourceResponse } from "../support/console-source-projection.mjs";

const at = "2026-10-16T08:00:00.000Z", revision = "a".repeat(40);
const env = { OOS_BASE_URL: "http://127.0.0.1:8080", OOS_CALLER_ID: "governance-operations-console", OOS_CALLER_SECRET: "test-only-secret", GOVERNANCE_CONSOLE_OPERATOR_ID: "operator:sample" };
const config = { baseUrl: env.OOS_BASE_URL, callerId: env.OOS_CALLER_ID, callerSecret: env.OOS_CALLER_SECRET };
const node = (id, status = "new", type = "Epic", children = []) => ({ id, status, type, children, subject: `Synthetic work ${id}`, record_ref: `openproject://work_packages/${id}`, ready_contract_applicable: true, ready_contract_satisfied: false });
function delivery() {
  return { workflow_id: "delivery-initiatives", project: { identifier: "workspace-delivery-art" }, summary: { total: 1 }, initiatives: [{ epic: node(71), execution_tree: node(71), summary: { open_descendant_count: 0 } }] };
}
function prototype() {
  return {
    schema_version: 1, workflow_id: "prototype-records", authority_revision: revision, authority_sequence: 5,
    registry: { schema_version: 1, studio: {}, prototypes: [] },
    captures: [{ artifact_type: "proposal-routed-prototype-capture", prototype_id: "prototype:proposal-71", record_ref: "record://prototype-captures/proposal-71", landing_state: "captured", lifecycle: "exploring", entry_packet: { suggestions: { name: "Proposal 71 Prototype" } }, proposal: { proposal_id: "idea-71", record_ref: "openproject://work_packages/71" } }],
    documents: {}, workflows: { landing: [], maturity: [], closure: [] }, workflow_sources: { landing: "available", maturity: "available", closure: "available" }, canonical_mutation: false,
  };
}

test("primary Delivery projection represents real new work without inventing readiness, custody, actions or Catalog truth", () => {
  const model = projectCanonicalDeliveryWorkspace(delivery(), "sha256:source", at);
  assert.equal(model.source_truth, "OpenProject-backed OOS");
  assert.equal(model.packages.length, 1);
  assert.equal(model.packages[0].package_posture, "New");
  assert.equal(model.packages[0].workflow_phase, "work_design");
  assert.equal(model.packages[0].source_custody, null);
  assert.deepEqual(model.packages[0].available_actions, []);
  assert.deepEqual(model.apply_intents, []);
  assert.equal(model.catalog.projection_status, "backend_unavailable");
  assert.equal(model.selected_packages[0].next_execution_target_id, null);
  const empty = delivery(); empty.initiatives = [];
  assert.equal(projectCanonicalDeliveryWorkspace(empty, "sha256:empty", at).packages.length, 0);
  assert.throws(() => projectCanonicalDeliveryWorkspace({ ...empty, workflow_id: "fixture" }, "sha256:wrong", at));
});

test("canonical Delivery tree and routing hints preserve exact work IDs and observed backend states, while duplicate or malformed truth fails closed", () => {
  const value = delivery();
  value.initiatives[0].execution_tree.children = [node(72, "new", "User story")];
  value.initiatives[0].summary.open_descendant_count = 1;
  assert.equal(projectCanonicalDeliveryWorkspace(value, "source", at).packages[0].workflow_phase, "refinement");
  value.initiatives[0].execution_tree.children[0].status = "in-progress";
  const model = projectCanonicalDeliveryWorkspace(value, "source", at);
  assert.equal(model.packages[0].workflow_phase, "execution");
  assert.equal(model.art_tree.roots[0].children[0].legacy_work_package_id, 72);
  value.initiatives[0].execution_tree.children[0].id = 71;
  assert.throws(() => projectCanonicalDeliveryWorkspace(value, "source", at));
  assert.throws(() => projectCanonicalDeliveryWorkspace({ ...delivery(), project: { identifier: "other" } }, "source", at));
});

test("primary Prototype cold reconstruction includes canonical Proposal captures and no invented landed state, receipt or preview proof", () => {
  const model = projectCanonicalPrototypeWorkspace(prototype(), at);
  const capture = model.readModel.records[0];
  assert.equal(capture.id, "prototype-proposal-71");
  assert.equal(capture.landing.state, "captured");
  assert.equal(capture.landing.lastLandingReceiptRef, null);
  assert.equal(capture.landing.supportRows.length, 10);
  assert.ok(capture.landing.supportRows.every((row) => row.state === "unknown"));
  assert.equal(capture.preview.runtimeState, "unknown");
  assert.equal(capture.preview.proofState, "not-started");
  assert.deepEqual(capture.receipts, []);
  assert.equal(capture.sourceRef, "record://prototype-captures/proposal-71");
  assert.deepEqual(projectCanonicalPrototypeWorkspace(prototype(), at), model);
  const empty = prototype(); empty.captures = [];
  assert.equal(projectCanonicalPrototypeWorkspace(empty, at).readModel.records.length, 0);
  const duplicate = prototype(); duplicate.captures.push(duplicate.captures[0]);
  assert.throws(() => projectCanonicalPrototypeWorkspace(duplicate, at));
});

test("registered terminal lifecycle survives a cold read without fake historical landing or local reapproval", () => {
  const value = prototype(); value.captures = [];
  value.registry.prototypes = [{ id: "sample-product", name: "Sample product", owner: "Synthetic Owner", lifecycle: "graduated", data_mode: "real-readonly", mutation_boundary: "read-only", visibility_tier: "private-internal", paths: { brief: "docs/prototypes/sample-product/brief.md" }, linked_records: [] }];
  const record = projectCanonicalPrototypeWorkspace(value, at).readModel.records[0];
  assert.equal(record.lifecycle, "graduated");
  assert.equal(record.currentMove.id, "archive");
  assert.equal(record.sourceRef, "record://prototypes/sample-product");
  assert.deepEqual(record.receipts, []);
  assert.equal(record.preview.proofState, "not-started");
});

function landedPrototype(lifecycle = "exploring") {
  const value = prototype();
  const setup = { scaffold_profile: "static-site", support_profile: "interactive", preview_mode: "static", data_mode: "synthetic", mutation_boundary: "local-only", visibility: "private",
    support_rows: ["source", "studio-home", "interface", "runtime", "data", "integration", "tooling", "evidence", "visibility", "recovery"].map(dimension => ({ dimension, state: "ready", detail: `Accepted ${dimension}` })) };
  value.registry.prototypes = [{ id: "proposal-71", name: "Accepted owner name", objective: "Accepted owner objective", owner: "Workspace Prototype Studio", lifecycle, data_mode: "synthetic", mutation_boundary: "prototype-local", visibility_tier: "private-internal", paths: {}, linked_records: [] }];
  value.documents["records/prototype-landings/proposal-71/record.json"] = { id: "prototype:proposal-71", name: "Accepted owner name", objective: "Accepted owner objective", setup, next_action: "candidate-promotion", source: { posture: "create-studio-source", custody: "incubation-repo", ref: "repo://workspace-prototype-studio/prototypes/proposal-71" } };
  return value;
}

test("cold canonical landed setup routes to Candidate without replaying Landing or inventing owner receipts", () => {
  const value = landedPrototype();
  const before = structuredClone(value);
  const projected = projectCanonicalPrototypeWorkspace(value, at);
  const record = projected.readModel.records[0];
  assert.equal(record.landing.state, "landed");
  assert.equal(record.landing.basePlatform, "static-site");
  assert.equal(record.landing.supportProfile, "interactive-prototype");
  assert.equal(record.currentMove.id, "candidate-promotion");
  assert.equal(record.summary, "Accepted owner objective");
  assert.equal(record.landing.lastLandingReceiptRef, null);
  assert.equal(record.preview.runtimeState, "unknown");
  assert.equal(record.preview.proofState, "not-started");
  assert.deepEqual(record.receipts, []);
  assert.deepEqual(value, before);
  assert.deepEqual(projectCanonicalPrototypeWorkspace(value, at), projected);
  const wrongIdentity = structuredClone(value);
  wrongIdentity.documents["records/prototype-landings/proposal-71/record.json"].id = "prototype:other";
  assert.throws(() => projectCanonicalPrototypeWorkspace(wrongIdentity, at));
  const unknownNextAction = structuredClone(value);
  unknownNextAction.documents["records/prototype-landings/proposal-71/record.json"].next_action = "invented-action";
  assert.throws(() => projectCanonicalPrototypeWorkspace(unknownNextAction, at));
});

test("later canonical lifecycle does not reopen Landing or Candidate when owner workflow history is absent", () => {
  for (const [lifecycle, next] of [["candidate", "preview-proof"], ["baseline-approved", "movement-request"], ["graduating", "closeout-retirement"], ["graduated", "archive"], ["retired", "archive"]]) {
    const record = projectCanonicalPrototypeWorkspace(landedPrototype(lifecycle), at).readModel.records[0];
    assert.equal(record.lifecycle, lifecycle);
    assert.equal(record.currentMove.id, next);
    assert.equal(record.preview.proofState, "not-started");
    assert.deepEqual(record.receipts, []);
  }
});

test("primary server adapters negotiate existing canonical envelopes and fail closed on legacy JSON or owner confusion", async () => {
  const currentDelivery = await readCanonicalDeliveryWorkspace({ env, fetchImpl: async (url, init) => {
    assertCanonicalSourceRequest(init);
    assert.ok(url.endsWith("/v1/delivery-initiatives?include_done=false"));
    return canonicalSourceResponse(delivery(), { recordRef: "openproject://projects/workspace-delivery-art/initiatives", sourceOwner: "workspace-delivery-art" });
  } });
  assert.equal(currentDelivery.packages[0].legacy_epic_id, 71);
  const currentPrototype = await readCanonicalPrototypeWorkspace({ config, fetchImpl: async (url, init) => {
    assertCanonicalSourceRequest(init); assert.ok(url.endsWith("/v1/prototypes"));
    return canonicalSourceResponse(prototype(), { recordRef: "repo://workspace-prototype-studio/prototypes", sourceRef: "repo://workspace-prototype-studio@main", sourceOwner: "workspace-prototype-studio" });
  } });
  assert.equal(currentPrototype.readModel.records[0].id, "prototype-proposal-71");
  await assert.rejects(readCanonicalDeliveryWorkspace({ env, fetchImpl: async () => Response.json(delivery()) }));
  await assert.rejects(readCanonicalPrototypeWorkspace({ config, fetchImpl: async () => Response.json(prototype()) }));
});

test("cold owner progress selection never overwrites a newer request with a stale browser pointer", () => {
  const current = { request_id: "request:2", revision: 5, history: [{ at: "2026-10-16T08:02:00.000Z" }] };
  assert.equal(prototypeOwnerProgressIsNewer({ ...current, revision: 4 }, current), false);
  assert.equal(prototypeOwnerProgressIsNewer({ ...current, revision: 6 }, current), true);
  assert.equal(prototypeOwnerProgressIsNewer({ request_id: "request:1", revision: 99, history: [{ at }] }, current), false);
  assert.equal(prototypeOwnerProgressIsNewer(current), true);
});

test("live workspace controllers reject local overlays and both Maturity dialogs expose awaited owner review and failure", () => {
  const read = (relative) => readFileSync(new URL(`../../src/${relative}`, import.meta.url), "utf8");
  const deliveryController = read("domain-workspaces/delivery/presentation/workspace/workspace-controller.tsx");
  assert.match(deliveryController, /allowLocalProjection \? projectDeliveryEffectiveReadModel/);
  const prototypeController = read("domain-workspaces/prototype/presentation/surface/use-prototype-control-controller.ts");
  assert.match(prototypeController, /if \(!primaryRecordIsolation.fixtureAllowed\)/);
  assert.match(prototypeController, /readModel: sourceReadModel/);
  for (const name of ["candidate", "baseline"]) {
    const source = read(`domain-workspaces/prototype/presentation/workflows/${name}-promotion/prototype-${name}-promotion-modal.tsx`);
    assert.match(source, /await onRecordReceipt/);
    assert.match(source, /PrototypeMaturityOwnerProgressPanel/);
    assert.match(source, /setSubmissionError/);
  }
});
