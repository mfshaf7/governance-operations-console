import {ownerQueryFetch} from "../../../console-integration/server/owner-query-fetch.ts";
import {scanRegisterPage} from "../../../console-integration/server/scan-register-page.ts";
import {readCanonicalPrototypeWorkspace} from "./prototype-landing-oos-client.ts";
import {filterPrototypeRecords,type PrototypeWorkspaceRecordFilters} from "../read-model/selectors/prototype-workspace-selectors.ts";
import type {PrototypeWorkspaceLiveProjection} from "../live-runtime/prototype-workspace-live-projection.ts";
import type {PrototypeRecord} from "../domain/prototype-types.ts";

type Row={record:PrototypeRecord;source:PrototypeWorkspaceLiveProjection};
export async function readPrototypeRegister(query:URLSearchParams,readSource=readCanonicalPrototypeWorkspace,callerSignal?:AbortSignal){
  const ownerFetch=ownerQueryFetch(callerSignal);
  const selection:PrototypeWorkspaceRecordFilters={baseline:(query.get("baseline")??"all") as PrototypeWorkspaceRecordFilters["baseline"],lifecycle:(query.get("lifecycle")??"all") as PrototypeWorkspaceRecordFilters["lifecycle"],search:(query.get("q")??"").trim().toLowerCase()};
  if([...query.keys()].some(key=>!["view","baseline","lifecycle","q","cursor","id"].includes(key)||query.getAll(key).length!==1)||selection.search.length>128||
    !["all","exploring","candidate","baseline-approved","graduating","graduated","retired"].includes(selection.lifecycle)||!["all","blocked","drafting","needs-evidence","not-started","ready-for-movement","receipt-projected","returned"].includes(selection.baseline))throw Error("Select a valid Prototype search and page.");
  if(query.has("id")){
    const id=query.get("id")!;
    if(!/^[a-z0-9][a-z0-9._-]{0,185}$/.test(id)||query.has("cursor"))throw Error("Select one exact original Prototype.");
    const source=await readSource({fetchImpl:ownerFetch.fetchImpl,selection:{id}}),record=source.readModel.records.find(row=>row.id===`prototype-${id}`);
    if(!record)throw Error("The selected original Prototype is not present in current source.");
    return {mode:"live",projection:combine([{record,source}]),page:{selection,next_cursor:null,total:null},error:null};
  }
  const page=await scanRegisterPage<Row>({signal:ownerFetch.signal,selection,cursor:query.get("cursor"),identity:row=>row.record.id,
    readPage:async cursor=>{
      const source=await readSource({fetchImpl:ownerFetch.fetchImpl,selection:{cursor}}),owner=source.ownerPage as {ids?:unknown;next_cursor?:unknown;source_revision?:unknown}|undefined;
      const rows=source.readModel.records;
      const next=owner?owner.next_cursor:cursor===null&&rows.length<25?null:undefined;
      if(rows.length>25||next!==null&&(typeof next!=="string"||next.length>512)||owner&&(!Array.isArray(owner.ids)||owner.ids.length!==rows.length||owner.ids.some(id=>!rows.some(row=>row.id===`prototype-${id}`))))throw Error("The owner cannot confirm this Prototype continuation. Refresh its register reader.");
      return {records:rows.map(record=>({record,source})),next_cursor:next as string|null};
    },matches:row=>filterPrototypeRecords([row.record],selection).length===1});
  return {mode:"live",projection:combine(page.records),page:{selection,next_cursor:page.next_cursor,total:null},error:null};
}
function combine(rows:Row[]):PrototypeWorkspaceLiveProjection{
  const first=rows[0]?.source,ids=new Set(rows.map(row=>row.record.id)),sources=[...new Map(rows.map(row=>[row.source.sourceRevision,row.source])).values()];
  const merge=<T>(select:(source:PrototypeWorkspaceLiveProjection)=>Record<string,T>)=>Object.fromEntries(sources.flatMap(source=>Object.entries(select(source)).filter(([key])=>ids.has(key))));
  return {sourceRevision:sources.map(source=>source.sourceRevision).join(":"),
    readModel:{records:rows.map(row=>row.record),deliveryPacketsByPrototypeId:merge(source=>source.readModel.deliveryPacketsByPrototypeId??{}),source:first?.readModel.source??{lastRead:new Date().toISOString(),project:"Workspace Prototype Studio",recordSystem:"Canonical Studio records and OOS progress",registry:"Current filtered owner read",mutationGateway:"OOS owner workflows"}},
    landing:merge(source=>source.landing),maturity:merge(source=>source.maturity),closure:merge(source=>source.closure),nativeLifecycleOutcomes:[...new Map(sources.flatMap(source=>source.nativeLifecycleOutcomes.filter(fact=>ids.has(fact.sourceId))).map(fact=>[fact.id,fact])).values()]};
}
