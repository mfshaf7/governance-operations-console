import type{TerasMetadataItem}from'@/teras';
import type{ModelProfileRequestDraft}from'../../../live-runtime/model-operations-live-types.ts';
import type{ModelProfileWorkflowSetup}from'../../../work-model/profile-requests/model-profile-preparation-contract.ts';
export const environmentLabels={'dev-integration':'Local development',stage:'Staging',prod:'Production'};
export const dataChoices=[{label:'Public — safe to share',value:'public'},{label:'Internal — workspace information',value:'internal'},{label:'Confidential — private business or client information',value:'confidential'},{label:'Restricted — specially controlled information',value:'restricted'}];
export function profileRequestSetupMetadata(draft:ModelProfileRequestDraft,setup?:ModelProfileWorkflowSetup):TerasMetadataItem[]{
 return[{label:'Responsible repository',value:setup?.requesting_owner??draft.ownerRepo??'Not selected'},{label:'Workflow identities',value:setup?setup.registered_callers.map(v=>v.caller_id).join(', '):draft.registeredCallers||'Not selected'},{label:'Output contract',value:setup?setup.output_schema_ref.repo+'/'+setup.output_schema_ref.path:[draft.outputSchemaRepo,draft.outputSchemaPath].filter(Boolean).join('/')||'Not selected'},{label:'Contract version',value:setup?.output_schema_ref.version??(draft.outputSchemaVersion||'Not selected')},{label:'Workflow setup version',value:draft.setupDigest||'Explicit integration references'},{label:'Context reference',value:draft.workflowId?'Prepared by the context service when you submit':draft.admittedContextUri||'Not supplied'},{label:'Context digest',value:draft.workflowId?'Returned by context admission':draft.admittedContextDigest||'Not supplied'}];
}

export function profileRequestCapabilityMetadata(setup:ModelProfileWorkflowSetup):TerasMetadataItem[]{
 return setup.guide ? [
 {label:'Behavior',value:setup.guide.behavior},{label:'Input',value:setup.guide.input},{label:'Output',value:setup.guide.output},{label:'Instructions',value:setup.guide.instructions},
 ] : [{label:'Usage guide',value:'No plain-language guide is registered for this integration. Its exact contract remains available in Technical details.'}];
}
