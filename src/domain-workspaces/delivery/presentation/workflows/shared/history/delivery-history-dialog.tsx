"use client";
import { useEffect, useState } from "react";
import { TerasActionButton, TerasEmptyState, TerasFieldStack, TerasMetadataList, TerasModalShell, TerasPanel, TerasPanelHeader } from "@/teras";
import { assertDeliveryHistoryProjection, type DeliveryHistoryProjection, type DeliveryIntakeRecord } from "../../../../live-runtime/delivery-history-live-contract.ts";

const labels={intake:"Intake",work_design:"Work Design",refinement:"Refinement",closeout:"Delivery closeout"};
export function DeliveryHistoryDialog({deliveryId,onClose,focus="intake"}:{deliveryId:string|null;onClose:()=>void;focus?:keyof typeof labels}){
  const [projection,setProjection]=useState<DeliveryHistoryProjection|null>(null),[error,setError]=useState<string|null>(null),[revision,setRevision]=useState(0);
  useEffect(()=>{let active=true;setProjection(null);setError(null);if(!deliveryId)return;
    void fetch(`/api/delivery/history/${encodeURIComponent(deliveryId)}`,{cache:"no-store"}).then(async response=>{
      const body=await response.json();if(!response.ok || body.mode!=="live" || body.status!=="current")throw Error("Original Delivery owner history is unavailable. Retry the owner read.");
      const next=assertDeliveryHistoryProjection(body.projection,deliveryId);if(active)setProjection(next);
    }).catch(()=>{if(active)setError("Original owner history could not be verified. No successful or empty history is inferred.");});return()=>{active=false;};
  },[deliveryId,revision]);
  if(!deliveryId)return null;
  const order=[focus,...(Object.keys(labels) as Array<keyof typeof labels>).filter(k=>k!==focus)];
  return <TerasModalShell surfaceId="delivery-owner-history" title="Delivery history" kicker={projection?.package.title??deliveryId}
    description="Review original source, workflow outcomes and durable receipts. This view is read-only."
    bodyLayout="scroll" width="large" height="fill" onClose={onClose}
    footer={<><TerasActionButton emphasis="secondary" onClick={()=>setRevision(n=>n+1)}>Refresh owner history</TerasActionButton><TerasActionButton onClick={onClose}>Back to Delivery</TerasActionButton></>}>
    <TerasFieldStack>
      {error?<TerasEmptyState>{error}</TerasEmptyState>:!projection?<TerasEmptyState>Reading original owner history…</TerasEmptyState>:<>
        <TerasMetadataList items={[{label:"Delivery",value:projection.record_ref},{label:"Current package status",value:projection.package.status},{label:"Current owner",value:projection.package.owner_repo??"Not projected"},{label:"History coverage",value:projection.history_state}]} />
        {order.map(key=>{const section=projection.sections[key];return <TerasPanel key={key} frame="padded" treatment="rail" tone={section.state==="unavailable"?"warn":"info"}>
          <TerasPanelHeader kicker="Original owner evidence" title={labels[key]} description={section.detail} statusLabel={section.state} statusTone={section.state==="unavailable"?"warn":"info"}/>
          {!section.data?<TerasEmptyState>{section.state==="not-recorded"?"No retained native record is projected for this stage.":"Owner evidence is unavailable. Refresh to retry."}</TerasEmptyState>:
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
  </TerasModalShell>;
}
function IntakeEvidence({source}:{source:DeliveryIntakeRecord}){
 return <TerasMetadataList items={[{label:"Consumption",value:source.state},{label:"Original source",value:source.source_ref},{label:"Source version",value:source.source_version},{label:"Original packet",value:source.packet_ref},{label:"Delivery target",value:source.target_ref},{label:"Original receipt",value:source.receipt_ref},{label:"Receipt digest",value:source.receipt_digest??"Not projected"},{label:"Recorded",value:source.recorded_at??"Historical time not projected"},{label:"Original operator",value:source.actor??"Not projected"},{label:"Source custody",value:source.custody.classification},{label:"Source owner",value:source.custody.owner},{label:"Source repository",value:source.custody.source_ref??source.custody.repo_ref??"Not required"},{label:"Repository gate",value:source.custody.repository_gate_state},{label:"Custody rationale",value:source.custody.rationale},...source.evidence_refs.map((ref,index)=>({label:`Linked evidence ${index+1}`,value:ref}))]}/>;
}
