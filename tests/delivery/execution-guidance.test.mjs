import test from "node:test";
import assert from "node:assert/strict";
import { projectCanonicalDeliveryWorkspace } from "../../src/domain-workspaces/delivery/live-runtime/delivery-workspace-live-projection.ts";
import { projectCanonicalDeliveryOverview } from "../../src/domain-workspaces/delivery/live-runtime/delivery-overview-live-projection.ts";
import { deliveryControlBoardFamilyGroups, deliveryPackagesToControlBoardPackages } from "../../src/domain-workspaces/delivery/product-adapters/control-board/delivery-control-board-adapter.ts";
import { executionReviewActions } from "../../src/domain-workspaces/delivery/work-model/execution/execution-review-actions.ts";
import { executionBoardApplyIntent } from "../../src/domain-workspaces/delivery/work-model/execution/execution-action-intent.ts";
import { executionActionIntentReady } from "../../src/domain-workspaces/delivery/work-model/execution/execution-action-eligibility.ts";
import { executionActionContracts } from "../../src/domain-workspaces/delivery/work-model/execution/execution-action-contracts.ts";
import { deliveryChangeOperationForExecutionAction } from "../../src/domain-workspaces/delivery/work-model/execution/execution-change-operation.ts";
import { deliveryModelForScope } from "../../src/domain-workspaces/delivery/live-runtime/delivery-history-projection.ts";
import { getExecutionBoardPackages, getDeliveryPackagesByWorkflowPhase } from "../../src/domain-workspaces/delivery/read-model/selectors/workflow-package-selectors.ts";

import { deliveryWorkItemStatus } from "../../src/domain-workspaces/delivery/domain/delivery-execution.ts";
import { completionPrerequisitesFromPlan, withCompletionPrerequisites } from "../../src/domain-workspaces/delivery/work-model/execution/delivery-completion-prerequisites.ts";

const at = "2026-11-17T00:00:00Z";
const node = (id, status, type = "Epic") => ({id, status, type, record_ref:`openproject://work_packages/${id}`,subject:`Work ${id}`,children:[]});
function model(status = "in-progress") {
  const root = node(1, status);
  root.children = [node(2,"done","User story"),node(3,"retired","User story"),node(4,"in-progress","User story")];
  return projectCanonicalDeliveryWorkspace({workflow_id:"delivery-initiatives",project:{identifier:"workspace-delivery-art"},
    initiatives:[{epic:{...root,initiative_family:"delivery-foundations"},execution_tree:root,summary:{open_descendant_count:1}}]},"revision",at);
}
test("Family Map uses recorded membership for live IDs and retains every unassigned package", () => {
  const m = model();
  m.packages.push({...m.packages[0],delivery_package_id:"delivery-9",legacy_epic_id:9,initiative_family:null});
  m.family_map.groups = [{id:"wrong-example",label:"Wrong example",packages:[{delivery_package_id:"delivery-1"}]}];
  const groups = deliveryControlBoardFamilyGroups(m,m.packages);
  assert.deepEqual(groups.map(g=>[g.label,g.packageIds]),[["Delivery Foundations",["delivery-1"]],["Unassigned",["delivery-9"]]]);
  assert.equal(new Set(groups.flatMap(g=>g.packageIds)).size,m.packages.length);
});
test("archived roots retain owner-recorded families without reading their old child graphs", () => {
  const root={...node(5,"done"),owner_repo:null,target_pi:null,architecture_anchor_ref:null,required_upstream_ref:null,initiative_family:"delivery-foundations"};
  const m=projectCanonicalDeliveryOverview({schema_version:1,workflow_id:"delivery-console-overview",project:{identifier:"workspace-delivery-art"},roots:[root],operational_initiatives:[],deferred_history_refs:[root.record_ref],mutation_authority:"none"},"revision",at);
  assert.equal(m.art_tree.roots.length,0);
  assert.equal(deliveryControlBoardFamilyGroups(m,m.packages)[0].packageIds[0],"delivery-5");
  assert.equal(deliveryPackagesToControlBoardPackages({model:m,packages:m.packages})[0].progress,null);
});
test("retired descendants are counted separately and do not inflate completed progress", () => {
  const m=model(),progress=deliveryPackagesToControlBoardPackages({model:m,packages:m.packages})[0].progress;
  assert.deepEqual(progress,{completedChildCount:1,retiredChildCount:1,totalChildCount:3,progressPercent:33});
});
test("Current retains deferred work in Execution, without putting it in an editable planning register", () => {
  const m=model("parked");m.packages[0].workflow_phase="refinement";
  const current=deliveryModelForScope(m,"current");
  assert.equal(getExecutionBoardPackages(current).length,1);
  assert.equal(getDeliveryPackagesByWorkflowPhase("refinement",current).length,0);
  assert.equal(deliveryModelForScope(m,"history").history_scope,"history");
});
test("review controls require an exact owner package and retirement cannot use an invented reason", () => {
  const m=model(),item=m.packages[0],projection={delivery_id:"delivery-1",package:{execution_tree:node(1,"in-progress")}};
  assert.deepEqual(executionReviewActions(null,item),[]);
  assert.deepEqual(executionReviewActions({...projection,delivery_id:"delivery-99"},item),[]);
  const actions=executionReviewActions(projection,item),action=actions.find(a=>a.action_type==="retire"),actionContract=executionActionContracts.retire;
  const applyIntent=executionBoardApplyIntent({action,actionContract,model:m,packageSummary:item,packageTree:m.art_tree.roots[0],sourceRevision:"reviewed-revision"});
  assert.equal(executionActionIntentReady(applyIntent),false);
  applyIntent.operator_payload.retirement_reason="Superseded by the accepted replacement, with its source evidence.";
  assert.equal(executionActionIntentReady(applyIntent),true);
  assert.equal(deliveryChangeOperationForExecutionAction({action,applyIntent}).payload.work_item_id,"work-item-1");
  assert.deepEqual(executionReviewActions({...projection,package:{execution_tree:node(1,"parked")}},item).map(a=>a.action_type),["resume"]);
  assert.deepEqual(executionReviewActions({...projection,package:{execution_tree:node(1,"done")}},item),[]);
});

test("only exact completion dependencies of non-source work change the displayed wait", () => {
  const risk = { ...model().art_tree.roots[0], component_type: "Risk", legacy_work_package_id: 3,
    backend_status: "new", dependency_blocked: true, unresolved_dependency_work_package_ids: [2], children: [] };
  const groups = [{ source_backed: false, covered_work_item_ids: ["work-item-3"] },
    { source_backed: true, covered_work_item_ids: ["work-item-4"] }];
  const plan = { landing_units: groups, work_item_execution_plan: [
    { work_item_id: "work-item-3", start_after_work_item_ids: ["work-item-5"],
      close_after_work_item_ids: ["work-item-2", "work-item-5"] },
    { work_item_id: "work-item-4", start_after_work_item_ids: [], close_after_work_item_ids: ["work-item-2"] },
  ] };
  const timing = completionPrerequisitesFromPlan(plan);
  assert.deepEqual(timing, { 3: [2] });
  const openRisk = withCompletionPrerequisites(risk, timing);
  assert.equal(deliveryWorkItemStatus(openRisk), "new");
  assert.deepEqual(openRisk.unresolved_dependency_work_package_ids, [2]);
  assert.equal(deliveryWorkItemStatus({ ...openRisk, unresolved_dependency_work_package_ids: [2, 5] }), "blocked");
  assert.equal(deliveryWorkItemStatus({ ...openRisk, inherited_status: "blocked" }), "blocked");
  assert.equal(deliveryWorkItemStatus({ ...openRisk, backend_status: "blocked" }), "blocked");
});
