import test from "node:test";
import assert from "node:assert/strict";
import { projectCanonicalDeliveryOverview } from "../../src/domain-workspaces/delivery/live-runtime/delivery-overview-live-projection.ts";
import { getExecutionBoardPackages, getDeliveryPackagesByWorkflowPhase } from "../../src/domain-workspaces/delivery/read-model/selectors/workflow-package-selectors.ts";
import { readDeliveryRegister } from "../../src/domain-workspaces/delivery/server/delivery-register-query.ts";
const at="2026-11-17T01:00:00Z";
function overview({status="new",posture="Ready",phase="execution",childStatus="new",sessions=null}={}){
  const child={id:3,type:"Task",status:childStatus,subject:"Implement the change",children:[],ready_contract_satisfied:true,
    dependency_blocked:true,depends_on_work_package_ids:[4],blocker:{statement:"Await approval",impact:"Cannot begin",owner:"Reviewer",decision_path:"remove",justification:null,discovered_on:null,review_date:null,follow_up_owner:null}};
  const epic={id:1,type:"Epic",status,subject:"Package",record_ref:"openproject://work_packages/1",owner_repo:null,target_pi:null,architecture_anchor_ref:null,required_upstream_ref:null};
  return {schema_version:1,workflow_id:"delivery-console-overview",project:{identifier:"workspace-delivery-art"},mutation_authority:"none",roots:[epic],deferred_history_refs:[],
    operational_initiatives:[{epic,summary:{open_descendant_count:childStatus==="done"?0:1},execution_tree:{...epic,children:[child]},work_sessions:sessions,
      execution_navigation:{authority:"operator-orchestration-service",eligibility:"check-selected-work-item",native_status:status,workflow_phase:phase,package_posture:posture,
        closeout_pending:posture==="Closeout Pending",active_work_item_ids:[],prepared_work_item_ids:childStatus==="done"?[]:[3],blocked_work_item_ids:[],refinement_work_item_ids:[3]}}]};
}
test("actual overview preserves owner routing, native ART status and parallel refinement scope",()=>{
  const model=projectCanonicalDeliveryOverview(overview(),"revision",at),item=model.packages[0];
  assert.equal(item.backend_status,"new");assert.equal(item.package_posture,"Ready");
  assert.equal(getExecutionBoardPackages(model).length,1);assert.equal(getDeliveryPackagesByWorkflowPhase("refinement",model).length,1);
  const node=model.art_tree.roots[0].children[0];
  assert.equal(node.blocker.statement,"Await approval");assert.equal(node.blocker.review_date,"");
  assert.equal(node.dependency_blocked,true);assert.deepEqual(node.depends_on_work_package_ids,[4]);
  assert.equal(item.active_blocker,undefined,"A child blocker must not become a package blocker");
});
test("last-child completion retains package and its separate closeout requirement",()=>{
  const model=projectCanonicalDeliveryOverview(overview({status:"in-progress",posture:"Closeout Pending",childStatus:"done"}),"revision",at);
  assert.equal(getExecutionBoardPackages(model).length,1);assert.equal(model.packages[0].backend_status,"in-progress");
  assert.equal(model.board_summary.by_posture["Closeout Pending"],1);
  assert.equal(model.board_summary.closeout_pending_count,1);
});
test("the actual paged Refinement register retains unfinished scope in an executing package",async()=>{
  const model=projectCanonicalDeliveryOverview(overview(),"revision",at);
  const result=await readDeliveryRegister(new URLSearchParams({surface:"refinement",scope:"current"}),undefined,{readSource:async()=>({model,next_cursor:null})});
  assert.equal(result.projection.packages[0].delivery_package_id,"delivery-1");
});
test("recorded source sessions are scoped facts, never browser-inferred source permission",()=>{
  const record={session_id:"work-session:delivery-1:work",work_item_ids:["work-item-3"],updated_at:at,state:"recorded"};
  const model=projectCanonicalDeliveryOverview(overview({posture:"In Progress",sessions:[record]}),"revision",at);
  assert.deepEqual(model.packages[0].work_sessions,[record]);assert.equal(model.packages[0].available_actions.length,0);
  for(const wrong of [{...record,work_item_ids:["work-item-999"]},{...record,state:"approved"}]) assert.throws(()=>projectCanonicalDeliveryOverview(overview({sessions:[wrong]}),"revision",at));
  const bad=overview();bad.operational_initiatives[0].execution_navigation.prepared_work_item_ids=[999];
  assert.throws(()=>projectCanonicalDeliveryOverview(bad,"revision",at));
});
