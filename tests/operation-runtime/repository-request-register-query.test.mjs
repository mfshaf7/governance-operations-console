import test from "node:test";
import assert from "node:assert/strict";
import {readRepositoryRequestRegister} from "../../src/domain-workspaces/operation-integrations/server/repository-request-register-query.ts";

function record(index,{gate="pending",eligible=true}={}){
 return {projection:{proposal_id:`idea-${index+1}`,title:`Request ${index}`,record_ref:`openproject://work_packages/${index+1}`,record_version:`version-${index}`,status:eligible?"accepted":"new",projection_state:"current",route:{source_custody:{classification:"new-repo-required",repository_gate_state:gate,source_ref:gate==="resolved"?`repo:sample-${index}`:null}}},summaryOnly:true,history:{events:[]}};
}
test("repository request pages search the whole native source and retain sparse continuation and canonical resolved gates",async()=>{
 const rows=Array.from({length:137},(_,i)=>record(i,{eligible:i>=110,gate:i===136?"resolved":"pending"}));
 const calls=[];const readSource=async(cursor,query)=>{calls.push({cursor,query});const offset=Number(cursor??0);const matches=rows.filter(row=>!query||row.projection.title.toLowerCase().includes(query));return {records:matches.slice(offset,offset+25),page:{next_cursor:offset+25<matches.length?String(offset+25):null}};};
 let cursor=null,seen=[],emptyWindow=false;
 do{const page=await readRepositoryRequestRegister(new URLSearchParams({status:"all",...(cursor?{cursor}:{})}),undefined,{readSource});assert.ok(page.records.length<=25);if(!page.records.length&&page.page.next_cursor)emptyWindow=true;seen.push(...page.records.map(row=>row.proposalId));cursor=page.page.next_cursor;}while(cursor);
 assert.equal(emptyWindow,true);assert.deepEqual(seen,rows.slice(110).map(row=>row.projection.proposal_id));
 const resolved=await readRepositoryRequestRegister(new URLSearchParams({status:"resolved",q:"Request 136"}),undefined,{readSource});assert.equal(resolved.records[0].proposalId,"idea-137");assert.equal(resolved.records[0].gateState,"resolved");assert.equal(resolved.records[0].recordRef,"openproject://work_packages/137");
 const attention=await readRepositoryRequestRegister(new URLSearchParams({status:"attention",q:"Request 136"}),undefined,{readSource});assert.equal(attention.records.length,0);
 assert.ok(calls.some(call=>call.query==="request 136"));
});
test("request continuation rejects changed query and propagates source denial",async()=>{
 const readSource=async()=>({records:Array.from({length:25},(_,i)=>record(i)),page:{next_cursor:"next-owner-page"}});
 const first=await readRepositoryRequestRegister(new URLSearchParams({status:"all"}),undefined,{readSource});
 await assert.rejects(readRepositoryRequestRegister(new URLSearchParams({status:"resolved",cursor:first.page.next_cursor}),undefined,{readSource}),/different search|invalid/);
 for(const status of [401,403])await assert.rejects(readRepositoryRequestRegister(new URLSearchParams(),undefined,{readSource:async()=>{throw Object.assign(Error("Denied"),{status});}}),error=>error.status===status);
});
