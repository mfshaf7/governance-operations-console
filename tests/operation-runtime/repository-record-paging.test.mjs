import assert from 'node:assert/strict';
import test from 'node:test';
import {readRepositoryCustodyRegister} from '../../src/domain-workspaces/repository/live-runtime/repository-custody-live-readback.ts';
import {buildRepositoryProvisionRequest,provisionRepository,linkExistingRepositoryCustody} from '../../src/domain-workspaces/repository/server/repository-custody-oos-client.ts';
import {provisioningResult} from '../support/repository-provisioning-result.mjs';
import {repositoryWorkspaceName} from '../../src/domain-workspaces/repository/domain/repository-workspace-reference.ts';
const ref={uri:'fixture://repository/authority',digest:`sha256:${'a'.repeat(64)}`};
const config={operatorId:'operator:synthetic',policyProfileRef:ref,credentialBindingRef:ref};
const intent=i=>({approvalNote:'Approve only this synthetic repository.',custodyKind:'dedicated-owner-repo',repositoryDescription:'A test repository.',repositoryName:`item-${i}`,repositoryOwner:'example-company',requestedAt:'2026-11-05T00:00:00Z',requestId:`repository-custody-request:page-${i}`,templateReviewed:true,visibility:'private',workspaceOwnerRef:`repo:example-company--item-${i}`});
const result=i=>provisioningResult(buildRepositoryProvisionRequest(intent(i),config));
const page=(records,next_cursor=null)=>Response.json({schema_version:1,mode:'live',status:'current',records,next_cursor});

test('unsupported workspace identifiers fail before either create or link can call an owner',async()=>{
 for(const value of ['invalid','repo:UPPER CASE','component:source','repo:../source']){
  assert.equal(repositoryWorkspaceName(value),null);
  let calls=0;const options={env:{},fetchImpl:async()=>{calls++;throw new Error('Must not fetch');}};
  await assert.rejects(provisionRepository({...intent(1),workspaceOwnerRef:value},options),{code:'repository_workspace_reference_invalid'});
  await assert.rejects(linkExistingRepositoryCustody({...intent(1),providerHost:'github.com',providerRepositoryId:'123',repositoryId:'repo-provider-123',workspaceOwnerRef:value},options),{code:'repository_workspace_reference_invalid'});
  assert.equal(calls,0);
 }
 assert.equal(repositoryWorkspaceName('repo:example-company--notes.docs'),'example-company--notes.docs');
});

test('request history remains pageable past 250 records without automatic full-history reads',async()=>{
 const records=Array.from({length:281},(_,i)=>result(i+1));let calls=0,cursor=null,count=0;
 const fetchImpl=async url=>{calls++;const params=new URL(url,'http://fixture.test').searchParams;
  const start=params.has('cursor')?Number.parseInt(params.get('cursor'),16):0;
  return page(records.slice(start,start+25),start+25<records.length?(start+25).toString(16).padStart(64,'0'):null);};
 do{const response=await readRepositoryCustodyRegister(fetchImpl,{cursor});count+=response.records.length;cursor=response.next_cursor;
  if(calls===1)assert.equal(count,25);
 }while(cursor);
 assert.equal(count,281);assert.equal(calls,12);
});

test('repository and Proposal filters are sent to the owner and foreign readbacks are rejected',async()=>{
 let url;
 const response=await readRepositoryCustodyRegister(async input=>{url=input;return page([result(1)]);},{view:'register',providerRepositoryId:'1350916928'});
 assert.equal(response.records.length,1);
 const params=new URL(url,'http://fixture.test').searchParams;
 assert.equal(params.get('view'),'register');assert.equal(params.get('provider_repository_id'),'1350916928');
 await assert.rejects(readRepositoryCustodyRegister(async()=>page([result(1)]),{view:'register',providerRepositoryId:'999'}));
 await assert.rejects(readRepositoryCustodyRegister(async()=>page([result(1)]),{proposalId:'idea-9'}));
 await assert.rejects(readRepositoryCustodyRegister(async()=>page([result(1),result(2)]),{view:'register'}));
});

test('failed and nonadvancing continuation pages remain explicit errors',async()=>{
 const cursor='a'.repeat(64);
 await assert.rejects(readRepositoryCustodyRegister(async()=>page([],cursor),{cursor}),/did not advance/);
 await assert.rejects(readRepositoryCustodyRegister(async()=>Response.json({retryable:true},{status:503}),{cursor}),error=>error.retryable===true);
});
