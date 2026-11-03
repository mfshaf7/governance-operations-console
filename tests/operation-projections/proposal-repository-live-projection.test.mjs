import assert from "node:assert/strict";
import test from "node:test";
import { projectCanonicalRepositoryGateRequests } from "../../src/domain-workspaces/operation-integrations/proposal-repository-live-projection.ts";

test("Repository requests are reconstructed only from canonical accepted Proposal truth", () => {
  const projection = { proposal_id: "idea-851", title: "Build the to-do app", record_ref: "openproject://work_packages/851", record_version: "version-2",
    status: "accepted", projection_state: "current", route: { source_custody: { classification: "new-repo-required", repository_gate_state: "pending" } } };
  const snapshot = { mode: "live", status: "current", records: [{ projection }] };
  for (let reload = 0; reload < 2; reload++) {
    const [request] = projectCanonicalRepositoryGateRequests(JSON.parse(JSON.stringify(snapshot)));
    assert.equal(request.proposalId, "idea-851");
    assert.equal(request.recordVersion, "version-2");
    assert.equal(request.recovery, null);
  }
  for (const override of [{ mode: "disconnected-preview" }, { status: "offline" }]) {
    assert.deepEqual(projectCanonicalRepositoryGateRequests({ ...snapshot, ...override }), []);
  }
  projection.repository_resolution = { source_version: "version-1", notes: "Exact original notes", custody_request_id: "repository-custody-request:todo" };
  projection.repository_resolution_history_pending = true;
  const [recovered] = projectCanonicalRepositoryGateRequests(snapshot);
  assert.equal(recovered.recovery.source_version, "version-1");
  assert.equal(recovered.recovery.notes, "Exact original notes");
  assert.equal(recovered.recovery.custody_request_id, "repository-custody-request:todo");
});

import { repositoryRequestAttentionCount, repositoryRequestState } from "../../src/domain-workspaces/operation-integrations/proposal-repository-live-projection.ts";
import { projectProposalOwnerAttention } from "../../src/domain-workspaces/proposal/read-model/attention-source.ts";
import { proposalCompletionRecord } from "../support/proposal-completion-fixture.mjs";
const receipt = { resolution_id: "resolution:test", custody_request_id: "repository-custody-request:test",
  receipt_ref: "receipt://test", proposal_id: "idea-851", source_version: "version-16",
  repository_request_ref: "repo-request://proposal/idea-851", resolved_owner: "repo:test", resolved_repo_ref: "https://example.test/repo",
  recorded_at: "2026-06-21T08:00:00Z", notes: "Exact original confirmation",
  custody_receipt_ref: {uri: "receipt://custody", digest: `sha256:${"a".repeat(64)}`} };
function source(overrides={}) {
 return {mode:"live",status:"current",error:null,observedAt:new Date().toISOString(),records:[proposalCompletionRecord({
  status:"accepted",route:{target:"prototype",rationale:"New source",source_custody:{classification:"new-repo-required",repository_mode:"new",repository_gate_state:"pending",owner:null,source_ref:null,rationale:"Source required"}},...overrides})]};
}
test("request attention counts pending and interrupted confirmation but keeps completed history outside attention",()=>{
 const pending=source(); assert.equal(repositoryRequestAttentionCount(pending),1);
 const recovery=source({repository_resolution:receipt,repository_resolution_history_pending:true});
 assert.equal(repositoryRequestState(projectCanonicalRepositoryGateRequests(recovery)[0]),"confirmation");
 assert.equal(repositoryRequestAttentionCount(recovery),1);
 const resolved=source({repository_resolution:receipt,repository_resolution_history_pending:false});
 assert.equal(repositoryRequestAttentionCount(resolved),0);
 assert.equal(repositoryRequestState(projectCanonicalRepositoryGateRequests(resolved)[0]),"resolved");
 const implemented=source({status:"implemented",repository_resolution:receipt});
 assert.equal(projectCanonicalRepositoryGateRequests(implemented).length,1);
 assert.equal(repositoryRequestAttentionCount(implemented),0);
 assert.equal(repositoryRequestAttentionCount(source({status:"parked"})),0);
});
test("unknown source counts do not become zero and retained metadata cannot authorize confirmation",()=>{
 assert.equal(repositoryRequestAttentionCount(null),null);
 for(const snapshot of [{...source(),status:"offline"},source({projection_state:"stale"})]){
  assert.equal(repositoryRequestAttentionCount(snapshot),null);
  assert.equal(projectCanonicalRepositoryGateRequests(snapshot).length,0);
  const retained=projectCanonicalRepositoryGateRequests(snapshot,{retainStale:true});
  assert.equal(retained.length,1);assert.equal(retained[0].sourceCurrent,false);
 }
 assert.equal(repositoryRequestAttentionCount({...source(),records:[]}),0);
 assert.deepEqual(projectCanonicalRepositoryGateRequests({...source(),mode:"disconnected-preview"},{retainStale:true}),[]);
});
test("live attention sends pending and recovery requests to their exact Repository target without duplicate Proposal attention",()=>{
 for(const recovery of [false,true]){
  const snapshot=source(recovery?{repository_resolution:receipt,repository_resolution_history_pending:true}:{});
  if(recovery)Object.assign(snapshot.records[0].projection.route.source_custody,{repository_gate_state:"resolved",owner:receipt.resolved_owner,source_ref:receipt.resolved_repo_ref});
  const attention=projectProposalOwnerAttention({payload:snapshot,state:"current",capturedAt:new Date().toISOString()});
  assert.equal(attention.candidates.length,1);
  const candidate=attention.candidates[0];
  assert.equal(candidate.route.entryIntent.subjectRef,"idea-851");
  assert.equal(candidate.route.entryIntent.target.id,"workbench:repository");
  assert.equal(candidate.route.entryIntent.requiredMoveRef,"repository.resolve-proposal-gate");
  assert.equal(candidate.source.mode,"live");
  assert.equal(candidate.attentionClass,recovery?"recovery":"required-action");
 }
});

import { repositoryCreationForProposal } from "../../src/domain-workspaces/operation-integrations/proposal-repository-custody.ts";
import { repositoryCurrentOwnerRepoCatalogOptions } from "../../src/domain-workspaces/operation-integrations/repository-owner-repo-catalog-projection.ts";
test("new requirements accept only their own creation correlation; existing and unrelated custody remain outside the selector",()=>{
 const result={request:{action:"provision-new",correlation:{correlation_id:"repo-request://proposal/idea-851"}}};
 assert.equal(repositoryCreationForProposal(result,"idea-851"),true);
 assert.equal(repositoryCreationForProposal(result,"idea-852"),false);
 assert.equal(repositoryCreationForProposal({...result,request:{...result.request,action:"link-existing"}},"idea-851"),false);
 assert.equal(repositoryCreationForProposal({request:{action:"provision-new",correlation:{correlation_id:"repository-custody-request:standalone"}}},"idea-851"),false);
});
test("existing owner choices use active current Inventory with no static fallback",()=>{
 assert.deepEqual(repositoryCurrentOwnerRepoCatalogOptions(null),[]);
 const inventory=[{kind:"repo",name:"current-owner",record_id:"repo:current-owner",posture:"active",retired_collection:false},
  {kind:"repo",name:"retired",posture:"retired"},{kind:"repo",name:"suspended",posture:"suspended"},
  {kind:"repo",name:"retired-collection",posture:"active",retired_collection:true},{kind:"product",name:"not-source",posture:"active"}];
 assert.deepEqual(repositoryCurrentOwnerRepoCatalogOptions({inventory}),[{label:"current-owner",owner:"repo:current-owner",value:"repo://current-owner"}]);
});

import {repositoryFulfilmentForProposal} from "../../src/domain-workspaces/operation-integrations/proposal-repository-custody.ts";
test("reviewed attachment and creation both fulfil their exact request, while unrelated receipts do not",()=>{
 for(const action of ["link-existing","provision-new"]){
  const result={request:{action,correlation:{correlation_id:"repo-request://proposal/idea-851"}}};
  assert.equal(repositoryFulfilmentForProposal(result,"idea-851"),true);
  assert.equal(repositoryFulfilmentForProposal(result,"idea-852"),false);
  result.request.correlation.correlation_id="standalone";assert.equal(repositoryFulfilmentForProposal(result,"idea-851"),false);
 }
});
