import test from 'node:test';import assert from 'node:assert/strict';
import {assertProfileLifecycleOperation,assertProfileLifecyclePreparation} from '../../src/domain-workspaces/model-operations/work-model/profile-requests/model-profile-lifecycle-contract.ts';
import {profileLifecycleOperationMetadata,profilePolicyChangeMetadata} from '../../src/domain-workspaces/model-operations/presentation/shared/model-profile-lifecycle-view-model.ts';
const hash='sha256:'+'a'.repeat(64),requestId='model-profile-request:controlled';
const operation={request_id:requestId,state:'runtime-unverified',source_applied:true,runtime_state:'unverified',next_action:'reconcile',operation_digest:hash,error:null,history:[{state:'source-applied',recorded_at:'2026-11-06T00:00:00Z',detail:'Exact source readback succeeded.'}],review:{url:'https://github.com/mfshaf7/platform-engineering/pull/42',number:42,head:'a'.repeat(40)}};
test('source application never becomes a running success through the lifecycle adapter',()=>{
 const value=assertProfileLifecycleOperation(operation,requestId);const metadata=profileLifecycleOperationMetadata(value);
 assert.equal(metadata.find(row=>row.label==='Source applied').value,'Confirmed');assert.equal(metadata.find(row=>row.label==='Running policy').value,'unverified');
 assert.throws(()=>assertProfileLifecycleOperation({...operation,request_id:'model-profile-request:other'},requestId));
 assert.throws(()=>assertProfileLifecycleOperation({...operation,review:{...operation.review,url:'https://github.com.example.test/mfshaf7/platform-engineering/pull/42'}},requestId));
 assert.throws(()=>assertProfileLifecycleOperation({...operation,operation_digest:'not-a-digest'},requestId));
 assert.throws(()=>assertProfileLifecycleOperation({...operation,state:'verified',runtime_state:'unverified',next_action:'complete'},requestId));
 assert.throws(()=>assertProfileLifecycleOperation({...operation,source_applied:false},requestId));
});
test('policy preparation binds the requested profile, action and exact source before submission',()=>{
 const prepared={schema_version:1,profile_id:'sample-v1',intent:'amend',preparation_digest:hash,current_state:'active',result_state:'suspended',affected_workflows:['sample/planning'],security_acceptance_required:false,impact:'Policy change suspends permission.',source_version:'a'.repeat(40),editable_policy:{allowed_data_scope:['Admitted context.'],runtime_limits:{max_output_tokens:4000}}};
 assert.equal(assertProfileLifecyclePreparation(prepared,'sample-v1','amend').result_state,'suspended');
 assert.throws(()=>assertProfileLifecyclePreparation(prepared,'other-v1','amend'));assert.throws(()=>assertProfileLifecyclePreparation(prepared,'sample-v1','activate'));
 assert.deepEqual(profilePolicyChangeMetadata({field:'max_output_tokens',label:'Response token limit',before:4000,after:3000}),[{label:'Current',value:'4000'},{label:'Requested',value:'3000'}]);
});
