import test from "node:test";
import assert from "node:assert/strict";
import {readDeliveryRegister} from "../../src/domain-workspaces/delivery/server/delivery-register-query.ts";
import {deliveryReadModel} from "../../src/domain-workspaces/delivery/read-model/projections/root-projection.ts";
import {canonicalSourceResponse,assertCanonicalSourceRequest} from "../support/console-source-projection.mjs";

const env={OOS_BASE_URL:"http://127.0.0.1:8080",OOS_CALLER_ID:"governance-operations-console",OOS_CALLER_SECRET:"test-only-secret",GOVERNANCE_CONSOLE_OPERATOR_ID:"operator:synthetic"};
const binding={authority:"operator-orchestration-service",sourceOwner:"workspace-delivery-art",recordRef:"openproject://projects/workspace-delivery-art/initiatives"};

test("deployed pre-register owner rejection uses its complete overview and retains paging and exact originals",async()=>{
 const roots=Array.from({length:31},(_,i)=>({id:2000+i,type:"Epic",subject:`Retained work ${i}`,status:"done",record_ref:`openproject://work_packages/${2000+i}`,owner_repo:null,target_pi:null,architecture_anchor_ref:null,required_upstream_ref:null}));
 const overview={schema_version:1,workflow_id:"delivery-console-overview",project:{identifier:"workspace-delivery-art"},mutation_authority:"none",roots,operational_initiatives:[],deferred_history_refs:roots.map(r=>r.record_ref)};
 const calls=[];
 const fetchImpl=async(url,init)=>{
  const q=new URL(url).searchParams;calls.push(q.get("view"));assert.equal(init.method,"GET");assertCanonicalSourceRequest(init);
  return q.get("view")==="register"?Response.json({error:"The optional view must be console."},{status:400}):canonicalSourceResponse(overview,binding);
 };
 const query=new URLSearchParams({view:"register",surface:"work-design",scope:"history"});
 const first=await readDeliveryRegister(query,undefined,{env,fetchImpl});assert.equal(first.projection.packages.length,25);assert.ok(first.page.next_cursor);
 query.set("cursor",first.page.next_cursor);
 const next=await readDeliveryRegister(query,undefined,{env,fetchImpl});assert.equal(next.projection.packages.length,6);assert.equal(next.page.next_cursor,null);
 assert.deepEqual([...first.projection.packages,...next.projection.packages].map(r=>r.legacy_epic_id),roots.map(r=>r.id));
 query.delete("cursor");query.set("id","delivery-2030");
 const original=await readDeliveryRegister(query,undefined,{env,fetchImpl});assert.equal(original.projection.packages[0].legacy_epic_id,2030);
 assert.deepEqual(calls,["register","console","console","register","console"]);
});

test("permission and unrelated owner rejections never trigger the compatibility overview",async()=>{
 for(const [status,error] of [[401,"Authentication required"],[403,"Not authorized"],[400,"Different invalid parameter"]]){
  let calls=0;const fetchImpl=async()=>{calls++;return Response.json({error},{status});};
  await assert.rejects(readDeliveryRegister(new URLSearchParams({view:"register"}),undefined,{env,fetchImpl}),e=>e.status===status);
  assert.equal(calls,1);
 }
});

test("Delivery register current/history retain canonical scope and reach late matching roots without shrinking the global board",async()=>{
 const baseline=structuredClone(deliveryReadModel),rows=Array.from({length:61},(_,i)=>({...baseline.packages[0],delivery_package_id:`delivery-${1000+i}`,tree_root_id:`root-${i}`,display_name:`Sample ${i}`,source_ref:`openproject://work_packages/${1000+i}`,workflow_phase:"work_design",backend_status:i<3?["done","retired","parked"][i]:"new",package_posture:i<3?["Done","Retired","Deferred"][i]:"New"}));
 const model={...baseline,source_truth:"OpenProject-backed OOS",packages:rows,art_tree:{roots:[]},selected_packages:[]};
 const readSource=async(cursor,id)=>{const offset=Number(cursor??0);return {model:{...model,packages:id?rows.filter(row=>row.delivery_package_id===id):rows.slice(offset,offset+25)},next_cursor:!id&&offset+25<rows.length?String(offset+25):null};};
 for(const scope of ["current","history"]){
  let cursor=null,seen=[];
  do{const result=await readDeliveryRegister(new URLSearchParams({view:"register",scope,surface:"work-design",...(cursor?{cursor}:{})}),undefined,{readSource});assert.ok(result.projection.packages.length<=25);seen.push(...result.projection.packages.map(row=>row.delivery_package_id));cursor=result.page.next_cursor;}while(cursor);
  assert.deepEqual(seen,rows.slice(scope==="current"?3:0).map(row=>row.delivery_package_id));
 }
 const searched=await readDeliveryRegister(new URLSearchParams({view:"register",scope:"history",surface:"refinement",q:"Sample 60"}),undefined,{readSource});
 assert.equal(searched.projection.packages[0].delivery_package_id,"delivery-1060");assert.equal(searched.page.total,null);
 const original=await readDeliveryRegister(new URLSearchParams({view:"register",scope:"history",surface:"refinement",id:"delivery-1000"}),undefined,{readSource});
 assert.equal(original.projection.packages[0].backend_status,"done");
 assert.equal(model.packages.length,61);assert.deepEqual(model.board_summary,baseline.board_summary);
});
