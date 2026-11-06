import test from 'node:test';
import assert from 'node:assert/strict';
import {requestProjection} from '../support/model-profile-request-fixture.mjs';
import {modelProfileReferenceFields,emptyModelProfileRequestDraft} from '../../src/domain-workspaces/model-operations/work-model/profile-requests/model-profile-request-model.ts';
import {projectLiveModelOperationsReadModel} from '../../src/domain-workspaces/model-operations/live-runtime/model-operations-live-projection.ts';
import {modelProfileDashboardProjection} from '../../src/domain-workspaces/model-operations/presentation/dashboards/model-profile/model-profile-dashboard-view-model.ts';
import {modelProfileInspectorProjection} from '../../src/domain-workspaces/model-operations/presentation/dialogs/profile-inspector/model-profile-inspector-view-model.ts';
import {filterModelProfiles} from '../../src/domain-workspaces/model-operations/presentation/surface/model-operations-control-view-model.ts';
import {modelRouteRegisterContent,modelOperationGuidance} from '../../src/domain-workspaces/model-operations/presentation/surface/model-runtime-control-view-model.ts';
import {modelRuntimePreviewRegistry} from '../../src/domain-workspaces/model-operations/read-model/fixtures/model-runtime.fixture.ts';
import {defaultModelScope} from '../../src/domain-workspaces/model-operations/work-model/model-runtime-routing.ts';
function policyProfile(){return projectLiveModelOperationsReadModel({sourceProjection:{source:{source_version:'a'.repeat(40)},digest:'sha256:'+'0'.repeat(64),profiles:[{profile_id:'agent-console-assist-v1',lifecycle:'active',purpose:'agent-console-assist',allowed_callers:['governance-operations-console/agent-console'],selected_environments:['dev-integration'],activation:{activation_allowed:true,reason:'Accepted policy'},security_review_ref:{uri:'review://synthetic',digest:'sha256:'+'0'.repeat(64)}}]}}).profiles[0];}
test('reference reuse preserves new identity, intent and data choices; never copies an approval',()=>{
 const original=requestProjection({revision:2,reviewState:'approved'}),fresh=emptyModelProfileRequestDraft(),fields=modelProfileReferenceFields(original),draft={...fresh,...fields};
 for(const key of ['requestId','displayName','purpose','dataClassification','environment','justification'])assert.equal(draft[key],fresh[key]);
 assert.equal(draft.admittedContextUri,original.request.profile_intent.admitted_context_ref.uri);
 assert.equal(draft.outputSchemaPath,original.request.profile_intent.required_output_schema_ref.path);
 assert.equal(Object.hasOwn(fields,'decision_ref'),false);assert.notEqual(draft.requestId,original.request_id);
});
test('bounded policy permission never becomes provider health or invocation audit in the dashboard',()=>{
 const profile=policyProfile(),view=modelProfileDashboardProjection(profile);
 assert.equal(profile.evidenceScope,'policy-summary');assert.equal(view.accessLabel,'Policy permits use');
 assert.equal(view.checks.length,5);assert.equal(view.evidenceLabel,'Profile change evidence');
 const policy=modelProfileInspectorProjection(profile,'policy'),audit=modelProfileInspectorProjection(profile,'latest-audit');
 assert.doesNotMatch(JSON.stringify(policy),/Platform-controlled/);assert.equal(audit.bounded,true);assert.match(JSON.stringify(audit.details),/profile-change receipt/);
});
test('human profile names are searchable without exact technical separators',()=>{
 const profiles=[policyProfile()];assert.equal(filterModelProfiles({access:'all',lifecycle:'all',provider:'all',profiles,search:'Agent console assist'}).length,1);
});
test('routing register separates reasoning and connection while preserving false native effort',()=>{
 const registry=modelRuntimePreviewRegistry(),row=modelRouteRegisterContent(registry,defaultModelScope,{});
 assert.equal(row.model,'Sample reasoning model');assert.equal(row.effort,'High');assert.equal(row.fallbacks,'1 fallback');
 const choice=registry.configuration.configuration.default.fallbacks[0];registry.configuration.configuration.default.primary=choice;
 assert.equal(modelRouteRegisterContent(registry,defaultModelScope,{}).effort,'Thinking off');
});
test('uncertain operation outcomes direct recovery of the same original, never claim success',()=>{
 for(const state of ['unknown','blocked'])assert.match(modelOperationGuidance({state}),/original request/);
 assert.match(modelOperationGuidance({state:'completed',request:{action:'model.register'}}),/Choose its workflows/);
});

import {modelProfileRequestEvent,modelProfileRequestChoice,modelProfileRequestStatusMetadata,modelProfileRequestTechnicalMetadata} from '../../src/domain-workspaces/model-operations/presentation/dialogs/request-history/model-profile-request-history-view-model.ts';
test('history labels retain native review and implementation meaning without exposing protocol IDs in the picker',()=>{
 const request=requestProjection({revision:3,reviewState:'under-review'});request.next_action='record-review-decision';
 assert.equal(modelProfileRequestChoice(request),'Console test · Under review');
 assert.doesNotMatch(modelProfileRequestChoice(request),/model-profile-request:/);
 assert.equal(modelProfileRequestStatusMetadata(request).find(row=>row.label==='Implementation').value,'Not started');
 assert.equal(modelProfileRequestStatusMetadata(request).find(row=>row.label==='Next action').value,'Record a review decision.');
});
test('event presentation preserves original summary, exact time and complete evidence when labels are simplified',()=>{
 const request=requestProjection({revision:4,reviewState:'approved'}),event=request.history[0];event.event_type='review-approve';
 const before=structuredClone(event),view=modelProfileRequestEvent(event);
 assert.equal(view.label,'Request approved');assert.equal(view.summary,event.summary);assert.equal(view.timestamp,event.occurred_at);assert.match(view.displayTimestamp,/UTC$/);
 for(const value of [String(event.sequence),event.event_type,event.occurred_at,event.actor_id,event.command_id,event.review_state_after,event.fulfillment_state_after,event.receipt_ref.uri,event.receipt_ref.digest])assert.ok(view.evidence.some(row=>row.value===value));
 assert.deepEqual(event,before);event.event_type='future-native-event';assert.equal(modelProfileRequestEvent(event).label,'Recorded event');assert.ok(modelProfileRequestEvent(event).evidence.some(row=>row.value==='future-native-event'));
});
test('approved request history keeps actual decision evidence visible for inspection',()=>{
 const request=requestProjection({revision:4,reviewState:'approved'}),rows=modelProfileRequestTechnicalMetadata(request);
 assert.ok(rows.some(row=>row.label==='Decision record'&&row.value===request.decision_ref.uri));assert.ok(rows.some(row=>row.label==='Decision digest'&&row.value===request.decision_ref.digest));
 assert.equal(modelProfileRequestStatusMetadata(request).find(row=>row.label==='Implementation').value,'Not started');
});

import {assertModelProfileRequestPage,profileRequestSummary} from '../../src/domain-workspaces/model-operations/work-model/profile-requests/model-profile-history-contract.ts';
test('history summaries preserve valid Unicode names without accepting hidden context or authority',()=>{
 const request=requestProjection({revision:2,reviewState:'submitted'});request.request.profile_intent.display_name='😀'.repeat(160);const row=profileRequestSummary(request),page={schema_version:1,requests:[row],next_cursor:null};
 assert.equal(assertModelProfileRequestPage(page).requests[0].display_name,request.request.profile_intent.display_name);
 assert.throws(()=>assertModelProfileRequestPage({...page,requests:[{...row,admitted_context_ref:request.request.profile_intent.admitted_context_ref}]}),/invalid/);
});
test('history pages reject duplicates, wrong cursors and non-bounded or incomplete summaries',()=>{
 const row=profileRequestSummary(requestProjection({revision:2,reviewState:'submitted'})),page={schema_version:1,requests:[row],next_cursor:row.request_id};
 assert.equal(assertModelProfileRequestPage(page).next_cursor,row.request_id);
 for(const bad of [{...page,requests:[row,row]},{...page,next_cursor:'model-profile-request:another'},{...page,requests:[],next_cursor:row.request_id},{...page,requests:[{...row,revision:0}]},{...page,requests:Array(26).fill(row)}])assert.throws(()=>assertModelProfileRequestPage(bad));
 assert.throws(()=>assertModelProfileRequestPage(page,row.request_id),/out of order/);
});

test('current profile source does not claim that lazy request history or the write path was probed',()=>{
 const view=projectLiveModelOperationsReadModel({sourceProjection:{source:{source_version:'a'.repeat(40)},digest:'sha256:'+'0'.repeat(64),profiles:[]}});
 assert.deepEqual(view.workspaceStatus.items.map(row=>row.id),['registry']);assert.match(view.workspaceStatus.summary,/checked separately/);assert.doesNotMatch(view.workspaceStatus.summary,/OOS request state.*connected/);
});
