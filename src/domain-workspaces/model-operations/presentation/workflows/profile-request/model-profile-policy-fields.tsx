"use client";
import { TerasContentTray, TerasFieldGrid, TerasMetadataList, TerasNoteField, TerasTextField } from "@/teras";
import { profileManagedLimitMetadata } from "../../shared/model-profile-lifecycle-view-model.ts";
export function ModelProfilePolicyFields({scope,limits,currentLimits,disabled,onScopeChange,onLimitChange}:{
 scope:string;limits:Record<string,string>;currentLimits:Record<string,number>;disabled:boolean;
 onScopeChange:(value:string)=>void;onLimitChange:(key:string,value:string)=>void;
}) {
 return <>
  <TerasContentTray kicker="Published policy" description="Profile names and operating rules enter source review. Describe permitted data; do not paste private project content or secrets." />
  <TerasContentTray kicker="Data access" description="These notes document approved scope. The integration and context admission enforce access; this text does not create new access filters."/>
  <TerasNoteField label="Approved input scope — policy notes" minimumHeight="short" value={scope} maxLength={10000} disabled={disabled} onValueChange={onScopeChange} />
  <TerasContentTray kicker="Operating limits" description="Blank fields keep the existing setting. Provider limits may be lower.">
   <TerasFieldGrid columns={2}>
    {([['max_request_bytes','Request size limit (bytes)',1024,1000000],['max_output_tokens','Response tokens — supported providers',1,32768],['timeout_seconds','Time limit (seconds)',1,300]] as const).map(([key,label,min,max])=><TerasTextField key={key} label={label} type="number" min={min} max={max}
      value={limits[key]??''} placeholder={currentLimits[key]===undefined?'Keep current setting':String(currentLimits[key])} disabled={disabled} onValueChange={value=>onLimitChange(key,value)} />)}
   </TerasFieldGrid>
   <TerasMetadataList shape="list" items={profileManagedLimitMetadata()} />
  </TerasContentTray>
 </>;
}
