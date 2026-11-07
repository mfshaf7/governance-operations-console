import {ownerQueryFetch} from "../../../console-integration/server/owner-query-fetch.ts";
import {scanRegisterPage} from "../../../console-integration/server/scan-register-page.ts";
import {projectDeliveryIntakeRecord} from "../live-runtime/delivery-history-projection.ts";
import type {DeliveryIntakeRecord} from "../live-runtime/delivery-history-live-contract.ts";
import {readCanonicalDeliveryIntake} from "./delivery-workspace-oos-client.ts";
import {DeliveryOosError} from "./delivery-oos-client.ts";

export async function readDeliveryIntakeRegister(query:URLSearchParams,signal?:AbortSignal,options:{env?:NodeJS.ProcessEnv;fetchImpl?:typeof fetch}={}) {
  const selection={query:(query.get("q")??"").trim().toLowerCase(),owner:query.get("owner")??"all",status:query.get("status")??"all"};
  if([...query.keys()].some(key=>!["view","q","owner","status","cursor"].includes(key)||query.getAll(key).length!==1)||selection.query.length>128||selection.owner.length>256||!["all","consumed","needs_consume","consume_failed"].includes(selection.status))throw new DeliveryOosError("Select a valid Intake search and page.","delivery_intake_page_invalid",400);
  const owner=ownerQueryFetch(signal,options.fetchImpl),issues:Array<{target_ref:string;detail:string}>=[];
  const page=await scanRegisterPage<DeliveryIntakeRecord>({signal:owner.signal,selection,cursor:query.get("cursor"),identity:row=>row.source_id,
    readPage:async cursor=>{
      if(cursor!==null&&!/^[1-9][0-9]{0,4}$/.test(cursor))throw new DeliveryOosError("Refresh the first Intake page.","delivery_intake_page_invalid",400);
      const number=Number(cursor??1),value=await readCanonicalDeliveryIntake({...options,fetchImpl:owner.fetchImpl,page:number});
      if(value.page?.number!==number||typeof value.page.has_more!=="boolean")throw new DeliveryOosError("The Intake owner could not confirm continuation.","delivery_intake_page_unavailable",503);
      issues.push(...value.issues);
      return {records:value.sources,next_cursor:value.page.has_more?String(number+1):null};
    },matches:item=>{
      const row=projectDeliveryIntakeRecord(item);
      return (selection.owner==="all"||row.owner===selection.owner)&&(selection.status==="all"||selection.status===row.intake_status)&&(!selection.query||[row.accepted_source_id,row.delivery_package_id,row.gate_summary,row.owner,row.source_ref,row.status_label,row.summary,row.title,...row.evidence_refs].join(" ").toLowerCase().includes(selection.query));
    }});
  return {mode:"live",status:"current",sources:page.records.map(projectDeliveryIntakeRecord),issues:[...new Map(issues.map(issue=>[issue.target_ref,issue])).values()],page:{selection,next_cursor:page.next_cursor,total:null},error:null};
}
