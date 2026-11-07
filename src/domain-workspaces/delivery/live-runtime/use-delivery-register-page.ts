"use client";
import {readRegisterWindow} from '../../../console-integration/registers/read-register-window.ts';
import {useRegisterPageSize} from '../../../console-integration/registers/use-register-page-size.ts';
import {useCallback,useEffect,useRef,useState} from "react";
import type {DeliveryReadModel} from "../read-model/index.ts";
export type DeliveryRegisterSelection={surface:string;scope:"current"|"history";query:string;status:string};
export function useDeliveryRegisterPage(selection:DeliveryRegisterSelection,enabled:boolean,focusId?:string|null){
  const {pageSize}=useRegisterPageSize("Delivery packages:"+selection.surface);
  const selectionKey=JSON.stringify(selection),key=JSON.stringify([selectionKey,pageSize]),[position,setPosition]=useState({key,history:[{cursor:null as string|null,offset:0}]}),[model,setModel]=useState<DeliveryReadModel|null>(null),[original,setOriginal]=useState<DeliveryReadModel|null>(null);
  if(position.key!==key)setPosition({key,history:[{cursor:null,offset:0}]});
  const history=position.key===key?position.history:[{cursor:null,offset:0}],entry=history.at(-1)!,cursor=entry.cursor;
  const scopeKey=JSON.stringify([key,cursor]);
  const [resultScope,setResultScope]=useState<string|null>(null),[settledScope,setSettledScope]=useState<string|null>(null);
  const [loading,setLoading]=useState(enabled),[error,setError]=useState<string|null>(null),[nextCursor,setNextCursor]=useState<string|null>(null);
  const inFlight=useRef(false),ticket=useRef(0),active=useRef<AbortController|null>(null);
  const refresh=useCallback(async(background=false)=>{
    if(!enabled||background&&inFlight.current)return;inFlight.current=true;active.current?.abort();const controller=new AbortController();active.current=controller;
    const run=++ticket.current;setLoading(!background);if(!background)setError(null);
    try{
      const readSignal=AbortSignal.any([controller.signal,AbortSignal.timeout(80000)]);
      const params=new URLSearchParams({view:"register",surface:selection.surface,scope:selection.scope,q:selection.query,status:selection.status,...(cursor?{cursor}:{})});
      const read=async(query:URLSearchParams)=>{
        const response=await fetch(`/api/delivery/workspace?${query}`,{cache:"no-store",signal:readSignal});const body=await response.json();
        if(!response.ok||body.mode!=="live"||body.projection?.schema_version!==1||body.projection.source_truth!=="OpenProject-backed OOS"||!Array.isArray(body.projection.packages)||body.projection.packages.length>25||!body.page||body.page.next_cursor!==null&&(typeof body.page.next_cursor!=="string"||body.page.next_cursor.length>8192))throw Error(body.error??"Delivery register source is unavailable.");
        return body;
      };
      const models:DeliveryReadModel[]=[];
      const window=await readRegisterWindow({cursor,pageSize,scope:key,signal:readSignal,identity:(row:DeliveryReadModel["packages"][number])=>row.delivery_package_id,readPage:async nativeCursor=>{
        const query=new URLSearchParams(params);query.delete("cursor");if(nativeCursor)query.set("cursor",nativeCursor);
        const body=await read(query);if(JSON.stringify(body.page.selection)!==selectionKey)throw Error("The owner returned a different Delivery page.");models.push(body.projection);return {rows:body.projection.packages,nextCursor:body.page.next_cursor};
      }});
      const ids=new Set(window.rows.map(row=>row.delivery_package_id)),roots=new Set(window.rows.map(row=>row.tree_root_id)),last=models.at(-1)!;
      const next={projection:{...last,packages:window.rows,selected_packages:[...new Map(models.flatMap(model=>model.selected_packages.filter(row=>ids.has(row.delivery_package_id))).map(row=>[row.delivery_package_id,row])).values()],art_tree:{...last.art_tree,roots:[...new Map(models.flatMap(model=>model.art_tree.roots.filter(row=>roots.has(row.id))).map(row=>[row.id,row])).values()]}},page:{next_cursor:window.nextCursor}};
      let detail:DeliveryReadModel|null=null;
      if(focusId&&!next.projection.packages.some((row:{delivery_package_id:string})=>row.delivery_package_id===focusId)){
        const exact=await read(new URLSearchParams({view:"register",surface:selection.surface,scope:selection.scope,id:focusId}));
        if(exact.projection.packages.length!==1||exact.projection.packages[0].delivery_package_id!==focusId)throw Error("The selected original Delivery package could not be verified.");detail=exact.projection;
      }
      if(run===ticket.current){setModel(next.projection);setOriginal(detail);setNextCursor(next.page.next_cursor);setResultScope(scopeKey);setSettledScope(scopeKey);setError(null);}
    }catch(e){if(run===ticket.current&&!controller.signal.aborted){setModel(null);setOriginal(null);setSettledScope(scopeKey);setError(e instanceof Error?e.message:"Delivery register source unavailable.");}}
    finally{if(run===ticket.current&&!controller.signal.aborted){setLoading(false);inFlight.current=false;}}
  },[enabled,key,cursor,focusId]);
  const latest=useRef(refresh);latest.current=refresh;
  useEffect(()=>{const timer=setTimeout(()=>void refresh(),200);return()=>{clearTimeout(timer);ticket.current++;active.current?.abort();};},[refresh]);
  useEffect(()=>{if(!enabled)return;const visible=()=>{if(document.visibilityState==="visible")void latest.current(true);};const timer=setInterval(visible,30000);document.addEventListener("visibilitychange",visible);return()=>{clearInterval(timer);document.removeEventListener("visibilitychange",visible);};},[enabled]);
  const visible=resultScope===scopeKey?model:null,pending=enabled&&(loading||settledScope!==scopeKey);
  return {model:visible,original:resultScope===scopeKey?original:null,error:settledScope===scopeKey?error:null,loading:pending,refresh,offset:entry.offset,pageNumber:history.length,nextCursor:resultScope===scopeKey?nextCursor:null,hasPrevious:history.length>1,
    next:()=>{if(nextCursor&&resultScope===scopeKey&&!pending)setPosition({key,history:[...history,{cursor:nextCursor,offset:entry.offset+(visible?.packages.length??0)}]});},first:()=>{if(history.length>1)setPosition({key,history:[{cursor:null,offset:0}]});else void refresh();},previous:()=>{if(history.length>1&&!pending)setPosition({key,history:history.slice(0,-1)});}};
}
