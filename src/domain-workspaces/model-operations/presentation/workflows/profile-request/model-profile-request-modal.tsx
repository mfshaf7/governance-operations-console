'use client';
import{useState}from'react';
import{TerasActionButton,TerasContentRegion,TerasContentTray,TerasDialog,TerasDraftCloseGuardDialog,TerasFieldGrid,TerasFieldStack,TerasLoadingState,TerasMetadataList,TerasNoteField,TerasPanel,TerasPanelHeader,TerasSelectField,TerasTechnicalDetails,TerasTextField}from'@/teras';
import type{ModelProfileRequestDraft,ModelProfileRequestProjection}from'../../../live-runtime/model-operations-live-types.ts';
import type{useModelProfileRequestOptions}from'../../../live-runtime/use-model-profile-request-options.ts';
import{modelProfileOriginalRequestMetadata,modelProfileReferenceFields,modelProfileRequestReceiptItems,modelProfileRequestResultSummary,modelProfileReviewComplete}from'../../../work-model/profile-requests/model-profile-request-model.ts';
import{fetchModelProfileRequest}from'../../../live-runtime/model-profile-operator-client.ts';
import{useModelProfileRequestHistory}from'../../../live-runtime/use-model-profile-request-history.ts';
import{dataChoices,environmentLabels,profileRequestSetupMetadata,profileRequestCapabilityMetadata}from'./model-profile-request-view-model.ts';
import{ModelProfilePolicyFields}from'./model-profile-policy-fields.tsx';
type Update=<K extends keyof ModelProfileRequestDraft>(key:K,value:ModelProfileRequestDraft[K])=>void;
type Props={draft:ModelProfileRequestDraft;error:string|null;onClose:()=>void;onSubmit:()=>Promise<void>;onUpdateDraft:Update;open:boolean;pending:boolean;result:ModelProfileRequestProjection|null;preview?:boolean;mode?:'create'|'revise';onRecover?:()=>void;onInspectSampleResult?:()=>void;retainedEnvironments?:readonly string[];referenceRequests?:readonly ModelProfileRequestProjection[];outcomeUnknown?:boolean;workflowOptions?:ReturnType<typeof useModelProfileRequestOptions>;submissionAllowed?:boolean;};
export function ModelProfileRequestModal({draft,error,onClose,onSubmit,onUpdateDraft,open,pending,result,preview=false,mode='create',onRecover,onInspectSampleResult,retainedEnvironments=[],referenceRequests=[],outcomeUnknown=false,workflowOptions,submissionAllowed=true}:Props){
 const[readingReference,setReadingReference]=useState(false);
 if(!open)return null;
 const close=()=>{if(!pending&&!readingReference)onClose();};
 const selected=workflowOptions?.options?.workflows.find(row=>row.workflow_id===draft.workflowId);
 const setupCurrent=!draft.workflowId||workflowOptions?.status==='current'&&selected?.setup_digest===draft.setupDigest;
 const complete=modelProfileReviewComplete(draft)&&setupCurrent&&(mode==='revise'||Boolean(draft.workflowId)||draft.setupDigest==='technical');
 if(result)return <TerasDialog open onClose={close} title={preview?'Sample submission result':mode==='revise'?'Revision recorded':'Request submitted'} kicker="Purpose profiles" width="standard" height="content" contentOverflow="auto"
   description={preview?'Design sample only. Nothing was submitted.':'The request is recorded for review. Submission does not approve or activate a profile.'}
   actions={<><TerasActionButton emphasis="secondary" onClick={close}>Back To Register</TerasActionButton>{onRecover?<TerasActionButton onClick={onRecover}>View original request</TerasActionButton>:null}</>}>
   <TerasMetadataList items={modelProfileRequestResultSummary(result)}/><TerasTechnicalDetails items={modelProfileRequestReceiptItems(result)}/>
 </TerasDialog>;
 return <TerasDialog open onClose={close} closeLabel="Close modal" closeDisabled={pending||readingReference} busy={pending||readingReference} busyLabel={readingReference?'Reading recorded setup…':draft.workflowId?'Preparing and submitting request…':'Recording profile request…'}
   title={mode==='revise'?'Revise purpose profile':'Request purpose profile'} kicker="Purpose profiles" width="large" height="fill" contentOverflow="hidden"
   description="Create a permission profile for an existing Console AI Capability. Its behavior is supplied by the integration; the new profile stays suspended and unselected until reviewed."
   actions={<><TerasActionButton disabled={pending||readingReference} onClick={close} emphasis="secondary">Back To Register</TerasActionButton>{preview&&onInspectSampleResult?<TerasActionButton emphasis="secondary" onClick={onInspectSampleResult}>Inspect sample result</TerasActionButton>:null}{onRecover&&error?<TerasActionButton disabled={pending} onClick={onRecover} emphasis="secondary">Check original request</TerasActionButton>:null}<TerasActionButton busy={pending} disabled={preview||!submissionAllowed||pending||readingReference||outcomeUnknown||!complete} onClick={()=>{if(!preview&&submissionAllowed)void onSubmit().catch(()=>undefined);}}>{pending?'Submitting request':mode==='revise'?'Save Revised Intent':'Submit Request'}</TerasActionButton></>}>
   <TerasContentRegion fill scroll>
   <TerasFieldStack spacing="normal">
    {preview?<TerasContentTray kicker="Design preview" description="Edit the sample form and inspect a sample result. Submission is disabled."/>:null}
    {error?<TerasContentTray kicker={outcomeUnknown?'Result not confirmed':'Request needs attention'} description={outcomeUnknown?'Keep this original request and check its saved result before trying again.':error} actions={draft.workflowId&&!outcomeUnknown&&workflowOptions?<TerasActionButton emphasis="secondary" disabled={pending} onClick={()=>void workflowOptions.refresh()}>Refresh workflow setup</TerasActionButton>:undefined}><TerasTechnicalDetails items={modelProfileOriginalRequestMetadata(draft)}/></TerasContentTray>:null}
    <ProfileRequestFields draft={draft} update={onUpdateDraft} disabled={pending||readingReference||outcomeUnknown} preview={preview} onReferenceBusy={setReadingReference} mode={mode} retainedEnvironments={retainedEnvironments} references={referenceRequests} options={workflowOptions}/>
   </TerasFieldStack>
   </TerasContentRegion>
 </TerasDialog>;
}
function ProfileRequestFields({draft,update,disabled,mode,retainedEnvironments,references,options,preview,onReferenceBusy}:{preview:boolean;onReferenceBusy:(busy:boolean)=>void;draft:ModelProfileRequestDraft;update:Update;disabled:boolean;mode:'create'|'revise';retainedEnvironments:readonly string[];references:readonly ModelProfileRequestProjection[];options?:ReturnType<typeof useModelProfileRequestOptions>}){
 const[pendingWorkflow,setPendingWorkflow]=useState<string|null>(null);
 const[technical,setTechnical]=useState(false),[referenceId,setReferenceId]=useState(''),[referenceError,setReferenceError]=useState<string|null>(null);
 const workflows=options?.options?.workflows??[],selected=workflows.find(row=>row.workflow_id===draft.workflowId);
 const manual=mode==='revise'?technical:!draft.workflowId&&(technical||draft.setupDigest==='technical');
 const select=(id:string)=>{if(id!==draft.workflowId)update('policyChanges',undefined);setTechnical(id==='technical');update('workflowId',id==='technical'?'':id);const setup=workflows.find(row=>row.workflow_id===id);update('setupDigest',id==='technical'?'technical':setup?.setup_digest??'');if(setup&& !setup.environments.includes(draft.environment))update('environment',setup.environments[0]);};
 const environments=mode==='revise'&&retainedEnvironments.length?retainedEnvironments:selected?.environments??['dev-integration','stage','prod'];
 const useReference=async()=>{onReferenceBusy(true);setReferenceError(null);try{const record=preview?references.find(row=>row.request_id===referenceId):await fetchModelProfileRequest(referenceId);if(!record)throw Error('The original setup could not be read.');for(const[key,value]of Object.entries(modelProfileReferenceFields(record)))update(key as keyof ModelProfileRequestDraft,value as never);}catch(cause){setReferenceError(cause instanceof Error?cause.message:'Recorded setup is unavailable.');}finally{onReferenceBusy(false);}};
 return <TerasFieldStack spacing="normal">
  {mode==='create'?<TerasPanel frame="padded" treatment="neutral" spacing="normal">
    <TerasPanelHeader kicker="Console AI Capability" title="Which existing capability will use this profile?" description="The integration supplies its behavior, caller identities and response format."/>
    {options?.status==='loading'?<TerasLoadingState inline label="Reading registered Console AI Capabilities…"/>:null}
    {options?.status==='unavailable'?<TerasContentTray kicker="Workflow setup unavailable" description={options.error??'The workflow registrations could not be read.'} actions={<TerasActionButton emphasis="secondary" onClick={()=>void options.refresh()}>Retry workflow setup</TerasActionButton>}/>:null}
    {options?.status==='current'&&!workflows.length?<TerasContentTray kicker="No registered Console AI Capabilities" description="This installation has no workflow setup available for automatic preparation. An integration maintainer can supply reviewed technical setup."/>:null}
    <TerasSelectField label="Console AI Capability" helper="Choose the AI function this permission profile applies to." value={draft.workflowId||(manual?'technical':'')} disabled={disabled} options={[{label:'Choose a Console AI Capability',value:''},...workflows.map(row=>({label:row.label,value:row.workflow_id})),{label:'Integration maintainer — explicit references',value:'technical'}]} onValueChange={id=>draft.policyChanges?setPendingWorkflow(id):select(id)}/>
    {selected&&draft.setupDigest!==selected.setup_digest?<TerasContentTray kicker="Workflow setup changed" description="Review the current setup before using it for this request." actions={<TerasActionButton disabled={disabled} emphasis="secondary" onClick={()=>select(selected.workflow_id)}>Use current setup</TerasActionButton>}/>:null}
  </TerasPanel>:<TerasContentTray kicker="Existing integration setup" description="The original integration references are included in this revision. Changes still require review." actions={<TerasActionButton emphasis="secondary" disabled={disabled} onClick={()=>setTechnical(value=>!value)}>{technical?'Hide technical setup':'Edit technical setup'}</TerasActionButton>}/>}
  {selected?<TerasPanel frame="padded" treatment="neutral" spacing="normal"><TerasPanelHeader kicker="Registered behavior" title="What this capability does"/><TerasMetadataList items={profileRequestCapabilityMetadata(selected)}/></TerasPanel>:null}
  <TerasPanel frame="padded" treatment="neutral" spacing="normal">
   <TerasPanelHeader kicker="Profile details" title="Describe the request" description="The description and review notes explain your request. They do not rewrite AI instructions or create a new capability."/>
   <TerasTextField label={mode==='revise'?'Request title':'Profile name'} value={draft.displayName} maxLength={160} disabled={disabled} placeholder="For example, Planning assistant" onValueChange={value=>update('displayName',value)}/>
   <TerasNoteField label="Request description" minimumHeight="short" maxLength={2000} value={draft.purpose} disabled={disabled} placeholder="Explain what this permission profile is for." onValueChange={value=>update('purpose',value)}/>
   <TerasNoteField label="Why is this needed?" minimumHeight="short" maxLength={2000} value={draft.justification} disabled={disabled} placeholder="Explain the benefit and why the existing setup is not sufficient." onValueChange={value=>update('justification',value)}/>
   <TerasFieldGrid columns={2} spacing="normal">
    <TerasSelectField label="Environment" value={draft.environment} disabled={disabled||environments.length===1||retainedEnvironments.length>1} helper={retainedEnvironments.length>1?'All original environments are retained.':environments.length===1?'This is the environment registered for this workflow.':undefined} options={environments.map(value=>({value,label:environmentLabels[value as keyof typeof environmentLabels]??value}))} onValueChange={value=>update('environment',value as ModelProfileRequestDraft['environment'])}/>
    <TerasSelectField label="Most sensitive data" value={draft.dataClassification} disabled={disabled} options={dataChoices} onValueChange={value=>update('dataClassification',value as ModelProfileRequestDraft['dataClassification'])}/>
   </TerasFieldGrid>
   <TerasNoteField label={manual||mode==='revise'?'Review notes':'Review notes (optional)'} minimumHeight="short" value={draft.operationalExpectations} maxLength={10000} disabled={disabled} placeholder="Context for the reviewer. Operating rules are set separately below." onValueChange={value=>update('operationalExpectations',value)}/>
  </TerasPanel>
  {selected?.policy_defaults&&mode==='create'?<TerasPanel frame="padded" treatment="neutral" spacing="normal"><TerasPanelHeader kicker="Requested policy" title="Permitted input and limits" description="These settings configure the permission profile. The capability's base rules and provider limits still apply."/>
   <ModelProfilePolicyFields scope={(draft.policyChanges?.allowed_data_scope??selected.policy_defaults.allowed_data_scope).join('\n')}
    limits={Object.fromEntries(Object.entries(draft.policyChanges?.runtime_limits??{}).map(([k,v])=>[k,String(v)]))} currentLimits={selected.policy_defaults.runtime_limits} disabled={disabled}
    onScopeChange={value=>update('policyChanges',{...draft.policyChanges,allowed_data_scope:value.split('\n').map(v=>v.trim()).filter(Boolean)})}
    onLimitChange={(key,value)=>{const limits={...draft.policyChanges?.runtime_limits};if(value==='')delete limits[key];else limits[key]=Number(value);update('policyChanges',{...draft.policyChanges,runtime_limits:limits});}}/>
  </TerasPanel>:null}
  {manual?<TechnicalSetup preview={preview} error={referenceError} draft={draft} update={update} disabled={disabled} references={references} referenceId={referenceId} onReferenceChange={setReferenceId} onUseReference={()=>void useReference()}/>:null}
  {mode==='revise'||selected||manual?<TerasTechnicalDetails items={profileRequestSetupMetadata(draft,selected)}/>:null}
 <TerasDraftCloseGuardDialog open={pendingWorkflow!==null} kicker="Capability selection" title="Discard these unsaved policy settings?" description="Selecting another capability resets its input rules and limits. Your request description is retained." leaveLabel="Change capability" onKeepEditing={()=>setPendingWorkflow(null)} onLeave={()=>{const id=pendingWorkflow;setPendingWorkflow(null);if(id!==null)select(id);}}/>
 </TerasFieldStack>;
}
function TechnicalSetup({draft,update,disabled,referenceId,onReferenceChange,onUseReference,preview,error}:{preview:boolean;error:string|null;draft:ModelProfileRequestDraft;update:Update;disabled:boolean;references:readonly ModelProfileRequestProjection[];referenceId:string;onReferenceChange:(value:string)=>void;onUseReference:()=>void}){
 const history=useModelProfileRequestHistory(true,preview);
 return <TerasPanel frame="padded" treatment="neutral" spacing="normal"><TerasPanelHeader kicker="Integration maintainer" title="Technical setup" description="Maintainer path for already implemented integrations with reviewed references. This records a request; it does not build capability code. Automatic implementation remains unavailable until its policy is prepared."/>
 <TerasFieldStack><TerasSelectField label="Recorded policy references" value={referenceId} disabled={disabled||history.status!=='current'} options={[{label:'Choose a recorded setup',value:''},...(history.page?.requests??[]).map(row=>({label:row.display_name,value:row.request_id}))]} onValueChange={onReferenceChange}/><TerasActionButton emphasis="secondary" disabled={disabled||!referenceId} onClick={onUseReference}>Fill policy references</TerasActionButton>
 {history.status==='loading'?<TerasLoadingState inline label="Loading recorded setups…"/>:null}
 {history.error?<TerasContentTray kicker="Recorded setups unavailable" description={history.error} actions={<TerasActionButton emphasis="secondary" onClick={()=>void history.refresh()}>Retry recorded setups</TerasActionButton>}/>:null}
 {history.hasPrevious||history.page?.next_cursor?<TerasFieldGrid columns={2}><TerasActionButton emphasis="secondary" disabled={disabled||!history.hasPrevious} onClick={()=>{onReferenceChange('');void history.back();}}>Previous setups</TerasActionButton><TerasActionButton emphasis="secondary" disabled={disabled||!history.page?.next_cursor} onClick={()=>{onReferenceChange('');void history.next();}}>Next setups</TerasActionButton></TerasFieldGrid>:null}
 {error?<TerasContentTray kicker="Original setup unavailable" description={error}/>:null}
 </TerasFieldStack>
 <TerasFieldGrid columns={2}>{([['ownerRepo','Requesting repository'],['registeredCallers','Registered callers'],['admittedContextUri','Admitted context URI'],['admittedContextDigest','Admitted context digest'],['outputSchemaRepo','Output schema repo'],['outputSchemaPath','Output schema path'],['outputSchemaVersion','Output schema version']]as const).map(([key,label])=><TerasTextField key={key} label={label} value={draft[key]} disabled={disabled} onValueChange={value=>update(key,value)}/>)}</TerasFieldGrid>
 </TerasPanel>;
}
