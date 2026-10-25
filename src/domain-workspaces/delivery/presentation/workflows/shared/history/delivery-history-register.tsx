"use client";
import {useEffect,useState} from "react";
import {TerasActionButton,TerasEmptyState,TerasFilterBar,TerasRecordCellText,TerasRecordControlLayout,TerasRecordTable,TerasRegisterPanel,TerasSelectedPanel,TerasStatusPill,type TerasRecordTableColumn} from "@/teras";
import type {DeliveryReadModel} from "../../../../read-model/delivery-read-model.ts";
import type {DeliveryPackageSummary} from "../../../../domain/delivery-package.ts";
import {DeliveryHistoryDialog} from "./delivery-history-dialog.tsx";

export function DeliveryHistoryRegister({model,section,focusPackageId=null}:{model:DeliveryReadModel;focusPackageId?:string|null;section:"work_design"|"refinement"|"closeout"}){
 const [search,setSearch]=useState(""),[selectedId,setSelectedId]=useState<string|null>(null),[openId,setOpenId]=useState<string|null>(null);
 useEffect(()=>{if(focusPackageId){setSelectedId(focusPackageId);setSearch("");}},[focusPackageId]);
 const label=section==="work_design"?"Work Design":section==="refinement"?"Refinement":"Delivery";
 const rows=model.packages.filter(p=>[p.display_name,p.delivery_package_id,p.source_ref,p.package_posture].join(" ").toLowerCase().includes(search.toLowerCase()));
 const selected=rows.find(p=>p.delivery_package_id===selectedId)??rows[0]??null;
 const columns:Array<TerasRecordTableColumn<DeliveryPackageSummary>>=[
  {key:"package",header:"Package",intent:"primary",render:p=><TerasRecordCellText title={p.display_name} description={p.source_ref}/>},
  {key:"status",header:"Current package posture",intent:"status",render:p=><TerasStatusPill tone={p.tone}>{p.package_posture}</TerasStatusPill>},
  {key:"action",header:"Original history",intent:"action",render:p=><TerasActionButton emphasis="secondary" onClick={event=>{event.stopPropagation();setOpenId(p.delivery_package_id);}}>View history</TerasActionButton>},
 ];
 return <>
  <TerasRecordControlLayout composition="fullscreen-register" mode="register-selected" data-delivery-history-register={section}
   register={<TerasRegisterPanel kicker={`${label} history`} title="Retained Delivery packages"
    description="All retained packages are available for inspection. Badges show current package posture; original stage outcomes and receipts are read from their owners."
    statusLabel={`${rows.length}/${model.packages.length} shown`} statusTone="info" density="compact-control"
    filterBar={<TerasFilterBar search={{ariaLabel:"Search Delivery history",value:search,onValueChange:setSearch,placeholder:"Search package, source or posture…"}}/>}>
     {rows.length?<TerasRecordTable columns={columns} rows={rows} getRowId={p=>p.delivery_package_id} onSelect={p=>setSelectedId(p.delivery_package_id)} selectedRowId={selected?.delivery_package_id??null} fill/>:<TerasEmptyState>No retained packages match this search.</TerasEmptyState>}
   </TerasRegisterPanel>}
   selected={<TerasSelectedPanel kicker="Historical package" selected={Boolean(selected)} title={selected?.display_name??"No package selected"}
    description={selected?.summary??"Select a retained package to inspect original owner history."} variant="rich" tone={selected?.tone??"info"}
    status={selected?{label:selected.package_posture,tone:selected.tone}:undefined}
    facts={selected?[{label:"Source",value:selected.source_ref},{label:"Current package posture",value:selected.package_posture},{label:"History view",value:label}]:[]}
    action={selected?{kicker:"Original owner evidence",title:`Review ${label} history`,description:"Read original consumption, application and closeout receipts without restarting the workflow.",node:<TerasActionButton onClick={()=>setOpenId(selected.delivery_package_id)}>View {label} history</TerasActionButton>}:undefined}/>} />
  <DeliveryHistoryDialog deliveryId={openId} onClose={()=>setOpenId(null)} focus={section}/>
 </>;
}
