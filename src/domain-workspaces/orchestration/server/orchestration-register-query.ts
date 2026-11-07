import {ownerQueryFetch} from "../../../console-integration/server/owner-query-fetch.ts";
import {scanRegisterPage} from "../../../console-integration/server/scan-register-page.ts";
import {assertOosOrchestrationRuns} from "../live-runtime/orchestration-live-contract.ts";
import {projectLiveOrchestrationWorkspace} from "../live-runtime/orchestration-live-projection.ts";
import {filterOrchestrationRuns} from "../read-model/runs/orchestration-run-selectors.ts";
import type {OrchestrationRunFilters,OrchestrationRunRecord} from "../domain/orchestration-run-types.ts";
import {orchestrationOosRequest,OrchestrationOosError,type OrchestrationClientOptions} from "./orchestration-oos-client.ts";

export async function readOrchestrationRunRegister(query:URLSearchParams,options:OrchestrationClientOptions={},callerSignal?:AbortSignal){
  const owner=ownerQueryFetch(callerSignal,options.fetchImpl);options={...options,fetchImpl:owner.fetchImpl};
  const selection:OrchestrationRunFilters={definitionId:query.get("definitionId")??"all",query:(query.get("q")??"").trim().toLowerCase(),sourceDomain:query.get("sourceDomain")??"all",state:(query.get("state")??"all") as OrchestrationRunFilters["state"]};
  if([...query.keys()].some(key=>!["view","q","definitionId","sourceDomain","state","cursor"].includes(key)||query.getAll(key).length!==1)||selection.query.length>128||
    !["all","blocked","cancelled","completed","failed","queued","running","waiting"].includes(selection.state)||[selection.definitionId,selection.sourceDomain].some(value=>!/^[A-Za-z0-9._:/@+-]{1,256}$/.test(value)))throw new OrchestrationOosError("Select a valid run search and page.","orchestration_page_invalid",400);
  const page=await scanRegisterPage<OrchestrationRunRecord>({signal:owner.signal,selection,cursor:query.get("cursor"),identity:row=>row.runId,
    readPage:async cursor=>{
      const params=new URLSearchParams({view:"register",limit:"25",...(cursor?{cursor}:{})});
      const raw=await orchestrationOosRequest(`/v1/orchestration/runs?${params}`,{method:"GET"},options) as Record<string,unknown>;
      const runs=assertOosOrchestrationRuns({schema_version:raw?.schema_version,runs:raw?.runs});
      // An older owner can prove a short first page; it cannot attest onward paging.
      const next=raw.next_cursor===undefined&&cursor===null&&runs.length<25?null:raw.next_cursor;
      if(runs.length>25||next!==null&&(typeof next!=="string"||next.length>4096))throw new OrchestrationOosError("The owner cannot confirm this run continuation. Update its register reader before loading older runs.","orchestration_page_unavailable",503);
      return {records:projectLiveOrchestrationWorkspace([],runs,new Date().toISOString()).runs,next_cursor:next as string|null};
    },matches:row=>filterOrchestrationRuns([row],selection).length===1});
  return {mode:"live",status:"current",error:null,records:page.records,page:{selection,next_cursor:page.next_cursor,total:null}};
}
