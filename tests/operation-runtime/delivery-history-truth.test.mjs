import test from "node:test";
import assert from "node:assert/strict";
import { readCanonicalDeliveryWorkspace, readCanonicalDeliveryHistory } from "../../src/domain-workspaces/delivery/server/delivery-workspace-oos-client.ts";
import { deliveryModelForScope, projectDeliveryIntakeHistory } from "../../src/domain-workspaces/delivery/live-runtime/delivery-history-projection.ts";
import { assertDeliveryHistoryProjection } from "../../src/domain-workspaces/delivery/live-runtime/delivery-history-live-contract.ts";
import { projectCanonicalDeliveryWorkspace } from "../../src/domain-workspaces/delivery/live-runtime/delivery-workspace-live-projection.ts";
import { getDeliveryPackagesByWorkflowPhase, getExecutionBoardPackages } from "../../src/domain-workspaces/delivery/read-model/selectors/workflow-package-selectors.ts";
import { intakeEvidenceIssuesForView } from "../../src/domain-workspaces/delivery/presentation/surfaces/intake/intake-view-model.ts";
import { deliveryOverviewStats } from "../../src/domain-workspaces/delivery/presentation/workspace/workspace-count-model.ts";
import { canonicalSourceResponse, assertCanonicalSourceRequest } from "../support/console-source-projection.mjs";

const env = {OOS_BASE_URL:"http://127.0.0.1:8080", OOS_CALLER_ID:"governance-operations-console", OOS_CALLER_SECRET:"test-secret",GOVERNANCE_CONSOLE_OPERATOR_ID:"operator:sample"};
const at="2026-10-25T01:00:00Z", ref="openproject://work_packages/71";
const binding = recordRef => ({recordRef,sourceOwner:"workspace-delivery-art"});
const node=(id,status)=>({id,status,type:"Epic",subject:`Synthetic package ${id}`,record_ref:`openproject://work_packages/${id}`,children:[],ready_contract_applicable:true,ready_contract_satisfied:false});
function inventory(){return {workflow_id:"delivery-initiatives",project:{identifier:"workspace-delivery-art"},summary:{total:4},initiatives:[
  [71,"done"],[72,"new"],[73,"parked"],[74,"in-progress"]
].map(([id,status])=>({epic:node(id,status),execution_tree:{...node(id,status),children:status==="in-progress"?[{...node(75,"in-progress"),type:"User story"}]:[]},summary:{open_descendant_count:0}}))};}
function source(kind="prototype",id=71){return {
 source_id:`${kind}:original:${id}`,source_kind:kind,source_ref:`record://${kind}/sample-${id}`,source_version:"version-1",packet_ref:`packet:original:${id}`,
 delivery_id:`delivery-${id}`,target_ref:`openproject://work_packages/${id}`,title:`Synthetic package ${id}`,owner_repo:"original-owner",state:"consumed",
 custody:{classification:"existing-repo",owner:"original-owner",rationale:"Approved original custody",source_ref:"repo://original-owner",repository_gate_state:"resolved"},
 receipt_ref:`receipt:original:${id}`,receipt_digest:"sha256:original",recorded_at:at,actor:"operator:sample",evidence_refs:[`openproject://work_packages/${id}/activities/1`]
};}
const page=(sources=[],issues=[],next_cursor=null)=>({schema_version:1,workflow_id:"delivery-intake-sources",sources,issues,next_cursor,coverage:{state:issues.length?"partial":"current",detail:"Original native admissions"},projected_at:at});
const record = {id:"application:original",title:"Work Design applied",state:"applied",at,actor:"operator:sample",receipt_ref:"receipt:design",digest:"sha256:design",evidence_refs:[ref],tone:"ok"};
function history(){return {schema_version:1,workflow_id:"delivery-package-history",delivery_id:"delivery-71",record_ref:ref,package:{title:"Synthetic package 71",status:"done",owner_repo:"later-owner"},
 sections:{intake:{state:"current",detail:"Original intake",data:source()},
 work_design:{state:"current",detail:"Original design",data:{state:"applied",source_ref:ref,records:[record],total_records:1,truncated:false}},
 refinement:{state:"unavailable",detail:"Owner unavailable",data:null},closeout:{state:"current",detail:"Native closeout",data:{state:"done",source_ref:ref,records:[],total_records:0,truncated:false}}},
 events:[],event_count:0,history_state:"partial",mutation_authority:"none",projected_at:at};}
function fetcher(pages,{foreign=false,fail=false}={}){
 let index=0;
 return async(url,init)=>{
  assert.equal(init.method,"GET");assertCanonicalSourceRequest(init);
  if(String(url).includes("/v1/delivery-initiatives?")){
   assert.match(String(url),/include_done=true&include_inactive=true/);
   return canonicalSourceResponse(inventory(),binding("openproject://projects/workspace-delivery-art/initiatives"));
  }
  if(fail)return Response.json({error:"private backend detail"},{status:503});
  assert.match(String(url),/\/v1\/delivery-intake\/sources\?limit=20/);
  if(index>0)assert.match(String(url),/cursor=after%3A71/);
  return canonicalSourceResponse(pages[index++],binding(foreign?"openproject://projects/foreign/intake":"openproject://projects/workspace-delivery-art/intake"));
 };
}

test("cold reads retain original admissions across pages and Current/History keep stages and counts coherent",async()=>{
 const model=await readCanonicalDeliveryWorkspace({env,fetchImpl:fetcher([page([source()],[],"after:71"),page([source("proposal",73)])])});
 assert.equal(model.intake_sources.length,2);assert.equal(model.intake_sources[0].source_custody.owner,"original-owner");
 assert.deepEqual(model.intake_sources[0].evidence_refs,["receipt:original:71", "openproject://work_packages/71/activities/1"]);
 assert.equal(model.audit_events[0].occurred_at,at);assert.equal(model.packages[0].source_custody.owner,"original-owner");
 assert.ok(model.packages.every(p=>p.available_actions.length===0));assert.deepEqual(model.apply_intents,[]);
 const current=deliveryModelForScope(model,"current"), retained=deliveryModelForScope(model,"history");
 assert.deepEqual(current.packages.map(p=>p.delivery_package_id),["delivery-72","delivery-74"]);
 assert.equal(current.intake_sources.length,0);assert.equal(current.audit_events.length,0);
 assert.equal(current.art_tree.roots.length,2);assert.ok(current.packages.some(p=>p.delivery_package_id===current.selected_delivery_package_id));
 assert.equal(getDeliveryPackagesByWorkflowPhase("work_design",current).length,1);
 assert.equal(getExecutionBoardPackages(current).length,1);
 assert.equal(retained.packages.length,4);assert.equal(retained.intake_sources.length,2);
 for(const stage of ["work_design","refinement","execution"])assert.equal(getDeliveryPackagesByWorkflowPhase(stage,retained).length,4);
 const stats=deliveryOverviewStats(retained,4);assert.equal(stats.find(s=>s.id==="done").value,"1");assert.equal(stats.find(s=>s.id==="inactive").value,"1");
});

test("source evidence changes refresh the revision even if canonical inventory does not change",async()=>{
 const read=entry=>readCanonicalDeliveryWorkspace({env,fetchImpl:fetcher([page([entry])])});
 const before=await read(source()),next=source();next.receipt_ref="receipt:changed";
 const after=await read(next);assert.notEqual(before.projection_state.source_revision,after.projection_state.source_revision);
 const outage=await readCanonicalDeliveryWorkspace({env,fetchImpl:fetcher([],{fail:true})});
 assert.equal(outage.packages.length,4);assert.equal(outage.evidence_coverage.intake.state,"unavailable");
 assert.notEqual(outage.projection_state.source_revision,before.projection_state.source_revision);
 assert.match(outage.evidence_coverage.intake.detail,/do not mean/);assert.doesNotMatch(JSON.stringify(outage),/private backend detail/);
});

test("partial owner coverage exposes exact unavailable targets without fake custody or consumed success",async()=>{
 const issues=[{target_ref:"openproject://work_packages/73",state:"unavailable",detail:"Original owner evidence unavailable"}];
 const result=await readCanonicalDeliveryWorkspace({env,fetchImpl:fetcher([page([source()],issues)])});
 assert.equal(result.evidence_coverage.intake.state,"partial");assert.equal(result.evidence_coverage.intake.issue_count,1);
 assert.deepEqual(result.evidence_coverage.intake.issues,issues);assert.equal(result.intake_sources.length,1);
 assert.equal(result.packages.find(p=>p.delivery_package_id==="delivery-73").source_custody,null);
});

test("foreign, conflicting and out-of-inventory Intake projections fail closed while retaining canonical package truth",async()=>{
 const cases=[
  fetcher([page([source()])],{foreign:true}),
  fetcher([page([source()],[],"after:71"),page([source()])]),
  fetcher([page([],[],"after:71"),page([],[],"after:71")]),
  fetcher([page([source("prototype",999)])]),
 ];
 for(const fetchImpl of cases){const p=await readCanonicalDeliveryWorkspace({env,fetchImpl});assert.equal(p.packages.length,4);assert.equal(p.evidence_coverage.intake.state,"unavailable");assert.equal(p.intake_sources.length,0);}
 const model=projectCanonicalDeliveryWorkspace(inventory(),"same-inventory",at);
 assert.throws(()=>projectDeliveryIntakeHistory(model,[source("prototype",999)],[]),/absent/);
});

test("package history preserves original owner evidence and rejects foreign, malformed or invented receipt bindings",async()=>{
 const native=history();assert.equal(assertDeliveryHistoryProjection(native,"delivery-71"),native);
 for(const mutate of [
  v=>{v.record_ref="openproject://work_packages/99";},
  v=>{v.sections.work_design.data.source_ref="openproject://work_packages/99";},
  v=>{v.sections.intake.data.target_ref="openproject://work_packages/99";},
  v=>{v.sections.intake.data.custody.repository_gate_state="pending";},
  v=>{v.sections.work_design.data.records.push(record);},
  v=>{v.sections.work_design.data.records[0].tone="approved";},
  v=>{v.mutation_authority="apply";},
  v=>{v.sections.refinement.data={state:"completed"};},
 ]){const invalid=structuredClone(native);mutate(invalid);assert.throws(()=>assertDeliveryHistoryProjection(invalid,"delivery-71"));}
 let reads=0;const got=await readCanonicalDeliveryHistory("delivery-71",{env,fetchImpl:async(url,init)=>{reads++;assert.equal(init.method,"GET");assert.match(String(url),/\/delivery-71\/history$/);assertCanonicalSourceRequest(init);return canonicalSourceResponse(native,binding(ref));}});
 assert.deepEqual(got.sections.intake.data,source());assert.equal(got.package.owner_repo,"later-owner");assert.equal(reads,1);
 await assert.rejects(readCanonicalDeliveryHistory("71",{env,fetchImpl:async()=>{throw Error("must not read");}}));
 await assert.rejects(readCanonicalDeliveryHistory("delivery-71",{env,fetchImpl:async()=>canonicalSourceResponse(native,binding("openproject://work_packages/99"))}));
});


test("unverified historical bindings respect Current/History and never pretend to match a proved owner or consumed filter", () => {
 const model=projectCanonicalDeliveryWorkspace(inventory(),"scope-source",at);
 const issues=Array.from({length:37},(_,i)=>({target_ref:`openproject://work_packages/${i+100}`,detail:"Original handoff proof unavailable"}));
 issues.push({target_ref:"openproject://work_packages/72",detail:"Current target proof unavailable"});
 const observed=projectDeliveryIntakeHistory(model,[source()],issues);
 assert.deepEqual(intakeEvidenceIssuesForView(deliveryModelForScope(observed,"current"),""),[issues.at(-1)]);
 const retained=deliveryModelForScope(observed,"history");
 assert.equal(intakeEvidenceIssuesForView(retained,"").length,38);
 assert.equal(intakeEvidenceIssuesForView(retained,"work_packages/100").length,1);
 assert.equal(intakeEvidenceIssuesForView(retained,"delivery-71").length,0);
 assert.equal(intakeEvidenceIssuesForView(retained,"","original-owner").length,0);
 assert.equal(intakeEvidenceIssuesForView(retained,"","all","consumed").length,0);
 assert.equal(retained.intake_sources.length,1);assert.equal(retained.evidence_coverage.intake.issue_count,38);
});
