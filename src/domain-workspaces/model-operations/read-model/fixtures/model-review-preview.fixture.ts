import type {ProfileSecurityStatus} from '../../work-model/profile-requests/model-profile-lifecycle-contract.ts';
import type {ModelProfileRequestProjection} from '../../live-runtime/model-operations-live-types.ts';
import type {ProviderConnections} from '../../work-model/provider-connections-contract.ts';
import {providerPresets,experimentalQualification} from '../../work-model/provider-connections-contract.ts';
import type {ModelRuntimeOperation} from '../../work-model/model-runtime-contract.ts';

// Disconnected design inspection only. These are never owner readback or receipts.
const digest='sha256:'+'0'.repeat(64);
export const previewConnectionId='api-'+'d'.repeat(32);
export function modelConnectionsPreview():ProviderConnections {
  const maturity={experimental:true as const,qualification:experimentalQualification};
  return {revision:1,presets:Object.entries(providerPresets).map(([provider,item])=>({provider:provider as keyof typeof providerPresets,label:item.label,endpoint_origin:item.origin,catalogue_supported:provider!=='glm-api',...maturity})),connections:[{
    connection_id:previewConnectionId,provider:'claude-api',name:'Sample API connection',state:'active',credential_generation:digest,credential_present:true,pending_operation:null,updated_at:'2026-01-01T00:00:00Z',...maturity,
  }]};
}
export function modelProfileRequestsPreview():ModelProfileRequestProjection[] {
  return (['under-review','changes-required'] as const).map((state,index)=>{
    const id=`model-profile-request:design-sample-${index+1}`,revision=3;
    return {schema_version:1,workflow_id:'model-profile-request',request_id:id,revision,profile_lifecycle_changed:false,
      request:{schema_version:1,request_id:id,intent:'create',requested_at:'2026-01-01T00:00:00Z',operator_id:'operator:design-sample',correlation_id:'sample:profile-review',delivery_ref:null,idempotency_key:id,
        profile_intent:{profile_id:null,source:null,display_name:index?'Sample revised profile':'Sample profile review',intended_purpose:'Help draft a bounded planning note.',requesting_owner:'sample-project',registered_callers:[{caller_id:'sample-project/planning',owner_repo:'sample-project'}],requested_environments:['dev-integration'],input_data_classification:'internal',admitted_context_ref:{uri:'context://design-sample',digest},required_output_schema_ref:{repo:'sample-project',path:'contracts/planning.schema.json',version:'v1'},human_approval_required:true,operational_expectations:['Keep within the permitted planning context.'],operator_justification:'Design sample for inspecting the review form.'}},
      review_state:state,fulfillment_state:'not-started',decision_ref:null,fulfillment:null,
      requirements:index?[{requirement_id:'requirement:sample',summary:'Clarify the permitted planning output.',owner_repo:'sample-project',next_action:'Revise the original intent.'}]:[],
      latest_receipt:{request_id:id,request_revision:revision,receipt_id:'sample-receipt:profile-review',digest,recorded_at:'2026-01-01T00:00:00Z'},
      history:[{sequence:1,event_type:'sample-review',occurred_at:'2026-01-01T00:00:00Z',actor_id:'operator:design-sample',command_id:'sample:profile-review',review_state_after:state,fulfillment_state_after:'not-started',summary:'Sample review event for visual inspection only.',receipt_ref:{uri:'sample://profile-review',digest}}],next_action:index?'revise-and-resubmit':'record-review-decision',
    };
  });
}
export function modelOperationsPreview():ModelRuntimeOperation[] {
  const id='model-operation:design-sample';
  return [{schema_version:1,workflow_id:'model-operations',request_id:id,revision:1,
    request:{schema_version:1,request_id:id,idempotency_key:id,expected_configuration_revision:1,action:'model.register',input:{backend_id:'sample-cloud',model:'Sample reasoning model'}},
    state:'completed',owner_command_id:'sample:model-command',attempt:1,owner_receipt:null,applied_configuration:null,account_login:null,failure:null,
    history:[{sequence:1,type:'sample-only',state:'completed',occurred_at:'2026-01-01T00:00:00Z'}],next_action:'complete'}];
}

export function modelProfileOptionsPreview(){
 return{schema_version:1 as const,workflows:['planning','review'].map(kind=>({workflow_id:'sample-assistant-v1/'+kind,setup_digest:digest,label:kind==='planning'?'Planning assistant':'Review assistant',purpose:'sample-'+kind,requesting_owner:'sample-project',registered_callers:[{caller_id:'sample-project/'+kind,owner_repo:'sample-project'}],environments:['dev-integration' as const],output_schema_ref:{repo:'sample-project',path:'contracts/'+kind+'.schema.json',version:digest},guide:{behavior:'Sample bounded '+kind+' assistance.',input:'Admitted sample '+kind+' context',output:'A draft for operator review',instructions:'Implemented by the sample integration; request notes do not rewrite these instructions.'},policy_defaults:{allowed_data_scope:['Admitted sample planning context only'],runtime_limits:{max_request_bytes:300000,max_output_tokens:4000,timeout_seconds:120,retry_count:0,max_concurrency:1}},operational_expectations:['Use only the admitted workflow, context and output contract.','Require the recorded human review before activation.']}))};
}

export function modelProfilePolicyReviewPreview(request:ModelProfileRequestProjection):ProfileSecurityStatus {
 return {request_id:request.request_id,revision:request.revision,required:false,authorized:false,prepared:true,acceptance:null,
  edit:{request_id:request.request_id,profile_id:'sample-assistant-v1',intent:'create',environment:'dev-integration',changes:{display_name:request.request.profile_intent.display_name,allowed_data_scope:['Admitted sample planning context only'],runtime_limits:{max_output_tokens:3000}}},
  review:{profile_id:'sample-permission-profile',source_version:'0'.repeat(40),current_state:'not created',result_state:'suspended',affected_workflows:['sample-project/planning'],policy_changes:[]}};
}
