import assert from 'node:assert/strict';
import test from 'node:test';
import {assertRepositoryConnections,repositoryDefaultDestination} from '../../src/domain-workspaces/repository/live-runtime/repository-connections.ts';
import {repositoryDefaultWorkspaceReference} from '../../src/domain-workspaces/repository/work-model/request/repository-request-model.ts';
import {buildRepositoryProvisionRequest,provisionRepository} from '../../src/domain-workspaces/repository/server/repository-custody-oos-client.ts';
import {provisioningResult} from '../support/repository-provisioning-result.mjs';
import {assertRepositoryCustodyWorkflowResult} from '../../src/domain-workspaces/repository/live-runtime/repository-custody-live-contract.ts';
import {projectRepositoryProvisioningResults} from '../../src/domain-workspaces/repository/live-runtime/repository-custody-live-projection.ts';
import {projectRepositoryProviderObservations} from '../../src/domain-workspaces/repository/live-runtime/repository-provider-observation.ts';
import {projectConsoleRuntimeCapabilities} from '../../src/console-integration/configuration/console-runtime-configuration.ts';

const ref=letter=>({uri:`platform-engineering://github-connections/${letter}/provisioning`,digest:`sha256:${letter.repeat(64)}`});
const item=(account,type,letter)=>({id:`github:${account}`,account,account_id:type==='personal'?'11':'22',account_type:type,
 capabilities:{metadata:true,provisioning:true,lifecycle:false},credential_bindings:{metadata:ref(letter),provisioning:ref(letter)}});
const connections=()=>({schema_version:1,default_connection_id:'github:company',connections:[item('solo','personal','a'),item('company','organization','b')]});
const env={GOVERNANCE_CONSOLE_OPERATOR_ID:'operator:console-owner',OOS_BASE_URL:'http://127.0.0.1:8080',OOS_CALLER_ID:'governance-operations-console',OOS_CALLER_SECRET:'test-only-server-secret',
 REPOSITORY_CUSTODY_POLICY_PROFILE_URI:'https://workspace.example/repository-custody',REPOSITORY_CUSTODY_POLICY_PROFILE_DIGEST:`sha256:${'c'.repeat(64)}`};
const intent=()=>({approvalNote:'Approve this selected personal account.',custodyKind:'dedicated-owner-repo',repositoryDescription:'Task notes.',repositoryName:'todo',repositoryOwner:'solo',
 requestedAt:'2026-11-05T00:00:00Z',requestId:'repository-custody-request:personal-route',templateReviewed:true,visibility:'private',workspaceOwnerRef:'repo:solo--todo'});

test('workflow configuration does not require a fixed account binding when OOS resolves the selected connection',()=>{
 const projection=projectConsoleRuntimeCapabilities({...env,GOVERNANCE_CONSOLE_SESSION_PROJECTION_PATH:'/synthetic/session.json'});
 for(const id of ['repository-custody','repository-provisioning'])assert.equal(projection.capabilities.find(item=>item.id===id).mutation.state,'available');
});

test('one destination is automatic; both account types respect an explicit default without inventing another',()=>{
 const value=assertRepositoryConnections(connections()); assert.equal(repositoryDefaultDestination(value).account,'company');
 value.default_connection_id=null; assert.equal(repositoryDefaultDestination(value),null);
 value.connections.pop(); assert.equal(repositoryDefaultDestination(value).account,'solo');
 value.connections[0].capabilities.provisioning=false; assert.equal(repositoryDefaultDestination(value),null);
});
test('same-named GitHub repositories receive distinct default workspace references while aliases remain independent',()=>{
 assert.equal(repositoryDefaultWorkspaceReference('Solo','Todo'),'repo:solo--todo');
 assert.equal(repositoryDefaultWorkspaceReference('company','todo'),'repo:company--todo');
 assert.notEqual(repositoryDefaultWorkspaceReference('solo','todo'),repositoryDefaultWorkspaceReference('company','todo'));
 assert.equal(repositoryDefaultWorkspaceReference('solo',''),'');
});
test('personal creation derives account scope and binding from the backend instead of browser intent or fixed environment',async()=>{
 const calls=[];
 const result=await provisionRepository(intent(),{env,fetchImpl:async(url,init)=>{
  calls.push({url,init});
  if(String(url).endsWith('/connections'))return Response.json(connections());
  const request=JSON.parse(init.body),result=provisioningResult(request);
  result.provider_readback.applied_provisioning.owner_scope='personal';
  return Response.json(result,{status:201});
 }});
 assert.equal(calls.length,2);const submitted=JSON.parse(calls[1].init.body);
 assert.equal(submitted.target.owner_scope,'personal');assert.deepEqual(submitted.authority.credential_binding_ref,ref('a'));
 assert.equal(assertRepositoryCustodyWorkflowResult(result).request.target.owner,'solo');
 assert.doesNotMatch(JSON.stringify(submitted),/test-only-server-secret/);
});
test('unavailable, expired and foreign accounts fail before mutation and personal accounts cannot request Internal',async()=>{
 for(const change of [value=>value.connections[0].capabilities.provisioning=false,value=>value.connections.shift(),value=>value.connections=[]]){
  const value=connections();change(value);if(!value.connections.some(item=>item.id===value.default_connection_id))value.default_connection_id=null;
  const calls=[];
  await assert.rejects(provisionRepository(intent(),{env,fetchImpl:async(url,init)=>{calls.push(init.method);return Response.json(value);}}),{code:'repository_connection_not_ready'});
  assert.deepEqual(calls,['GET']);
 }
 await assert.rejects(provisionRepository({...intent(),visibility:'internal'},{env,fetchImpl:async()=>Response.json(connections())}),{code:'repository_visibility_not_supported'});
});
test('register visibility follows dated exact provider evidence and unknown visibility is never inferred',()=>{
 const config={operatorId:env.GOVERNANCE_CONSOLE_OPERATOR_ID,policyProfileRef:ref('b'),credentialBindingRef:ref('a')};
 const request=buildRepositoryProvisionRequest(intent(),config,'personal');
 const receipt=provisioningResult(request);receipt.provider_readback.applied_provisioning.owner_scope='personal';
 const record=projectRepositoryProvisioningResults([],{receipt})[0];
 assert.equal(record.visibility,'private');assert.equal(record.visibilityObservedAt,receipt.provider_readback.observed_at);
 const lookup={provider:'github',provider_repository_id:record.providerIdentity.repositoryId,visibility:'public',provider_lifecycle_state:'active',observed_at:'2026-11-05T01:00:00Z'};
 assert.equal(projectRepositoryProviderObservations([record],{[record.id]:{readback:lookup,loading:false,error:null}})[0].visibility,'public');
 for(const state of [{loading:true,error:null},{loading:false,error:'GitHub is unavailable'}]){
  const retained=projectRepositoryProviderObservations([record],{[record.id]:{readback:lookup,...state}})[0];
  assert.equal(retained.visibility,'public');assert.equal(retained.visibilityObservedAt,lookup.observed_at);
 }
 const older={...lookup,observed_at:'2020-01-01T00:00:00Z'};
 assert.equal(projectRepositoryProviderObservations([record],{[record.id]:{readback:older,loading:false,error:null}})[0].visibility,'private');
 assert.equal(projectRepositoryProviderObservations([{...record,visibility:undefined}],{})[0].visibility,undefined);
 const foreign={...lookup,provider_repository_id:'999'};
 assert.equal(projectRepositoryProviderObservations([record],{[record.id]:{readback:foreign,loading:false,error:null}})[0].visibility,'private');
});
