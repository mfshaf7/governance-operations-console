"use client";
import {readRegisterWindow} from '../../../console-integration/registers/read-register-window.ts';
import {useRegisterPageSize} from '../../../console-integration/registers/use-register-page-size.ts';
import {useCallback,useEffect,useRef,useState} from "react";
import type {RepositoryWorkspaceRecord} from "../domain/repository-types.ts";
import type {RepositoryRegisterSelection} from "../read-model/repository-register-selection.ts";

const emptyRecords:RepositoryWorkspaceRecord[]=[];

export function useRepositoryRegisterPage(selection:RepositoryRegisterSelection,enabled:boolean){
  const {pageSize}=useRegisterPageSize('Repository');
  const selectionKey=JSON.stringify(selection),key=JSON.stringify([selectionKey,pageSize]),[position,setPosition]=useState({key,history:[{cursor:null as string|null,offset:0}]}),[result,setResult]=useState<{records:RepositoryWorkspaceRecord[];next_cursor:string|null}|null>(null);
  if(position.key!==key)setPosition({key,history:[{cursor:null,offset:0}]});
  const history=position.key===key?position.history:[{cursor:null,offset:0}],entry=history.at(-1)!,cursor=entry.cursor;
  const scopeKey=JSON.stringify([key,cursor]);
  const [resultScope,setResultScope]=useState<string|null>(null),[settledScope,setSettledScope]=useState<string|null>(null);
  const [loading,setLoading]=useState(enabled),[error,setError]=useState<string|null>(null);
  const inFlight=useRef(false),ticket=useRef(0),active=useRef<AbortController|null>(null);
  const load=useCallback(async(background=false)=>{
    if(!enabled||background&&inFlight.current)return;
    inFlight.current=true;
    active.current?.abort();const controller=new AbortController();active.current=controller;
    const run=++ticket.current;setLoading(!background);if(!background)setError(null);
    try{
      const signal=AbortSignal.any([controller.signal,AbortSignal.timeout(80000)]);
      const window=await readRegisterWindow({cursor,pageSize,scope:key,signal,identity:(row:RepositoryWorkspaceRecord)=>row.id,readPage:async(nativeCursor)=>{
      const query=new URLSearchParams({q:selection.query,status:selection.status,account:selection.account,...(nativeCursor?{cursor:nativeCursor}:{})});
      const response=await fetch(`/api/repositories/register?${query}`,{cache:"no-store",signal});
      const body=await response.json();
      if(!response.ok)throw Error(body.error??"Repository search could not be read.");
      if(body.mode!=="live"||body.status!=="current"||!Array.isArray(body.records)||body.records.length>25||!body.page||JSON.stringify(body.page.selection)!==selectionKey||
        body.page.next_cursor!==null&&(typeof body.page.next_cursor!=="string"||body.page.next_cursor.length>1400)||body.records.some((row:RepositoryWorkspaceRecord)=>!row.id||!row.providerIdentity)||new Set(body.records.map((row:RepositoryWorkspaceRecord)=>row.id)).size!==body.records.length)throw Error("The repository source returned a different or invalid page.");
        return {rows:body.records as RepositoryWorkspaceRecord[],nextCursor:body.page.next_cursor};
      }});
      if(run===ticket.current){setResult({records:window.rows,next_cursor:window.nextCursor});setResultScope(scopeKey);setSettledScope(scopeKey);setError(null);}
    }catch(e){if(run===ticket.current&&!controller.signal.aborted){setError(e instanceof Error?e.message:"Repository search unavailable.");setResult(null);setSettledScope(scopeKey);}}
    finally{if(run===ticket.current&&!controller.signal.aborted){setLoading(false);inFlight.current=false;}}
  },[enabled,key,cursor]);
  const latest=useRef(load);latest.current=load;
  useEffect(()=>{const timer=setTimeout(()=>void load(),200);return()=>{clearTimeout(timer);ticket.current++;active.current?.abort();};},[load]);
  useEffect(()=>{if(!enabled)return;const visible=()=>{if(document.visibilityState==="visible")void latest.current(true);};const timer=setInterval(visible,30000);document.addEventListener("visibilitychange",visible);return()=>{clearInterval(timer);document.removeEventListener("visibilitychange",visible);};},[enabled]);
  const visible=resultScope===scopeKey?result:null,pending=enabled&&(loading||settledScope!==scopeKey);
  return {records:visible?.records??emptyRecords,loading:pending,error:settledScope===scopeKey?error:null,offset:entry.offset,pageNumber:history.length,nextCursor:visible?.next_cursor??null,hasPrevious:history.length>1,refresh:load,
    next:()=>{if(visible?.next_cursor&&!pending)setPosition({key,history:[...history,{cursor:visible.next_cursor,offset:entry.offset+visible.records.length}]});},
    first:()=>{if(history.length>1)setPosition({key,history:[{cursor:null,offset:0}]});else void load();},
    previous:()=>{if(history.length>1&&!pending)setPosition({key,history:history.slice(0,-1)});}};
}
