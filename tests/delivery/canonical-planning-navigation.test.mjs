import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { executionInspectionPackage } from "../../src/domain-workspaces/delivery/presentation/surfaces/execution-board/work-session/execution-work-session-target.ts";
import { getExecutionBoardPackages } from "../../src/domain-workspaces/delivery/read-model/selectors/workflow-package-selectors.ts";
import { deliveryWorkspaceComponentStatuses } from "../../src/domain-workspaces/delivery/presentation/workspace/workspace-status-model.ts";
import { workDesignHandoffApplication } from "../../src/domain-workspaces/delivery/presentation/workflows/shared/package-actions/package-work-design-receipt-model.ts";

function inventory() {
  return {
    source_truth: "OpenProject-backed OOS", generated_at: "2026-10-23T01:00:00.000Z",
    projection_state: { status: "fresh", source_revision: "source-1", checked_at: "2026-10-23T01:00:00.000Z", detail: "Canonical ART inventory; workflow authority remains scoped." },
    packages: [
      { delivery_package_id: "delivery-package:908", legacy_epic_id: 908, tree_root_id: "work-item-908", workflow_phase: "refinement", available_actions: [] },
      { delivery_package_id: "delivery-package:910", legacy_epic_id: 910, tree_root_id: "work-item-910", workflow_phase: "execution", available_actions: [] },
    ],
    art_tree: { roots: [
      { id: "work-item-908", legacy_work_package_id: 908, children: [{ id: "work-item-909", legacy_work_package_id: 909, children: [] }] },
      { id: "work-item-910", legacy_work_package_id: 910, children: [] },
    ] },
  };
}
function application(id = "application:one") {
  return {
    application_id: id, applied_at: "2026-10-23T00:36:10.987Z",
    target: { delivery_ref: "openproject://work_packages/908", readback_complete: true, created_refs: ["openproject://work_packages/909"], updated_refs: [], reused_refs: [] },
    receipt: { ref: `openproject://work_packages/908/activities/${id.endsWith("one") ? 42 : 43}`, digest: "sha256:" + "a".repeat(64) },
  };
}

test("direct canonical inspection reaches planning root and child without inventing work eligibility", () => {
  const model = inventory(), before = JSON.stringify(model);
  assert.deepEqual(getExecutionBoardPackages(model).map((item) => item.legacy_epic_id), [910]);
  for (const id of [908, 909]) {
    const selected = executionInspectionPackage(id, model);
    assert.equal(selected.legacy_epic_id, 908);
    assert.equal(selected.workflow_phase, "refinement");
    assert.deepEqual(selected.available_actions, []);
  }
  assert.equal(JSON.stringify(model), before);
});

test("unknown, ambiguous and disconnected inspection cannot select a guessed initiative", () => {
  assert.throws(() => executionInspectionPackage(999, inventory()), /not uniquely present/);
  const duplicate = inventory();
  duplicate.art_tree.roots[1].children = [duplicate.art_tree.roots[0].children[0]];
  assert.throws(() => executionInspectionPackage(909, duplicate), /not uniquely present/);
  assert.throws(() => executionInspectionPackage(908, { ...inventory(), source_truth: "mock" }), /requires.*OOS/);
});

test("canonical inventory status is scoped read truth, not future wiring or blanket write readiness", () => {
  const signals = deliveryWorkspaceComponentStatuses(inventory());
  for (const id of ["write-path", "oos"]) {
    const signal = signals.find((item) => item.id === id);
    assert.equal(signal.state, "current");
    assert.equal(signal.tone, "info");
    assert.doesNotMatch(signal.detail, /prototype-local|future.*boundary|until backend/);
    assert.match(signal.detail, /workflow|selected/);
  }
  assert.match(signals.find((item) => item.id === "write-path").detail, /does not prove.*authorized/);
  for (const [status, state] of [["stale", "stale"], ["read_error", "failed"], ["permission_denied", "denied"]]) {
    const model = inventory(); model.projection_state.status = status;
    const result = deliveryWorkspaceComponentStatuses(model);
    assert.equal(result.find((item) => item.id === "write-path").state, state);
    assert.equal(result.find((item) => item.id === "oos").state, state);
  }
});

test("disconnected status stays explicitly local and is not promoted by fresh fixture data", () => {
  const signals = deliveryWorkspaceComponentStatuses({ ...inventory(), source_truth: "mock" });
  assert.equal(signals.find((item) => item.id === "write-path").state, "local");
  assert.match(signals.find((item) => item.id === "write-path").detail, /prototype-local/);
  assert.equal(signals.find((item) => item.id === "oos").state, "local");
});

test("cold handoff resolves exact durable application without any local brief or snapshot", () => {
  const first = application();
  const projection = { latest_application: first, history: [first] };
  assert.equal(workDesignHandoffApplication(projection, first.target.delivery_ref, first.application_id), first);
  assert.equal(workDesignHandoffApplication(projection, first.target.delivery_ref, first.receipt.ref), first);
  assert.equal(workDesignHandoffApplication(projection, first.target.delivery_ref), first);
  assert.equal(first.applied_at, "2026-10-23T00:36:10.987Z");
});

test("a later application cannot replace the older handoff receipt binding", () => {
  const first = application(), latest = application("application:two");
  const projection = { latest_application: latest, history: [latest, first] };
  assert.equal(workDesignHandoffApplication(projection, first.target.delivery_ref, first.application_id).receipt.ref, first.receipt.ref);
  assert.throws(() => workDesignHandoffApplication(projection, first.target.delivery_ref, "application:missing"), /does not contain/);
});

test("missing and wrong-target canonical evidence never becomes a local handoff success", () => {
  const first = application();
  assert.throws(() => workDesignHandoffApplication({ latest_application: null, history: [] }, first.target.delivery_ref), /does not contain/);
  assert.throws(() => workDesignHandoffApplication({ latest_application: first, history: [first] }, "openproject://work_packages/999", first.application_id), /does not contain/);
});

test("actual UI entry, native editor refresh and evidence handoff are composed together", () => {
  const root = new URL("../../src/domain-workspaces/delivery/", import.meta.url);
  const read = (path) => readFileSync(new URL(path, root), "utf8");
  const board = read("presentation/surfaces/execution-board/execution-board-surface.tsx");
  assert.match(board, /executionInspectionPackage\(workItemId, model\)/);
  assert.match(board, /handleSelectedPackageChange\(target.delivery_package_id\)/);
  assert.match(board, /deliveryControlBoardTreeByPackageId\(\{ model, packages: model.packages \}\)/);
  assert.match(board, /const canonicalSnapshot = await deliveryChangeRuntime.refresh\(\)/);
  assert.match(board, /canonicalSnapshot.projection.package.execution_tree/);
  assert.match(board, /await deliveryChangeRuntime.apply\(/);
  assert.match(board, /Inspect/);
  const entry = read("presentation/surfaces/execution-board/work-session/execution-work-session-target-dialog.tsx");
  assert.match(entry, /Inspect ART Tree/);
  assert.match(entry, /aria-label="ART work item"/);
  assert.match(entry, /if \(inspect && onInspectTarget\) onInspectTarget\(workItemId\)/);
  const router = read("presentation/workflows/refinement/session/refinement-step-router.tsx");
  assert.match(router, /sourceWorkDesignPackage \?\? deliveryPackage/);
  assert.match(router, /handoffReceiptId=\{packet.handoff.source_work_design_receipt_id\}/);
  const dialog = read("presentation/workflows/shared/package-actions/package-work-design-receipt-dialog.tsx");
  assert.match(dialog, /runtime.mode === "live" && runtime.projectionStatus === "current"/);
  assert.match(dialog, /workDesignHandoffApplication\(runtime.projection, deliveryPackage.source_ref, handoffReceiptId\)/);
  assert.match(dialog, /does not prove snapshot upload/);
  assert.doesNotMatch(dialog, /createLocal|runApply|\.apply\(|finalizeContextBrief/);
  const wrapper = read("presentation/workflows/shared/package-actions/package-handoff-evidence.tsx");
  assert.match(wrapper, /runtime.projection.mode === "invalid"/);
  assert.match(wrapper, /runtime.status !== "current"/);
});
