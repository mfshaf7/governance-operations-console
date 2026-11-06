"use client";
import {useEffect,useState} from 'react';
import {TerasActionButton,TerasActionRow,TerasContentTray,TerasFieldStack,TerasLoadingState,TerasMetadataList,TerasNoteField,TerasPanel,TerasPanelHeader,TerasTechnicalDetails,TerasTimeline,TerasTimelineItem} from '@/teras';
import type {ModelProfileRequestProjection} from '../../../live-runtime/model-operations-live-types.ts';
import {acceptProfileSecurity,profileLifecycleOperation,profileSecurityStatus} from '../../../live-runtime/model-profile-lifecycle-client.ts';
import type {ProfileLifecycleOperation,ProfileSecurityStatus} from '../../../work-model/profile-requests/model-profile-lifecycle-contract.ts';

import {ModelProfileLifecycleDialog} from '../../workflows/profile-request/model-profile-lifecycle-dialog.tsx';
import {profileRevisionSubject} from '../../shared/model-profile-lifecycle-view-model.ts';
import {profileLifecycleOperationMetadata,profileLifecycleSecurityMetadata,profilePolicyReviewMetadata,profilePolicyChangeMetadata} from '../../shared/model-profile-lifecycle-view-model.ts';
const actionLabels:Record<string,string>={implement:'Prepare source review',continue:'Continue original operation','approve-merge':'Approve & merge reviewed source',reconcile:'Apply & verify running policy',restore:'Roll back this policy change'};
export function ModelProfileImplementationPanel({request,preview,onChanged,previewSecurity=null}:{previewSecurity?:ProfileSecurityStatus|null;request:ModelProfileRequestProjection;preview:boolean;onChanged:(request?:ModelProfileRequestProjection)=>void}){
 const [revisionOpen,setRevisionOpen]=useState(false);
 const [operation,setOperation]=useState<ProfileLifecycleOperation|null>(null),[security,setSecurity]=useState<ProfileSecurityStatus|null>(preview?previewSecurity:null),[reason,setReason]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null),[unknown,setUnknown]=useState(false);
 const relevant=!['rejected','withdrawn'].includes(request.review_state);
 async function read(){if(preview)return;setBusy(true);setError(null);try{setSecurity(await profileSecurityStatus(request.request_id));if(request.review_state==='approved')setOperation(await profileLifecycleOperation(request.request_id));setUnknown(false);}catch(e){setError(e instanceof Error?e.message:'Implementation evidence is unavailable.');}finally{setBusy(false);}}
 useEffect(()=>{let active=true;if(preview){setSecurity(previewSecurity);setOperation(null);return;}if(!preview&&relevant){setBusy(true);Promise.all([profileSecurityStatus(request.request_id),request.review_state==='approved'?profileLifecycleOperation(request.request_id):Promise.resolve(null)]).then(([s,o])=>{if(active){setSecurity(s);setOperation(o);}}).catch(e=>{if(active)setError(e instanceof Error?e.message:'Implementation evidence is unavailable.');}).finally(()=>{if(active)setBusy(false);});}return()=>{active=false;};},[request.request_id,request.revision,request.review_state,preview,relevant,previewSecurity]);
 async function control(action:string){if(preview)return;setBusy(true);setError(null);setUnknown(true);try{setOperation(await profileLifecycleOperation(request.request_id,{action,expected_operation_digest:operation?.operation_digest??null}));setUnknown(false);onChanged();}catch(e){setError(e instanceof Error?e.message:'The original operation outcome is not confirmed.');}finally{setBusy(false);}}
 async function accept(){if(preview)return;setBusy(true);setError(null);setUnknown(true);try{const current=await acceptProfileSecurity(request.request_id,{command_id:`model-profile-security:console-${crypto.randomUUID()}`,expected_revision:request.revision,reason:reason.trim()});setUnknown(false);onChanged(current);}catch(e){setError(e instanceof Error?e.message:'Security acceptance is not confirmed. Read the original before another decision.');}finally{setBusy(false);}}
 if(!relevant)return null;
 return <><TerasPanel frame="padded" treatment="neutral" spacing="normal" fit="content">
 <TerasPanelHeader kicker="Platform implementation" title="From reviewed policy to running state" description="Implementation publishes operating rules to the Platform source repository for human review. Request approval and running permission remain separate."/>
 <TerasFieldStack spacing="normal">
 {preview?<TerasContentTray kicker="Design preview" description="Implementation and Security decisions are disabled. This does not report a live permission change."/>:null}
 {busy?<TerasLoadingState inline label="Checking the original owner operation…"/>:null}
 {error?<TerasContentTray kicker={unknown?'Outcome needs checking':'Owner evidence unavailable'} description={error} actions={<TerasActionButton emphasis="secondary" disabled={busy} onClick={()=>void read()}>Check original operation</TerasActionButton>}/>:null}
 {security?.edit&&['draft','changes-required'].includes(request.review_state)?<TerasActionRow><TerasActionButton emphasis="secondary" disabled={busy||unknown} onClick={()=>setRevisionOpen(true)}>Revise operating policy</TerasActionButton></TerasActionRow>:null}
 {security?.review?<TerasContentTray kicker="Requested policy" description="These are the owner-prepared settings bound to this exact request."><TerasMetadataList items={profilePolicyReviewMetadata(security.review)}/>{security.review.policy_changes.map(change=><TerasContentTray key={change.field} kicker={change.label}><TerasMetadataList items={profilePolicyChangeMetadata(change)}/></TerasContentTray>)}</TerasContentTray>:null}
 {security?.required?<TerasContentTray kicker="Separate Security acceptance" description={security.acceptance?`Recorded by ${security.acceptance.operator_id}: ${security.acceptance.reason}`:security.authorized?'Review this exact source and proposed policy before recording your Security acceptance.':'An admitted Security decision maker must accept this exact policy before activation or exception.'}>
 {!security.acceptance&&security.authorized&&security.prepared&&request.review_state==='under-review'?<><TerasNoteField label="Security acceptance reason" minimumHeight="short" maxLength={2000} value={reason} disabled={busy||unknown} onValueChange={setReason}/><TerasActionRow><TerasActionButton disabled={preview||busy||unknown||!reason.trim()} onClick={()=>void accept()}>Record Security acceptance</TerasActionButton></TerasActionRow></>:null}
 {security.acceptance?<TerasTechnicalDetails items={profileLifecycleSecurityMetadata(security.acceptance)}/>:null}
 </TerasContentTray>:null}
 {operation&&security?.prepared?<>
 <TerasMetadataList items={profileLifecycleOperationMetadata(operation)}/>
 {operation.review?<TerasContentTray kicker="Exact source review" description={`Review head ${operation.review.head}`}><a href={operation.review.url} target="_blank" rel="noopener noreferrer">Open source changes on GitHub</a></TerasContentTray>:null}
 {operation.error?<TerasContentTray kicker="Owner step needs attention" description={operation.error}/>:null}
 <TerasActionRow>{operation.next_action!=='complete'?<TerasActionButton disabled={preview||busy||unknown} onClick={()=>void control(operation.next_action)}>{actionLabels[operation.next_action]??'Continue original operation'}</TerasActionButton>:null}{['queued','authoring','awaiting-review'].includes(operation.state)?<TerasActionButton emphasis="secondary" disabled={preview||busy||unknown} onClick={()=>void control('decline-source')}>Decline source change</TerasActionButton>:null}{operation.rollback_available===true?<TerasActionButton emphasis="secondary" disabled={preview||busy||unknown} onClick={()=>void control('restore')}>Roll back this policy change</TerasActionButton>:null}</TerasActionRow>
 {operation.history.length?<TerasTimeline ariaLabel="Profile implementation events" frame="contained">{operation.history.map((event,index)=><TerasTimelineItem key={index} status="Recorded" tone="info" label={event.state.replace(/-/g,' ')} detail={event.detail} timestamp={event.recorded_at} displayTimestamp={new Date(event.recorded_at).toISOString().replace('T',' ').replace('.000Z',' UTC')}/>)}</TerasTimeline>:null}
 </>:null}
 {security&&!security.prepared?<TerasContentTray kicker="Implementation setup required" description="This request records integration intent. Its implementation must supply reviewed capability code and prepared policy before automatic source review is available."/>:null}
 </TerasFieldStack></TerasPanel>
 {revisionOpen&&security?.edit?<ModelProfileLifecycleDialog profile={profileRevisionSubject(request,security)} revision={{request,selection:security.edit}} preview={preview} onClose={()=>setRevisionOpen(false)} onRecorded={result=>{setRevisionOpen(false);onChanged(result);}}/>:null}</>;
}
