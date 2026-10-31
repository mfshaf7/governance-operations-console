import assert from "node:assert/strict";
import test from "node:test";
import {repositoryUiFixture} from "../support/repository-ui-fixture.mjs";
import {projectRepositoryProvisioningResults,repositoryCustodyHistoryForRecord} from "../../src/domain-workspaces/repository/live-runtime/repository-custody-live-projection.ts";
import {repositoryHistoryReceiptFacts,repositoryHistoryTimelineRows} from "../../src/domain-workspaces/repository/presentation/dialogs/history/repository-history-view-model.ts";
import {repositoryLifecycleExecutionAvailable,repositoryLifecycleState,repositoryLifecycleStateFacts} from "../../src/domain-workspaces/repository/presentation/dialogs/lifecycle/repository-lifecycle-view-model.ts";

test("Repository history retains all original identity-bound owner receipts without duplicating them or inventing admission",async()=>{
  const {result}=await repositoryUiFixture(),original=structuredClone(result);
  const [record]=projectRepositoryProvisioningResults([],{result});
  const earlier=structuredClone(result);earlier.receipt_ref.digest=`sha256:${"c".repeat(64)}`;earlier.receipt.completed_at="2026-06-20T08:00:00Z";
  const foreign=structuredClone(result);foreign.provider_readback.repository_identity.provider_repository_id="999999";
  const retained=repositoryCustodyHistoryForRecord(record,[result,earlier,result,foreign]);
  assert.equal(retained.length,2);
  const rows=repositoryHistoryTimelineRows([],null,retained);
  assert.equal(rows.length,2);assert.equal(rows[0].timestamp,earlier.receipt.completed_at);
  assert.ok(rows.every(row=>row.label==="Repository Provisioning"));
  const index=repositoryHistoryReceiptFacts([],null,retained);
  assert.equal(index.filter(f=>f.label==="Provisioning").length,1);
  assert.equal(index.find(f=>f.label==="Source").value,"operator-orchestration-service");
  assert.equal(index.find(f=>f.label==="Admission").value,"No local admission receipt");
  assert.deepEqual(result,original);
});

test("Lifecycle execution remains blocked by unavailable capability, owner state or identity while exact first-custody initialization works",async()=>{
  const {result}=await repositoryUiFixture();const [record]=projectRepositoryProvisioningResults([],{result});
  const snapshot={mode:"live",status:"not-initialized",audit:null,error:null,observedAt:"2026-06-21T10:00:00Z"};
  assert.equal(repositoryLifecycleExecutionAvailable(record,snapshot,result,true,false),true);
  assert.equal(repositoryLifecycleExecutionAvailable(record,snapshot,undefined,true,false),false);
  assert.equal(repositoryLifecycleExecutionAvailable(record,snapshot,result,false,false),false);
  assert.equal(repositoryLifecycleExecutionAvailable(record,snapshot,result,true,true),false);
  assert.equal(repositoryLifecycleExecutionAvailable(record,{...snapshot,status:"offline"},result,true,false),false);
  assert.equal(repositoryLifecycleExecutionAvailable(record,{...snapshot,mode:"disconnected-preview"},result,true,false),false);
  const foreign=structuredClone(result);foreign.provider_readback.repository_identity.provider_repository_id="999999";
  assert.equal(repositoryLifecycleExecutionAvailable(record,snapshot,foreign,true,false),false);
  const facts=repositoryLifecycleStateFacts(repositoryLifecycleState(record),false);
  assert.equal(facts.find(f=>f.label==="Provider").value,"Not verified");
});
