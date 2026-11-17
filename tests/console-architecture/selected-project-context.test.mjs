import assert from "node:assert/strict";
import test from "node:test";
import { assertSelectedProject, selectedProjectCandidate } from "../../src/agent-console/model/selected-project-context.ts";
import { readSelectedProjectKnowledge } from "../../src/agent-console/server/selected-project-context.ts";
import { proposalCompletionRecord } from "../support/proposal-completion-fixture.mjs";
import { canonicalSourceResponse, assertCanonicalSourceRequest } from "../support/console-source-projection.mjs";

const env={OOS_BASE_URL:"http://127.0.0.1:8080",OOS_CALLER_ID:"governance-operations-console",OOS_CALLER_SECRET:"test-only-secret",GOVERNANCE_CONSOLE_OPERATOR_ID:"operator:sample"};
function proposalResponse(record){return canonicalSourceResponse({workflow_id:"proposal-read-snapshot",projection:record.projection,history:record.history},
 {sourceOwner:"workspace-proposals",recordRef:record.projection.record_ref});}
test("selection accepts only exact project kinds and IDs, never arbitrary locations or supplied facts",()=>{
 for(const value of [{kind:"proposal",id:"https://external.invalid"},{kind:"delivery",id:"../private"},{kind:"repository",id:"repo:private"},{kind:"prototype",id:"prototype-../other"},{kind:"proposal",id:"idea-851",body:"forged"}])assert.throws(()=>assertSelectedProject(value));
 const selected={kind:"proposal",id:"idea-851"};assert.deepEqual(assertSelectedProject(selected),selected);
 const candidate=selectedProjectCandidate({...selected,title:"Recorded project"},new Date().toISOString());
 assert.match(candidate.summary,/when you send/);assert.match(candidate.boundary,/Read-only/);
});
test("selected Proposal is re-read through authenticated canonical owner input, with exact revision and no unrelated records",async()=>{
 const record=proposalCompletionRecord({body:"Recorded scope, not a browser draft.",triage_summary:"Keep data local."}),calls=[];
 const fetchImpl=async(url,init)=>{calls.push(String(url));assert.equal(init.method,"GET");assertCanonicalSourceRequest(init);return proposalResponse(record);};
 const first=await readSelectedProjectKnowledge({kind:"proposal",id:"idea-851"},undefined,{env,fetchImpl});
 assert.equal(first.observations.body,record.projection.body);assert.equal(first.observations.recordedTriage,"Keep data local.");
 assert.equal(first.sourceRevision,"version-17");assert.match(calls[0],/\/idea-851\/projection\?include_history=true$/);
 record.projection.body="New current scope.";record.projection.record_version=record.history.record_version="version-18";
 const next=await readSelectedProjectKnowledge({kind:"proposal",id:"idea-851"},undefined,{env,fetchImpl});
 assert.equal(next.sourceRevision,"version-18");assert.equal(next.observations.body,"New current scope.");assert.equal(calls.length,2);
 record.projection.body="password=private-value";await assert.rejects(readSelectedProjectKnowledge({kind:"proposal",id:"idea-851"},undefined,{env,fetchImpl}),/secret-like/);
 record.projection.body="x".repeat(18000);await assert.rejects(readSelectedProjectKnowledge({kind:"proposal",id:"idea-851"},undefined,{env,fetchImpl}),/too large/);
});
test("selected Prototype reads its exact register item without traversing other pages",async()=>{
 const calls=[],body={schema_version:1,workflow_id:"prototype-records",authority_revision:"a".repeat(40),authority_sequence:5,
  registry:{schema_version:1,studio:{},prototypes:[]},captures:[{artifact_type:"proposal-routed-prototype-capture",prototype_id:"prototype:proposal-71",record_ref:"record://prototype-captures/proposal-71",landing_state:"captured",lifecycle:"exploring",entry_packet:{suggestions:{name:"Selected prototype"}},proposal:{proposal_id:"idea-71",record_ref:"openproject://work_packages/71"}}],documents:{},workflows:{landing:[],maturity:[],closure:[]},workflow_sources:{landing:"available",maturity:"available",closure:"available"},canonical_mutation:false};
 const knowledge=await readSelectedProjectKnowledge({kind:"prototype",id:"prototype-proposal-71"},undefined,{env,fetchImpl:async(url,init)=>{calls.push(new URL(url));assertCanonicalSourceRequest(init);return canonicalSourceResponse(body,{sourceOwner:"workspace-prototype-studio",recordRef:"repo://workspace-prototype-studio/prototypes",sourceRef:"repo://workspace-prototype-studio@main"});}});
 assert.equal(calls.length,1);assert.equal(calls[0].searchParams.get("id"),"proposal-71");assert.equal(calls[0].searchParams.get("view"),"register");
 assert.equal(knowledge.title,"Selected prototype");assert.match(knowledge.coverage,/unaccepted/);assert.equal(knowledge.sourceRevision,"a".repeat(40));
});
test("selected Delivery reads exactly one item and never falls back to a global inventory",async()=>{
 const calls=[],binding={sourceOwner:"workspace-delivery-art",recordRef:"openproject://projects/workspace-delivery-art/initiatives"};
 const root={id:71,type:"Epic",subject:"Recorded Delivery",status:"done",record_ref:"openproject://work_packages/71",owner_repo:null,target_pi:null,architecture_anchor_ref:null,required_upstream_ref:null};
 const body={schema_version:1,workflow_id:"delivery-console-overview",project:{identifier:"workspace-delivery-art"},mutation_authority:"none",roots:[root],operational_initiatives:[],deferred_history_refs:[root.record_ref],register_page:{next_cursor:null}};
 const knowledge=await readSelectedProjectKnowledge({kind:"delivery",id:"delivery-71"},undefined,{env,fetchImpl:async(url,init)=>{calls.push(new URL(url));assertCanonicalSourceRequest(init);return canonicalSourceResponse(body,binding);}});
 assert.equal(calls.length,1);assert.equal(calls[0].searchParams.get("id"),"delivery-71");assert.equal(knowledge.title,"Recorded Delivery");assert.equal(knowledge.observations.status,"done");
 let deniedReads=0;await assert.rejects(readSelectedProjectKnowledge({kind:"delivery",id:"delivery-71"},undefined,{env,fetchImpl:async()=>{deniedReads++;return Response.json({error:"The optional view must be console."},{status:400});}}));assert.equal(deniedReads,1);
});
