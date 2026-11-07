"use client";
import {readRegisterWindow} from '../../console-integration/registers/read-register-window.ts';
import {useRegisterPageSize} from '../../console-integration/registers/use-register-page-size.ts';
import {useCallback,useEffect,useRef,useState} from "react";
import type {LifecycleTransitionOverviewItem} from "../presentation/lifecycle-transition-overview-view-model.ts";

export function useLifecycleTransitionJournalPage(selection:{routeId:string;state:string;query:string},enabled:boolean,focusId:string|null) {
  const {pageSize}=useRegisterPageSize("Lifecycle transition register");
  const selectionKey=JSON.stringify({...selection,query:selection.query.trim().toLowerCase()}),key=JSON.stringify([selectionKey,pageSize]);
  const [position,setPosition]=useState({key,history:[{cursor:null as string|null,offset:0}]});
  if(position.key!==selectionKey)setPosition({key,history:[{cursor:null,offset:0}]});
  const history=position.key===key?position.history:[{cursor:null,offset:0}],entry=history.at(-1)!,scope=JSON.stringify([key,entry.cursor,focusId]);
  const [result,setResult]=useState<{scope:string;items:LifecycleTransitionOverviewItem[];original:LifecycleTransitionOverviewItem|null;next_cursor:string|null;error:string|null}|null>(null);
  const [loading,setLoading]=useState(enabled),ticket=useRef(0),active=useRef<AbortController|null>(null),inFlight=useRef(false);
  const load=useCallback(async(background=false)=>{
    if(!enabled||background&&inFlight.current)return;
    active.current?.abort();const controller=new AbortController();active.current=controller;inFlight.current=true;
    const run=++ticket.current;setLoading(!background);
    try {
      const readSignal=AbortSignal.any([controller.signal,AbortSignal.timeout(80000)]);
      async function read(id?:string,nativeCursor:string|null=null) {
        const query=new URLSearchParams({view:"journal",routeId:selection.routeId,state:selection.state,q:selection.query,...(id?{id}:nativeCursor?{cursor:nativeCursor}:{})});
        const response=await fetch(`/api/lifecycle-transitions?${query}`,{cache:"no-store",signal:readSignal});
        const value=await response.json();
        if(!response.ok)throw Error(value.error??"The handoff journal could not be read.");
        if(value.mode!=="live"||value.status!=="current"||!Array.isArray(value.items)||value.items.length>25||JSON.stringify(value.page?.selection)!==selectionKey||value.items.some((item:LifecycleTransitionOverviewItem)=>!item.transitionId||item.routeId!==selection.routeId||!Array.isArray(item.references)||!Array.isArray(item.history))||new Set(value.items.map((item:LifecycleTransitionOverviewItem)=>item.transitionId)).size!==value.items.length||value.page.next_cursor!==null&&typeof value.page.next_cursor!=="string")throw Error("The journal returned a different or invalid page.");
        return value as {items:LifecycleTransitionOverviewItem[];page:{next_cursor:string|null}};
      }
      const window=await readRegisterWindow({cursor:entry.cursor,pageSize,scope:key,identity:(row:LifecycleTransitionOverviewItem)=>row.transitionId,readPage:async cursor=>{const next=await read(undefined,cursor);return {rows:next.items,nextCursor:next.page.next_cursor};}});
      const page={items:window.rows,page:{next_cursor:window.nextCursor}};
      const original=focusId&&!page.items.some(item=>item.transitionId===focusId)?(await read(focusId)).items.find(item=>item.transitionId===focusId)??null:null;
      if(focusId&&!page.items.some(item=>item.transitionId===focusId)&&!original)throw Error("The selected original handoff is unavailable.");
      if(run===ticket.current)setResult({scope,items:page.items,original,next_cursor:page.page.next_cursor,error:null});
    }catch(error){if(run===ticket.current&&!controller.signal.aborted)setResult({scope,items:[],original:null,next_cursor:null,error:error instanceof Error?error.message:"Handoff journal unavailable."});}
    finally {if(run===ticket.current&&!controller.signal.aborted){inFlight.current=false;setLoading(false);}}
  },[enabled,key,entry.cursor,focusId]);
  const latest=useRef(load);latest.current=load;
  useEffect(()=>{if(!enabled)return;const timer=setTimeout(()=>void load(),200);return()=>{clearTimeout(timer);ticket.current++;active.current?.abort();inFlight.current=false;};},[enabled,load]);
  useEffect(()=>{if(!enabled)return;const visible=()=>{if(document.visibilityState==="visible")void latest.current(true);};const timer=setInterval(visible,30000);document.addEventListener("visibilitychange",visible);return()=>{clearInterval(timer);document.removeEventListener("visibilitychange",visible);};},[enabled]);
  const current=result?.scope===scope?result:null,pending=enabled&&(loading||!current);
  return {items:current?.items??[],original:current?.original??null,error:current?.error??null,loading:pending,offset:entry.offset,page:history.length,hasPrevious:history.length>1,nextCursor:current?.next_cursor??null,refresh:()=>load(),
    first:()=>history.length>1?setPosition({key,history:[{cursor:null,offset:0}]}):void load(),
    next:()=>{if(current?.next_cursor&&!pending)setPosition({key,history:[...history,{cursor:current.next_cursor,offset:entry.offset+current.items.length}]});},
    previous:()=>{if(history.length>1&&!pending)setPosition({key,history:history.slice(0,-1)});}};
}
