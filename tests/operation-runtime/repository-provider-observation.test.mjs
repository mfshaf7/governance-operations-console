import assert from 'node:assert/strict';
import test from 'node:test';
import {repositoryUiFixture} from '../support/repository-ui-fixture.mjs';
import {providerLookupFor,lifecycleAuditFor} from '../support/repository-history-fixture.mjs';
import {projectRepositoryProvisioningResults} from '../../src/domain-workspaces/repository/live-runtime/repository-custody-live-projection.ts';
import {repositoryProviderObservation,projectRepositoryProviderObservations} from '../../src/domain-workspaces/repository/live-runtime/repository-provider-observation.ts';
import {repositoryHistoryReceiptFacts,repositoryHistoryTimelineRows} from '../../src/domain-workspaces/repository/presentation/dialogs/history/repository-history-view-model.ts';
import {repositoryPostureGroupStateLabel} from '../../src/domain-workspaces/repository/presentation/dialogs/admission/repository-admission-view-model.ts';
async function fixture(){const {result}=await repositoryUiFixture();return {result,record:projectRepositoryProvisioningResults([],{result})[0]};}

test('creation evidence is recorded history and does not establish current GitHub status',async()=>{
 const {result,record}=await fixture();
 assert.equal(repositoryPostureGroupStateLabel(record.admissionPosture[0]),'Recorded');
 assert.ok(record.admissionPosture[0].items.every(item=>item.state==='reference'));
 const snapshot={audit:lifecycleAuditFor(result),mode:'live',status:'current',observedAt:'2026-06-21T10:00:00Z',error:null};
 const observation=repositoryProviderObservation(record,snapshot);
 assert.equal(observation.current,false);assert.equal(observation.label,'Not checked');
 assert.equal(observation.recordedProvider,'active');assert.equal(observation.recordedAt,snapshot.audit.projected_at);
});
test('fresh GitHub archiving is independent of workspace registration and older lifecycle state',async()=>{
 const {result,record}=await fixture();record.admissionState='admitted';const original=structuredClone(record);
 const lookup=providerLookupFor(result,'archived');
 const owner={audit:lifecycleAuditFor(result,'active'),mode:'live',status:'current',observedAt:'2026-06-21T10:00:00Z',error:null};
 const observation=repositoryProviderObservation(record,owner,undefined,false,{readback:lookup,error:null,loading:false});
 assert.equal(observation.current,true);assert.equal(observation.label,'Archived');assert.equal(observation.observedAt,lookup.observed_at);
 assert.equal(observation.recordedProvider,'active');
 const projected=projectRepositoryProviderObservations([record],{[record.id]:{readback:lookup,error:null,loading:false}})[0];
 assert.equal(projected.admissionState,'admitted');assert.equal(projected.lifecycle,record.lifecycle);
 assert.deepEqual(projected.custody,record.custody);assert.deepEqual(record,original);
 assert.equal(repositoryPostureGroupStateLabel(projected.admissionPosture.find(group=>group.id==='provider-state')),'Archived');
});
test('failed or pending refresh retains a dated earlier observation without claiming it is current',async()=>{
 const {result,record}=await fixture();const readback=providerLookupFor(result,'archived');
 for(const state of [{loading:true,error:null},{loading:false,error:'Owner lookup unavailable'}]){
  const observation=repositoryProviderObservation(record,undefined,undefined,false,{readback,...state});
  assert.equal(observation.current,false);assert.equal(observation.retained,'Archived');assert.equal(observation.observedAt,readback.observed_at);
  assert.equal(observation.label,state.loading?'Refreshing':'Unavailable');
 }
});
test('a valid response for another immutable provider identity cannot describe this repository',async()=>{
 const {result,record}=await fixture();const readback={...providerLookupFor(result),provider_repository_id:'999999'};
 const audit=lifecycleAuditFor(result);audit.repository_identity={provider:'github',provider_repository_id:'999999'};
 const observation=repositoryProviderObservation(record,{audit,mode:'live',status:'current',observedAt:'2026-06-21T10:00:00Z',error:null},undefined,false,{readback,loading:false,error:null});
 assert.equal(observation.current,false);assert.equal(observation.retained,null);assert.equal(observation.audit,null);assert.equal(observation.label,'Unavailable');
});
test('history selects the latest receipt per kind by completion time and deduplicates only identical receipts',async()=>{
 const {result}=await fixture();const older=structuredClone(result);
 older.receipt.completed_at='2026-06-20T08:00:00Z';older.receipt_ref.digest=`sha256:${'c'.repeat(64)}`;
 for(const receipts of [[result,older,result],[older,result]]){
  const rows=repositoryHistoryTimelineRows([],null,receipts);assert.equal(rows.length,2);assert.equal(rows[0].timestamp,older.receipt.completed_at);
  const facts=repositoryHistoryReceiptFacts([],null,receipts,false);
  assert.match(facts.find(item=>item.label==='Provisioning').value,new RegExp(result.receipt.completed_at));
  assert.ok(facts.every(item=>!item.label.startsWith('Local')));
 }
});
test('history chronology compares instants across time zones and retains distinct simultaneous receipts',async()=>{
 const {result}=await fixture();const a=structuredClone(result),b=structuredClone(result),c=structuredClone(result);
 a.receipt.completed_at='2026-06-20T12:00:00+08:00';a.receipt_ref.digest=`sha256:${'c'.repeat(64)}`;
 b.receipt.completed_at='2026-06-20T05:00:00Z';b.receipt_ref.digest=`sha256:${'d'.repeat(64)}`;
 c.receipt.completed_at=b.receipt.completed_at;c.receipt_ref.digest=`sha256:${'e'.repeat(64)}`;
 const rows=repositoryHistoryTimelineRows([],null,[b,c,a]);
 assert.equal(rows.length,3);assert.equal(rows[0].timestamp,a.receipt.completed_at);
 const facts=repositoryHistoryReceiptFacts([],null,[b,a],false);
 assert.ok(facts.find(item=>item.label==='Provisioning').value.endsWith(b.receipt.completed_at));
});
