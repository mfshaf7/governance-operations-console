import assert from 'node:assert/strict';
import test from 'node:test';
import {readProposalCollection,proposalCollectionComplete} from '../../src/domain-workspaces/proposal/live-runtime/proposal-collection-read.ts';
import {projectCanonicalRepositoryGateRequests,repositoryRequestAttentionCount} from '../../src/domain-workspaces/operation-integrations/proposal-repository-live-projection.ts';
import {projectProposalOwnerAttention} from '../../src/domain-workspaces/proposal/read-model/attention-source.ts';
import {projectAgentOwnerSnapshot,buildAgentWorkspaceContext} from '../../src/console-shell/context/agent-workspace-context.ts';
import {proposalCompletionRecord} from '../support/proposal-completion-fixture.mjs';

function record(id,pending=false){
 const r=proposalCompletionRecord({proposal_id:`idea-${id}`,record_ref:`openproject://work_packages/${id}`,title:`Synthetic proposal ${id}`,status:pending?'accepted':'implemented',
  ...(pending?{route:{target:'prototype',rationale:'New source needed',source_custody:{classification:'new-repo-required',repository_mode:'new',repository_gate_state:'pending',owner:null,source_ref:null,rationale:'New source needed'}}}:{} )});
 r.history={...r.history,proposal_id:r.projection.proposal_id,events:[],next_cursor:null};r.summaryOnly=true;return r;
}
function page(records,next,total=26){return{mode:'live',status:'current',error:null,observedAt:new Date().toISOString(),records,page:{selector:{query:'',status:'all',ingress:'all'},source_total:total,next_cursor:next}};}
const first=()=>Array.from({length:25},(_,i)=>record(i+1));
test('later-page requests and required moves survive collection read while summaries never fetch history',async()=>{
 const reads=[],progress=[];
 const snapshot=await readProposalCollection(async(url)=>{reads.push(url);return Response.json(url.includes('cursor=')?page([record(26,true)],null):page(first(),'page-two'));},{onProgress:s=>progress.push(s)});
 assert.equal(reads.length,2);assert.match(reads[1],/cursor=page-two/);assert.equal(proposalCollectionComplete(snapshot),true);
 assert.equal(snapshot.records.length,26);assert.equal(progress[0].coverage.complete,false);
 assert.equal(repositoryRequestAttentionCount(snapshot),1);assert.equal(projectCanonicalRepositoryGateRequests(snapshot).find(r=>r.proposalId==='idea-26')?.sourceCurrent,true);
 const attention=projectProposalOwnerAttention({state:'current',payload:snapshot,capturedAt:new Date().toISOString()});
 assert.ok(attention.candidates.some(c=>c.route.entryIntent.subjectRef==='idea-26'));
 assert.match(projectAgentOwnerSnapshot('proposals',snapshot,new Date().toISOString()).detail,/^26 proposals/);
 assert.ok(snapshot.records.every(r=>r.summaryOnly&&r.history.events.length===0));
});
test('an interrupted later page exposes partial coverage and never reports zero remaining requests',async()=>{
 let calls=0;const snapshot=await readProposalCollection(async()=>++calls===1?Response.json(page(first(),'page-two')):Response.json({error:'Temporary outage'},{status:503}));
 assert.equal(snapshot.coverage.complete,false);assert.equal(snapshot.records.length,25);assert.equal(repositoryRequestAttentionCount(snapshot),null);
 const summary=projectAgentOwnerSnapshot('proposals',snapshot,new Date().toISOString());assert.match(summary.detail,/^Partial: 25 of 26/);
 const context=buildAgentWorkspaceContext({proposals:summary},new Date().toISOString(),'PROPOSAL');assert.match(context.status,/incomplete/);assert.equal(context.displayTone,'warn');
});
for(const status of [401,403,409])test(`later-page refusal ${status} fails closed instead of exposing a combined current collection`,async()=>{
 let calls=0;await assert.rejects(()=>readProposalCollection(async()=>++calls===1?Response.json(page(first(),'page-two')):Response.json({},{status})),/could not be confirmed/);
});
for(const kind of ['repeat-cursor','duplicate-record','changed-total'])test(`collection refuses ${kind}`,async()=>{
 let calls=0;await assert.rejects(()=>readProposalCollection(async()=>Response.json(++calls===1?page(first(),'page-two'):page([record(kind==='duplicate-record'?1:26)],kind==='repeat-cursor'?'page-two':null,kind==='changed-total'?27:26))),/changed|invalid/);
});
test('collection memory budget is explicit partial coverage rather than a silently complete record ceiling',async()=>{
 const heavy=first();for(const r of heavy)r.projection.body='x'.repeat(60_000);
 const more=Array.from({length:15},(_,i)=>record(26+i));for(const r of more)r.projection.body='x'.repeat(60_000);
 let calls=0;const snapshot=await readProposalCollection(async()=>Response.json(++calls===1?page(heavy,'page-two',40):page(more,null,40)));
 assert.equal(snapshot.coverage.complete,false);assert.equal(snapshot.coverage.total,40);assert.equal(snapshot.coverage.next_cursor,'page-two');
 assert.match(snapshot.coverage.detail,/read budget/);assert.equal(repositoryRequestAttentionCount(snapshot),null);
});
