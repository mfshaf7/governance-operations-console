import {ownerQueryFetch} from "../../../console-integration/server/owner-query-fetch.ts";
import {scanRegisterPage} from "../../../console-integration/server/scan-register-page.ts";
import {canonicalDigest,deliveryOosRequest,resolveDeliveryOosConfig,DeliveryOosError} from "./delivery-oos-client.ts";
import {readCanonicalDeliveryInventory} from "./delivery-workspace-oos-client.ts";
import {projectCanonicalDeliveryOverview} from "../live-runtime/delivery-overview-live-projection.ts";
import type {DeliveryReadModel,DeliveryPackageSummary} from "../read-model/index.ts";

type Row={record:DeliveryPackageSummary;model:DeliveryReadModel};
type Selection={surface:string;scope:"current"|"history";query:string;status:string};
export async function readDeliveryRegister(query:URLSearchParams,callerSignal?:AbortSignal,options:{env?:NodeJS.ProcessEnv;fetchImpl?:typeof fetch;readSource?:(cursor:string|null,id?:string)=>Promise<{model:DeliveryReadModel;next_cursor:string|null}>}={}){
  const owner=ownerQueryFetch(callerSignal,options.fetchImpl);
  const readSource=options.readSource??((cursor:string|null,id?:string)=>readOwner(cursor,owner.fetchImpl,id,options.env));
  const selection:Selection={surface:query.get("surface")??"work-design",scope:(query.get("scope")??"current") as Selection["scope"],query:(query.get("q")??"").trim().toLowerCase(),status:query.get("status")??"all"};
  if([...query.keys()].some(key=>!["view","surface","scope","q","status","cursor","id"].includes(key)||query.getAll(key).length!==1)||!["work-design","refinement"].includes(selection.surface)||!["current","history"].includes(selection.scope)||selection.query.length>128||!["all","New","Ready","In Progress","Blocked","Done","Deferred","Retired","Closeout Pending"].includes(selection.status))throw new DeliveryOosError("Select a valid Delivery register search.","delivery_register_selection_invalid",400);
  const id=query.get("id");if(id&&(!/^delivery-[1-9][0-9]*$/.test(id)||query.has("cursor")))throw new DeliveryOosError("Select one exact original package.","delivery_register_selection_invalid",400);
  let last:DeliveryReadModel|null=null;
  if(id){const page=await readSource(null,id);const row=page.model.packages.find(row=>row.delivery_package_id===id);if(!row)throw new DeliveryOosError("The selected original package is unavailable.","delivery_register_original_missing",404);return response([{record:row,model:page.model}],null,page.model,selection);}
  const page=await scanRegisterPage<Row>({signal:owner.signal,selection,cursor:query.get("cursor"),identity:row=>row.record.delivery_package_id,
    readPage:async cursor=>{const page=await readSource(cursor);last=page.model;return {records:page.model.packages.map(record=>({record,model:page.model})),next_cursor:page.next_cursor};},
    matches:({record})=>(selection.scope==="history"||!["done","retired","parked"].includes(record.backend_status)&&record.workflow_phase===(selection.surface==="work-design"?"work_design":"refinement"))&&
      (selection.status==="all"||record.package_posture===selection.status)&&
      (!selection.query||[record.display_name,record.delivery_package_id,record.source_ref,record.summary,record.target_pi,record.backend_status,record.package_posture,record.workflow_phase].join(" ").toLowerCase().includes(selection.query))});
  return response(page.records,page.next_cursor,last!,selection);
}
async function readOwner(cursor:string|null,fetchImpl:typeof fetch,id?:string,env=process.env){
  if(cursor?.startsWith("legacy-register:"))return legacy(cursor,fetchImpl,id,env);
  const params=new URLSearchParams({view:"register",include_done:"true",include_inactive:"true",...(cursor?{cursor}:{}),...(id?{id}:{})});
  let value:unknown;
  try{value=await deliveryOosRequest(resolveDeliveryOosConfig(env),`/v1/delivery-initiatives?${params}`,{method:"GET"},fetchImpl,75000,{authority:"operator-orchestration-service",sourceOwner:"workspace-delivery-art",recordRef:"openproject://projects/workspace-delivery-art/initiatives"});}
  catch(error){
    // The deployed pre-register owner rejects the view without a domain code.
    // Only its exact unsupported-view response permits the existing overview read.
    if(error instanceof DeliveryOosError&&error.status===400&&
      (error.code==="delivery_view_invalid"||error.code==="delivery_oos_rejected"&&error.message==="The optional view must be console."))return legacy(cursor,fetchImpl,id,env);
    throw error;
  }
  const page=(value as {register_page?:{next_cursor?:unknown}})?.register_page;
  if(!page||page.next_cursor!==null&&(typeof page.next_cursor!=="string"||page.next_cursor.length>2048))throw new DeliveryOosError("The owner cannot confirm the Delivery register continuation.","delivery_register_page_unavailable",503);
  const model=projectCanonicalDeliveryOverview(value,canonicalDigest(value),new Date().toISOString());
  if(model.packages.length>25)throw new DeliveryOosError("The owner returned too many packages for this page.","delivery_register_page_invalid",502);
  return {model,next_cursor:page.next_cursor as string|null};
}
async function legacy(cursor:string|null,fetchImpl:typeof fetch,id?:string,env=process.env){
  const model=await readCanonicalDeliveryInventory({overview:true,fetchImpl,env});let offset=0;
  if(cursor){try{const value=JSON.parse(Buffer.from(cursor.slice("legacy-register:".length),"base64url").toString());if(!cursor.startsWith("legacy-register:")||Object.keys(value).sort().join(",")!=="offset,revision"||value.revision!==model.projection_state.source_revision||!Number.isSafeInteger(value.offset)||value.offset<0||value.offset>model.packages.length)throw Error();offset=value.offset;}catch{throw new DeliveryOosError("Delivery source changed. Refresh the first register page.","delivery_register_changed",409);}}
  const rows=id?model.packages.filter(row=>row.delivery_package_id===id):model.packages.slice(offset,offset+25),next=!id&&offset+rows.length<model.packages.length?`legacy-register:${Buffer.from(JSON.stringify({offset:offset+rows.length,revision:model.projection_state.source_revision})).toString("base64url")}`:null;
  return {model:selectModel(model,rows),next_cursor:next};
}
function selectModel(model:DeliveryReadModel,records:DeliveryPackageSummary[]):DeliveryReadModel{
  const ids=new Set(records.map(row=>row.delivery_package_id)),roots=new Set(records.map(row=>row.tree_root_id));
  return {...model,packages:records,selected_packages:model.selected_packages.filter(row=>ids.has(row.delivery_package_id)),art_tree:{...model.art_tree,roots:model.art_tree.roots.filter(row=>roots.has(row.id))},selected_delivery_package_id:records[0]?.delivery_package_id??""};
}
function response(rows:Row[],next:string|null,last:DeliveryReadModel,selection:Selection){
  const models=[...new Map(rows.map(row=>[`${row.model.projection_state.source_revision}:${row.model.packages.map(p=>p.delivery_package_id).join(",")}`,row.model])).values()],records=rows.map(row=>row.record),ids=new Set(records.map(row=>row.delivery_package_id));
  const counts={...last.board_summary.by_posture};for(const key of Object.keys(counts))counts[key as keyof typeof counts]=0;for(const row of records)counts[row.package_posture]++;
  const merged={...last,board_summary:{...last.board_summary,total_packages:records.length,by_posture:counts,blocked_count:counts.Blocked,closeout_pending_count:counts["Closeout Pending"],stale_count:0},packages:records,selected_packages:models.flatMap(model=>model.selected_packages.filter(row=>ids.has(row.delivery_package_id))),art_tree:{...last.art_tree,roots:models.flatMap(model=>model.art_tree.roots.filter(root=>records.some(row=>row.tree_root_id===root.id)))},history_scope:selection.scope,
    projection_state:{...last.projection_state,detail:"Current register page. The global Execution Board and dependency views retain their independent complete operating model."}};
  return {mode:"live",status:"current",error:null,projection:merged,page:{selection,next_cursor:next,total:null}};
}
