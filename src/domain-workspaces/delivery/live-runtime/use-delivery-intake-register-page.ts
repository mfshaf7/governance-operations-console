"use client";
import {readRegisterWindow} from '../../../console-integration/registers/read-register-window.ts';
import {useRegisterPageSize} from '../../../console-integration/registers/use-register-page-size.ts';
import {useCallback,useEffect,useRef,useState} from "react";
import type {DeliveryIntakeSource} from "../read-model/index.ts";

export function useDeliveryIntakeRegisterPage(selection:{query:string;owner:string;status:string},enabled:boolean) {
  const {pageSize}=useRegisterPageSize("Delivery Intake register");
  const selectionKey=JSON.stringify({...selection,query:selection.query.trim().toLowerCase()}),key=JSON.stringify([selectionKey,pageSize]);
  const [position,setPosition]=useState({key,history:[{cursor:null as string|null,offset:0}]});
  if(position.key!==key)setPosition({key,history:[{cursor:null,offset:0}]});
  const history=position.key===key?position.history:[{cursor:null,offset:0}],entry=history.at(-1)!,scope=JSON.stringify([key,entry.cursor]);
  const [result,setResult]=useState<{scope:string;sources:DeliveryIntakeSource[];issues:Array<{target_ref:string;detail:string}>;next_cursor:string|null;error:string|null}|null>(null);
  const [loading,setLoading]=useState(enabled),ticket=useRef(0),active=useRef<AbortController|null>(null),inFlight=useRef(false);
  const load=useCallback(async(background=false)=>{
    if(!enabled||background&&inFlight.current)return;
    active.current?.abort();const controller=new AbortController();active.current=controller;inFlight.current=true;
    const run=++ticket.current;setLoading(!background);
    try {
      const issues:Array<{target_ref:string;detail:string}>=[],signal=AbortSignal.any([controller.signal,AbortSignal.timeout(80000)]);
      const window=await readRegisterWindow({cursor:entry.cursor,pageSize,scope:key,signal,identity:(row:DeliveryIntakeSource)=>row.accepted_source_id,readPage:async(nativeCursor)=>{
      const query=new URLSearchParams({view:"register",q:selection.query,owner:selection.owner,status:selection.status,...(nativeCursor?{cursor:nativeCursor}:{})});
      const response=await fetch(`/api/delivery/intake?${query}`,{cache:"no-store",signal});
      const value=await response.json();
      if(!response.ok)throw Error(value.error??"Intake history could not be read.");
      if(value.mode!=="live"||value.status!=="current"||JSON.stringify(value.page?.selection)!==selectionKey||!Array.isArray(value.sources)||value.sources.length>25||!Array.isArray(value.issues)||value.issues.length>80||value.sources.some((row:DeliveryIntakeSource)=>!row.accepted_source_id||row.intake_status!=="consumed"||!Array.isArray(row.evidence_refs))||new Set(value.sources.map((row:DeliveryIntakeSource)=>row.accepted_source_id)).size!==value.sources.length||value.page.next_cursor!==null&&(typeof value.page.next_cursor!=="string"||value.page.next_cursor.length>8192))throw Error("The Intake source returned a different or invalid page.");
        issues.push(...value.issues);return {rows:value.sources as DeliveryIntakeSource[],nextCursor:value.page.next_cursor};
      }});
      if(run===ticket.current)setResult({scope,sources:window.rows,issues:[...new Map(issues.map(row=>[JSON.stringify(row),row])).values()],next_cursor:window.nextCursor,error:null});
    }catch(error){if(run===ticket.current&&!controller.signal.aborted)setResult({scope,sources:[],issues:[],next_cursor:null,error:error instanceof Error?error.message:"Intake history unavailable."});}
    finally {if(run===ticket.current&&!controller.signal.aborted){inFlight.current=false;setLoading(false);}}
  },[enabled,key,entry.cursor]);
  const latest=useRef(load);latest.current=load;
  useEffect(()=>{if(!enabled)return;const timer=setTimeout(()=>void load(),200);return()=>{clearTimeout(timer);ticket.current++;active.current?.abort();inFlight.current=false;};},[enabled,load]);
  useEffect(()=>{if(!enabled)return;const visible=()=>{if(document.visibilityState==="visible")void latest.current(true);};const timer=setInterval(visible,30000);document.addEventListener("visibilitychange",visible);return()=>{clearInterval(timer);document.removeEventListener("visibilitychange",visible);};},[enabled]);
  const current=result?.scope===scope?result:null,pending=enabled&&(loading||!current);
  return {sources:current?.sources??[],issues:current?.issues??[],error:current?.error??null,loading:pending,offset:entry.offset,page:history.length,hasPrevious:history.length>1,nextCursor:current?.next_cursor??null,refresh:()=>load(),
    first:()=>history.length>1?setPosition({key,history:[{cursor:null,offset:0}]}):void load(),
    next:()=>{if(current?.next_cursor&&!pending)setPosition({key,history:[...history,{cursor:current.next_cursor,offset:entry.offset+current.sources.length}]});},
    previous:()=>{if(history.length>1&&!pending)setPosition({key,history:history.slice(0,-1)});}};
}
