import assert from "node:assert/strict";
import test from "node:test";
import {ownerAttentionSnapshot} from "../../src/console-integration/live-attention.ts";
import {projectCommandCenterAttention} from "../../src/command-center/read-model/command-center-attention.ts";
import {projectWorkspacePulseFromAttention} from "../../src/command-center/read-model/workspace-pulse.ts";
import {activityPresentation,isRoutineActivityRead} from "../../src/console-shell/activity/console-activity-view-model.ts";
import {readOlderActivityPage} from "../../src/console-shell/activity/activity-history-page.ts";

const now=Date.parse("2026-10-01T00:00:00Z");
const registration={id:"proposal",label:"Proposal",disposition:"admitted",reason:"Owner actions"};
test("pending owner reads are loading, failed reads are unavailable, and neither invents a zero complete workspace",()=>{
 const pending=ownerAttentionSnapshot(registration,undefined,"owner",()=>[],now);
 assert.equal(pending.source.freshness,"loading");
 const pulse=projectWorkspacePulseFromAttention(projectCommandCenterAttention([pending],new Date(now).toISOString()));
 assert.equal(pulse.posture.id,"loading");assert.match(pulse.signals.find(s=>s.id==="source-coverage").detail,/loading/);assert.equal(pulse.signals.find(s=>s.id==="required-decisions").value,"0+");
 const failed=ownerAttentionSnapshot(registration,{state:"unavailable",capturedAt:new Date(now).toISOString(),payload:null},"owner",()=>[],now);
 assert.equal(failed.source.freshness,"unavailable");assert.equal(projectWorkspacePulseFromAttention(projectCommandCenterAttention([failed],new Date(now).toISOString())).posture.id,"unavailable");
});
const event=(id="event:1")=>({action:{id:"wgcf.ledger.artifact-registry-read",label:"Artifact.Registry.Read"},actor:{kind:"system",ref:"operator-orchestration-service"},causationId:null,category:"state-change",correlationId:null,durability:"source-projected",eventId:id,evidenceRefs:["wgcf://receipts/original"],occurredAt:"2026-10-01T00:00:00Z",outcome:"informational",receiptRef:null,source:{owner:"workspace-governance-control-fabric",authority:"workspace-governance-control-fabric",label:"WGCF governance",ref:"wgcf://history/1",mode:"source-projected"},subject:{kind:"ledger",label:"wgcf://artifacts/delivery-art/sha256/"+"a".repeat(64),ref:"wgcf://artifacts/delivery-art/sha256/"+"a".repeat(64)},summary:"Original immutable technical summary"});
const snapshot=(events,continuations=[])=>({events,continuations,error:null,mode:"live",status:"current",sources:[],observedAt:"2026-10-01T00:00:00Z",truncated:continuations.length>0});
test("activity explains known evidence type without inventing a project and retains original facts",()=>{
 const original=event(),before=structuredClone(original),display=activityPresentation(original);
 assert.match(display.subject,/^Delivery planning evidence · sha256:a{12}…$/);assert.match(display.action,/Evidence registry read/);assert.doesNotMatch(display.title,/[a-f0-9]{64}/);assert.match(display.summary,/does not provide a project name/);assert.deepEqual(original,before);assert.equal(display.category,"Evidence access");
 assert.equal(isRoutineActivityRead(original),true);
 for(const outcome of ["failed","blocked","stale"])assert.equal(isRoutineActivityRead({...original,outcome}),false);
 assert.equal(isRoutineActivityRead({...original,nextActions:[{action:"repair",ownerRef:"owner",reviewAt:null}]}),false);
 const named={...original,subject:{...original.subject,label:"Actual owner project name"}};assert.equal(activityPresentation(named).subject,"Actual owner project name");
});
test("older history uses exact cursors and replaces the window rather than losing bounds",async()=>{
 const previous=snapshot([event("head")],[{owner:"wgcf",cursor:"original_cursor"}]);let requested;
 const next=await readOlderActivityPage(previous,async(url,options)=>{requested={url,options};return new Response(JSON.stringify(snapshot([event("older")],[{owner:"wgcf",cursor:"next_cursor"}])))});
 assert.equal(requested.url,"/api/governance-activity?owner=wgcf&cursor=original_cursor");assert.equal(requested.options.cache,"no-store");assert.deepEqual(next.events.map(e=>e.eventId),["older"]);assert.equal(previous.events[0].eventId,"head");assert.equal(next.continuations[0].cursor,"next_cursor");
});
test("failed, stalled and conflicting history pages cannot replace retained events",async()=>{
 const previous=snapshot([event("head")],[{owner:"wgcf",cursor:"same_cursor"}]);
 await assert.rejects(readOlderActivityPage(previous,async()=>new Response("{}",{status:503})),/unavailable/);
 await assert.rejects(readOlderActivityPage(previous,async()=>new Response(JSON.stringify(snapshot([],[{owner:"wgcf",cursor:"same_cursor"}])))),/did not advance/);
 const two=snapshot([],[{owner:"wgcf",cursor:"w"},{owner:"oos",cursor:"o"}]);
 await assert.rejects(readOlderActivityPage(two,async url=>new Response(JSON.stringify(snapshot([{...event("conflict"),summary:url}])))),/Conflicting/);
 assert.deepEqual(previous.events.map(e=>e.eventId),["head"]);
});
