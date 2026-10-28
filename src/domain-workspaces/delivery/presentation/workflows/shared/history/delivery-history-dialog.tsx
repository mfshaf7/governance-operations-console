"use client";
import { useEffect, useState } from "react";
import { TerasActionButton, TerasActionRow, TerasEmptyState, TerasFieldStack, TerasMetadataList, TerasModalShell, TerasPanel, TerasPanelHeader, TerasTimeline, TerasTimelineItem } from "@/teras";
import { assertDeliveryHistoryProjection, type DeliveryHistoryProjection, type DeliveryIntakeRecord } from "../../../../live-runtime/delivery-history-live-contract.ts";

const labels={intake:"Intake",work_design:"Work Design",refinement:"Refinement",closeout:"Delivery closeout"};
export function useDeliveryOwnerHistory(deliveryId:string|null){
  const [projection,setProjection]=useState<DeliveryHistoryProjection|null>(null),[error,setError]=useState<string|null>(null),[revision,setRevision]=useState(0);
  const [pagination,setPagination]=useState({deliveryId,page:1}),[loading,setLoading]=useState(false);
  const page=pagination.deliveryId===deliveryId?pagination.page:1;
  useEffect(()=>{let active=true;const abort=new AbortController();setProjection(current=>current?.delivery_id===deliveryId?current:null);setError(null);if(!deliveryId)return;setLoading(true);
    void fetch(`/api/delivery/history/${encodeURIComponent(deliveryId)}?activity_page=${page}`,{cache:"no-store",signal:abort.signal}).then(async response=>{
      const body=await response.json();if(!response.ok || body.mode!=="live" || body.status!=="current")throw Error("Original Delivery owner history is unavailable. Retry the owner read.");
      const next=assertDeliveryHistoryProjection(body.projection,deliveryId);if(active)setProjection(next);
    }).catch(()=>{if(active)setError("Original owner history could not be verified. Retry the read; any retained content below is from the last successful observation.");}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;abort.abort();};
  },[deliveryId,revision,page]);
  return {projection,error,loading,page,setPage:(next:number)=>setPagination({deliveryId,page:Math.max(1,next)}),refresh:()=>setRevision(n=>n+1)};
}
export function DeliveryHistoryDialog({deliveryId,onClose,focus="intake"}:{deliveryId:string|null;onClose:()=>void;focus?:keyof typeof labels}){
  const {projection,error,refresh,loading,setPage}=useDeliveryOwnerHistory(deliveryId);
  if(!deliveryId)return null;
  const order=[focus,...(Object.keys(labels) as Array<keyof typeof labels>).filter(k=>k!==focus)];
  return <TerasModalShell surfaceId="delivery-owner-history" title="Delivery history" kicker={projection?.package.title??deliveryId}
    description="Review original source, workflow outcomes and durable receipts. This view is read-only."
    bodyLayout="scroll" width="large" height="fill" onClose={onClose}
    footer={<><TerasActionButton emphasis="secondary" onClick={refresh}>Refresh owner history</TerasActionButton><TerasActionButton onClick={onClose}>Back to Delivery</TerasActionButton></>}>
    <DeliveryOwnerHistoryContent projection={projection} error={error} sections={order} loading={loading} onPage={setPage}/>
  </TerasModalShell>;
}
export function DeliveryOwnerHistoryContent({projection,error,sections,loading=false,onPage}:{projection:DeliveryHistoryProjection|null;error:string|null;sections:Array<keyof typeof labels>;loading?:boolean;onPage?:(page:number)=>void}){
  return (
    <TerasFieldStack>
      {error?<TerasEmptyState>{error}</TerasEmptyState>:null}
      {!projection?(!error?<TerasEmptyState>Reading original owner history…</TerasEmptyState>:null):<>
        <TerasMetadataList items={[{label:"Delivery",value:projection.record_ref},{label:"Current package status",value:projection.package.status},{label:"Current owner",value:projection.package.owner_repo??"Not projected"},{label:"History coverage",value:projection.history_state},{label:"Observed",value:projection.projected_at}]} />
        <DeliveryOwnerEventTrail projection={projection} loading={loading} onPage={onPage}/>
        {sections.map(key=>{const section=projection.sections[key];return <TerasPanel key={key} frame="padded" treatment="rail" tone={["unavailable","partial"].includes(section.state)?"warn":"info"}>
          <TerasPanelHeader kicker="Original owner evidence" title={labels[key]} description={section.data?section.detail:undefined} statusLabel={section.state} statusTone={["unavailable","partial"].includes(section.state)?"warn":"info"}/>
          {!section.data?<TerasEmptyState>{section.detail}</TerasEmptyState>:
            key==="intake"?<IntakeEvidence source={section.data as DeliveryIntakeRecord}/>:"records" in section.data?<TerasFieldStack>
              <TerasMetadataList items={[{label:"Owner view state",value:section.data.state},{label:"Retained records",value:String(section.data.total_records)}]}/>
              {section.data.records.length===0?<TerasEmptyState>No retained application records were returned by this owner read.</TerasEmptyState>:section.data.records.map(record=><TerasPanel key={record.id} frame="padded" treatment="state" tone={record.tone}>
                <TerasPanelHeader kicker="Retained receipt" title={record.title} statusLabel={record.state} statusTone={record.tone}/>
                <TerasMetadataList items={[{label:"Original record",value:record.id},{label:"Recorded",value:record.at??"Not projected"},{label:"Actor",value:record.actor??"Not projected"},{label:"Original receipt",value:record.receipt_ref??"No receipt returned"},{label:"Digest",value:record.digest??"Not projected"},...record.evidence_refs.map((ref,index)=>({label:`Linked evidence ${index+1}`,value:ref}))]}/>
              </TerasPanel>)}
            </TerasFieldStack>:null}
        </TerasPanel>;})}
      </>}
    </TerasFieldStack>
  );
}

export function DeliveryOwnerEventTrail({projection,loading=false,onPage}:{projection:DeliveryHistoryProjection;loading?:boolean;onPage?:(page:number)=>void}) {
  const activity=projection.activity;
  const rows=new Map<string,DeliveryHistoryProjection["events"][number]&{detail:string;source:string}>((activity?.items??[]).map(event=>[event.event_id,{...event,source:"OpenProject activity"}]));
  for(const event of projection.events)rows.set(event.receipt_ref??`workflow:${event.event_id}`,{...event,detail:event.evidence_refs.join(" · "),source:"Original workflow receipt"});
  const events=[...rows.values()].sort((a,b)=>Date.parse(b.occurred_at)-Date.parse(a.occurred_at));
  return <TerasPanel frame="padded" treatment="rail" tone="info">
    <TerasPanelHeader kicker="Event Trail" title="Item activity and workflow receipts" description={activity?.detail??"This owner projection has not supplied item activity. The retained workflow receipts below are only partial event coverage."} statusLabel={loading?"loading":activity?.state??"partial"} statusTone="info"/>
    <TerasMetadataList items={[{label:"Activity page",value:String(activity?.page??1)},{label:"Total item activities",value:activity?.state==="current"?String(activity.total):"Unavailable"},{label:"Retained workflow events shown",value:`${projection.events.length} of ${projection.event_count}`} ]}/>
    {events.length?<TerasTimeline>{events.map(event=><TerasTimelineItem key={event.event_id} label={event.title} detail={`${event.actor} · ${event.detail}`} status={event.source} timestamp={event.occurred_at} displayTimestamp={event.occurred_at} tone={event.tone}/>)}</TerasTimeline>:<TerasEmptyState>{activity?.state==="current"?"This item activity page and the retained workflow records contain no events. Other pages may contain older or newer activity.":"Item activity is unavailable; no empty-history claim is made."}</TerasEmptyState>}
    <TerasActionRow><TerasActionButton disabled={!onPage||loading||!activity||activity.page<=1} onClick={()=>onPage?.((activity?.page??1)-1)}>Previous activity page</TerasActionButton><TerasActionButton disabled={!onPage||loading||!activity?.has_more} onClick={()=>onPage?.((activity?.page??1)+1)}>Next activity page</TerasActionButton></TerasActionRow>
  </TerasPanel>;
}
function IntakeEvidence({source}:{source:DeliveryIntakeRecord}){
 return <TerasMetadataList items={[{label:"Consumption",value:source.state},{label:"Original source",value:source.source_ref},{label:"Source version",value:source.source_version},{label:"Original packet",value:source.packet_ref},{label:"Delivery target",value:source.target_ref},{label:"Original receipt",value:source.receipt_ref},{label:"Receipt digest",value:source.receipt_digest??"Not projected"},{label:"Recorded",value:source.recorded_at??"Historical time not projected"},{label:"Original operator",value:source.actor??"Not projected"},{label:"Source custody",value:source.custody.classification},{label:"Source owner",value:source.custody.owner},{label:"Source repository",value:source.custody.source_ref??source.custody.repo_ref??"Not required"},{label:"Repository gate",value:source.custody.repository_gate_state},{label:"Custody rationale",value:source.custody.rationale},...source.evidence_refs.map((ref,index)=>({label:`Linked evidence ${index+1}`,value:ref}))]}/>;
}
