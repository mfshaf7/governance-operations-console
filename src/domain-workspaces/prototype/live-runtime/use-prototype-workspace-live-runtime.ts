"use client";

import {readRegisterWindow} from '../../../console-integration/registers/read-register-window.ts';
import {useRegisterPageSize} from '../../../console-integration/registers/use-register-page-size.ts';
import {useCallback,useEffect,useRef,useState} from "react";
import type {PrototypeWorkspaceLiveProjection} from "./prototype-workspace-live-projection.ts";
import {filterPrototypeRecords} from "../read-model/selectors/prototype-workspace-selectors.ts";
import type {PrototypeWorkspaceRecordFilters} from "../read-model/selectors/prototype-workspace-selectors.ts";
const defaults:PrototypeWorkspaceRecordFilters={baseline:"all",lifecycle:"all",search:""};
export function usePrototypeWorkspaceLiveRuntime(enabled:boolean,filters=defaults,subjectRef:string|null=null){
  const {pageSize}=useRegisterPageSize("Prototype");
  const selection={...filters,search:filters.search.trim().toLowerCase()},selectionKey=JSON.stringify(selection),key=JSON.stringify([selectionKey,pageSize]);
  const [position,setPosition]=useState({key,history:[{cursor:null as string|null,offset:0}]}),[projection,setProjection]=useState<PrototypeWorkspaceLiveProjection|null>(null);
  if(position.key!==key)setPosition({key,history:[{cursor:null,offset:0}]});
  const history=position.key===key?position.history:[{cursor:null,offset:0}],entry=history.at(-1)!,cursor=entry.cursor;
  const scopeKey=JSON.stringify([key,cursor,subjectRef]);
  const [resultScope,setResultScope]=useState<string|null>(null),[settledScope,setSettledScope]=useState<string|null>(null);
  const [error,setError]=useState<string|null>(null),[loading,setLoading]=useState(enabled),[nextCursor,setNextCursor]=useState<string|null>(null);
  const inFlight=useRef(false),sequence=useRef(0),active=useRef<AbortController|null>(null);
  const refresh=useCallback(async(background=false)=>{
    if(!enabled||background&&inFlight.current)return;inFlight.current=true;
    active.current?.abort();const controller=new AbortController();active.current=controller;
    const ticket=++sequence.current;setLoading(!background);if(!background)setError(null);
    try{
      const models:PrototypeWorkspaceLiveProjection[]=[],signal=AbortSignal.any([controller.signal,AbortSignal.timeout(80000)]);
      const window=await readRegisterWindow({cursor,pageSize,scope:key,signal,identity:(row:PrototypeWorkspaceLiveProjection["readModel"]["records"][number])=>row.id,readPage:async(nativeCursor)=>{
      const params=new URLSearchParams({view:"register",baseline:selection.baseline,lifecycle:selection.lifecycle,q:selection.search,...(nativeCursor?{cursor:nativeCursor}:{})});
      const response=await fetch(`/api/prototypes/records?${params}`,{cache:"no-store",signal});
      const value=await response.json(),next=value?.projection;
      check(response,value);
      // Retained unpaged versions represent a complete short list. A full page
      // without continuation evidence cannot establish complete collection scope.
      if(!value.page){
        if(nativeCursor||next.readModel.records.length>=25)throw Error("The Prototype reader cannot confirm continuation. Refresh its source.");
        next.readModel.records=filterPrototypeRecords(next.readModel.records,selection);
        value.page={selection,next_cursor:null,total:null};
      }
      if(JSON.stringify(value.page?.selection)!==selectionKey||value.page.next_cursor!==null&&(typeof value.page.next_cursor!=="string"||value.page.next_cursor.length>8192)||next.readModel.records.length>25)throw Error("The owner returned a different Prototype page.");
        models.push(next);return {rows:next.readModel.records,nextCursor:value.page.next_cursor};
      }});
      const last=models.at(-1)!,merge=(family:"landing"|"maturity"|"closure")=>Object.assign({},...models.map(model=>model[family]));
      const next:PrototypeWorkspaceLiveProjection={...last,readModel:{...last.readModel,records:window.rows,deliveryPacketsByPrototypeId:Object.assign({},...models.map(model=>model.readModel.deliveryPacketsByPrototypeId))},landing:merge("landing"),maturity:merge("maturity"),closure:merge("closure"),nativeLifecycleOutcomes:models.flatMap(model=>model.nativeLifecycleOutcomes??[])};
      const value={page:{next_cursor:window.nextCursor}};
      const slug=subjectRef?(/^record:\/\/(?:prototype-captures|prototypes)\/([a-z0-9][a-z0-9._-]{0,185})$/.exec(subjectRef)?.[1]??/^prototype-([a-z0-9][a-z0-9._-]{0,185})$/.exec(subjectRef)?.[1]):null;
      if(subjectRef&&!next.readModel.records.some((row:{id:string;sourceRef:string})=>row.id===subjectRef||row.sourceRef===subjectRef||slug&&row.id===`prototype-${slug}`)){
        if(slug){
          const exact=await fetch(`/api/prototypes/records?${new URLSearchParams({view:"register",id:slug})}`,{cache:"no-store",signal:controller.signal}),original=await exact.json();if(exact.status===404)throw Error("The requested Prototype is not present in current owner records.");check(exact,original);
          if(original.projection.readModel.records.length!==1||original.projection.readModel.records[0].id!==`prototype-${slug}`)throw Error("The selected original Prototype could not be verified.");
          const detail=original.projection as PrototypeWorkspaceLiveProjection;
          next.readModel.records.push(...detail.readModel.records.map(row=>({...row,selectedOnly:true})));
          next.readModel.deliveryPacketsByPrototypeId={...next.readModel.deliveryPacketsByPrototypeId,...detail.readModel.deliveryPacketsByPrototypeId};
          Object.assign(next,{landing:{...next.landing,...detail.landing},maturity:{...next.maturity,...detail.maturity},closure:{...next.closure,...detail.closure}});
        }
      }
      if(ticket===sequence.current){setProjection(next);setNextCursor(value.page.next_cursor);setResultScope(scopeKey);setSettledScope(scopeKey);setError(null);}
    }catch(e){if(ticket===sequence.current&&!controller.signal.aborted){setProjection(null);setSettledScope(scopeKey);setError(e instanceof Error?e.message:"Canonical Prototype records are unavailable; fixtures are not a fallback.");}}
    finally{if(ticket===sequence.current&&!controller.signal.aborted){setLoading(false);inFlight.current=false;}}
  },[enabled,key,cursor,subjectRef]);
  const latest=useRef(refresh);latest.current=refresh;
  useEffect(()=>{const timer=setTimeout(()=>void refresh(),200);return()=>{clearTimeout(timer);sequence.current++;active.current?.abort();};},[refresh]);
  useEffect(()=>{if(!enabled)return;const visible=()=>{if(document.visibilityState==="visible")void latest.current(true);};const timer=setInterval(visible,30000);document.addEventListener("visibilitychange",visible);return()=>{clearInterval(timer);document.removeEventListener("visibilitychange",visible);};},[enabled]);
  const visible=resultScope===scopeKey?projection:null,pending=enabled&&(loading||settledScope!==scopeKey);
  const count=visible?.readModel.records.filter(row=>!(row as {selectedOnly?:boolean}).selectedOnly).length??0;
  return {error:settledScope===scopeKey?error:null,projection:visible,refresh,loading:pending,page:{offset:entry.offset,pageNumber:history.length,nextCursor:resultScope===scopeKey?nextCursor:null,hasPrevious:history.length>1,
    next:()=>{if(nextCursor&&resultScope===scopeKey&&!pending)setPosition({key,history:[...history,{cursor:nextCursor,offset:entry.offset+count}]});},first:()=>{if(history.length>1)setPosition({key,history:[{cursor:null,offset:0}]});else void refresh();},previous:()=>{if(history.length>1&&!pending)setPosition({key,history:history.slice(0,-1)});}}};
}
function check(response:Response,value:{mode?:string;projection?:PrototypeWorkspaceLiveProjection}){
  const next=value?.projection,observed=Date.parse(next?.readModel?.source?.lastRead??"");
  if(!response.ok||value.mode!=="live"||!Array.isArray(next?.readModel?.records)||!next?.landing||!next?.maturity||!next?.closure||!Number.isFinite(observed)||Date.now()-observed>300000||observed>Date.now()+30000)throw Error("Canonical Prototype records are unavailable; fixtures are not a fallback.");
}


// Whole-workspace counts stay independent of the selected register page.
// The owner overview excludes evidence documents and workflow payloads.
export function usePrototypeWorkspaceOverview(enabled:boolean){
  const [stats,setStats]=useState<import("../read-model/selectors/prototype-workspace-selectors.ts").PrototypeWorkspaceStats|null>(null);
  const active=useRef<AbortController|null>(null),sequence=useRef(0),pending=useRef(false);
  const refresh=useCallback(async()=>{
    if(!enabled||pending.current)return;
    pending.current=true;const controller=new AbortController();active.current=controller;const ticket=++sequence.current;
    try{
      const response=await fetch("/api/prototypes/records?view=overview",{cache:"no-store",signal:AbortSignal.any([controller.signal,AbortSignal.timeout(80000)])});
      const value=await response.json();
      if(!response.ok||value.mode!=="live"||!value.projection?.counts||!Number.isFinite(Date.parse(value.projection.lastRead))||Date.now()-Date.parse(value.projection.lastRead)>300000)throw Error("Prototype summary is incomplete.");
      if(ticket===sequence.current)setStats(value.projection.counts);
    }catch{if(ticket===sequence.current&&!controller.signal.aborted)setStats(null);}
    finally{if(ticket===sequence.current)pending.current=false;}
  },[enabled]);
  useEffect(()=>{
    if(!enabled){setStats(null);return;}
    void refresh();const visible=()=>{if(document.visibilityState==="visible")void refresh();};
    const timer=setInterval(visible,30000);document.addEventListener("visibilitychange",visible);
    return()=>{sequence.current++;active.current?.abort();pending.current=false;clearInterval(timer);document.removeEventListener("visibilitychange",visible);};
  },[enabled,refresh]);
  return {stats,refresh};
}
