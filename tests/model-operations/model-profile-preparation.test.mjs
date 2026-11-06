import assert from'node:assert/strict';import test from'node:test';
import{assertModelProfileRequestOptions,modelProfileRequestSubmission,preparedModelProfileInput}from'../../src/domain-workspaces/model-operations/work-model/profile-requests/model-profile-preparation-contract.ts';
import{modelProfileOptionsPreview}from'../../src/domain-workspaces/model-operations/read-model/fixtures/model-review-preview.fixture.ts';
import{emptyModelProfileRequestDraft,modelProfileReviewComplete}from'../../src/domain-workspaces/model-operations/work-model/profile-requests/model-profile-request-model.ts';
import{readModelProfileRequestOptions,submitPreparedModelProfileRequest}from'../../src/domain-workspaces/model-operations/server/model-operations-oos-client.ts';
import{requestProjection}from'../support/model-profile-request-fixture.mjs';
const setup=modelProfileOptionsPreview().workflows[0];
function draft(){return{...emptyModelProfileRequestDraft('model-profile-request:prepared-test'),workflowId:setup.workflow_id,setupDigest:setup.setup_digest,displayName:'Planning help',purpose:'Plan work.',justification:'Needed',ownerRepo:'must-not-be-used',registeredCallers:'injected=must-not-be-used',admittedContextUri:'context://must-not-be-used'};}
const config={baseUrl:'http://owner.test',callerId:'console',callerSecret:'synthetic-only',operatorId:'operator:sample'};
test('normal form is complete with meaningful operator choices, without manual context or schema fields',()=>{
 const value=draft();assert.equal(modelProfileReviewComplete(value),true);const body=modelProfileRequestSubmission(value);assert.equal(Object.hasOwn(body,'ownerRepo'),false);assert.equal(Object.hasOwn(body,'registeredCallers'),false);assert.equal(Object.hasOwn(body,'admittedContextUri'),false);
 const input=preparedModelProfileInput(body);assert.equal(input.workflow_id,setup.workflow_id);assert.deepEqual(input.additional_expectations,[]);assert.equal(Object.hasOwn(input,'operator_id'),false);
});
test('automatic submission rejects technical smuggling, invalid identity and native rule limits',()=>{
 const body=modelProfileRequestSubmission(draft());for(const input of [{...body,callerId:'another'},{...body,setupDigest:'invented'},{...body,requestId:'wrong'},{...body,operationalExpectations:'x'.repeat(501)}])assert.throws(()=>preparedModelProfileInput(input));
});
test('native owner setup is validated and malformed/unbounded options never become choices',()=>{
 const value=modelProfileOptionsPreview();assert.deepEqual(assertModelProfileRequestOptions(value),value);
 for(const bad of [{...value,operatorId:'forged'},{schema_version:1,workflows:[{...setup,registered_callers:[]}]},{schema_version:1,workflows:[{...setup,setup_digest:'fake'}]},{schema_version:1,workflows:[setup,setup]}])assert.throws(()=>assertModelProfileRequestOptions(bad));
});
test('server adapter uses authenticated owner options and prepared endpoint, binding the original ID',async()=>{
 const calls=[],result=requestProjection({revision:2,reviewState:'submitted',requestId:'model-profile-request:prepared-test'});
 const fetchImpl=async(url,init)=>{calls.push({url,init});return Response.json(String(url).endsWith('/options')?modelProfileOptionsPreview():result);};
 await readModelProfileRequestOptions({config,fetchImpl});await submitPreparedModelProfileRequest(modelProfileRequestSubmission(draft()),{config,fetchImpl});
 assert.equal(calls[0].url,'http://owner.test/v1/model-profile-requests/options');assert.equal(calls[1].url,'http://owner.test/v1/model-profile-requests/submit-prepared');const body=JSON.parse(calls[1].init.body);assert.equal(Object.hasOwn(body,'admitted_context_ref'),false);assert.equal(Object.hasOwn(body,'registered_callers'),false);assert.equal(new Headers(calls[1].init.headers).get('x-oos-operator-id'),'operator:sample');
 await assert.rejects(submitPreparedModelProfileRequest(modelProfileRequestSubmission(draft()),{config,fetchImpl:async()=>Response.json(requestProjection({revision:2,reviewState:'submitted',requestId:'model-profile-request:another'}))}),/another|original/i);
});

test('only proven pre-create preparation failures release editing; uncertain original outcomes retain recovery',async()=>{
 const{preparedModelProfileRejectedBeforeCreate}=await import('../../src/domain-workspaces/model-operations/work-model/profile-requests/model-profile-preparation-contract.ts');
 for(const code of ['model_profile_request_workflow_setup_changed','model_profile_request_context_preparation_unavailable'])assert.equal(preparedModelProfileRejectedBeforeCreate(code),true);
 for(const code of ['model_profile_request_busy','model_profile_request_idempotency_conflict','model_operations_oos_unavailable'])assert.equal(preparedModelProfileRejectedBeforeCreate(code),false);
});
