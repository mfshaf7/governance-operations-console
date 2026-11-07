"use client";
import {readRegisterWindow} from '../../console-integration/registers/read-register-window.ts';
import {useRegisterPageSize} from '../../console-integration/registers/use-register-page-size.ts';
import {useCallback,useEffect,useRef,useState} from "react";
import {assertWorkspaceContinuityProjection,assertWorkspaceContinuityProduct} from "../workspace-continuity-contract.ts";
import type {WorkspaceContinuityProduct} from "../workspace-continuity-types.ts";
type Selection={query:string;maturity:string;posture:string};
export function useWorkspaceProductsPage(selection:Selection,focusId:string|null){
  const {pageSize}=useRegisterPageSize("Managed products");
  const scope={...selection,query:selection.query.trim().toLowerCase(),id:null},selectionKey=JSON.stringify(scope),key=JSON.stringify([selectionKey,pageSize]);
  const [position,setPosition]=useState({key,history:[{cursor:null as string|null,offset:0}]}),[result,setResult]=useState<{key:string;products:WorkspaceContinuityProduct[];original:WorkspaceContinuityProduct|null;total:number;next:string|null}|null>(null);
  if(position.key!==key)setPosition({key,history:[{cursor:null,offset:0}]});
  const history=position.key===key?position.history:[{cursor:null,offset:0}],entry=history.at(-1)!,readKey=JSON.stringify([key,entry.cursor,focusId]);
  const [settled,setSettled]=useState<string|null>(null),[error,setError]=useState<string|null>(null),[reading,setReading]=useState(true);
  const active=useRef<AbortController|null>(null),generation=useRef(0),flight=useRef(false);
  const load=useCallback(async(background=false)=>{
    if(background&&flight.current)return;flight.current=true;active.current?.abort();const controller=new AbortController();active.current=controller;
    const run=++generation.current;setReading(!background);if(!background)setError(null);
    const readSignal=AbortSignal.any([controller.signal,AbortSignal.timeout(80000)]);
    const read=async(params:URLSearchParams)=>{
      const response=await fetch(`/api/workspace-continuity?${params}`,{cache:"no-store",signal:readSignal});let body=await response.json();
      if(!response.ok)throw Error(body.error??"Managed products are unavailable.");
      // Complete short-list responses from the prior adapter remain readable.
      const expected={query:(params.get("query")??"").trim().toLowerCase(),maturity:params.get("maturity")??"all",posture:params.get("posture")??"all",id:params.get("id")};
      if(body.artifact_type==="workspace-continuity-projection"){
        const source=assertWorkspaceContinuityProjection(body),id=params.get("id");
        if(params.has("cursor")||source.products.length>=25)throw Error("The product reader cannot confirm continuation. Refresh its source.");
        const rows=source.products.filter(row=>(!id||row.product_id===id)&&(expected.maturity==="all"||row.maturity===expected.maturity)&&(expected.posture==="all"||row.posture===expected.posture)&&(!expected.query||[row.product_id,row.name,row.owners.platform,row.owners.security,row.owners.runtime,...row.owners.source].join(" ").toLowerCase().includes(expected.query)));
        body={artifact_type:"workspace-products-page",projection_state:"current",selection:expected,products:rows,page:{total:rows.length,next_cursor:null}};
      }
      if(body.artifact_type!=="workspace-products-page"||body.projection_state!=="current"||JSON.stringify(body.selection)!==JSON.stringify(expected)||!Array.isArray(body.products)||body.products.length>25||new Set(body.products.map((row:WorkspaceContinuityProduct)=>row.product_id)).size!==body.products.length||!Number.isSafeInteger(body.page?.total)||body.page.total<body.products.length||body.page.next_cursor!==null&&(typeof body.page.next_cursor!=="string"||body.page.next_cursor.length>1024))throw Error("The source returned an invalid product page.");
      return {...body,products:body.products.map(assertWorkspaceContinuityProduct) as WorkspaceContinuityProduct[]};
    };
    try{
      let total:number|null=null;
      const window=await readRegisterWindow({cursor:entry.cursor,pageSize,scope:key,signal:readSignal,identity:(row:WorkspaceContinuityProduct)=>row.product_id,readPage:async cursor=>{
        const body=await read(new URLSearchParams({view:"products",query:scope.query,maturity:scope.maturity,posture:scope.posture,...(cursor?{cursor}:{})}));
        if(total!==null&&total!==body.page.total)throw Error("The product register changed. Refresh the first page.");total=body.page.total;return {rows:body.products,nextCursor:body.page.next_cursor};
      }});
      const next={products:window.rows,page:{total:total!,next_cursor:window.nextCursor}};
      let original:WorkspaceContinuityProduct|null=null;
      if(focusId&&!next.products.some((row:WorkspaceContinuityProduct)=>row.product_id===focusId)){
        const exact=await read(new URLSearchParams({view:"products",id:focusId}));
        if(exact.products.length!==1||exact.products[0].product_id!==focusId)throw Error("The selected original product could not be verified.");original=exact.products[0];
      }
      if(run===generation.current){setResult({key:readKey,products:next.products,original,total:next.page.total,next:next.page.next_cursor});setSettled(readKey);setError(null);}
    }catch(e){if(run===generation.current&&!controller.signal.aborted){setResult(null);setSettled(readKey);setError(e instanceof Error?e.message:"Managed products unavailable.");}}
    finally{if(run===generation.current&&!controller.signal.aborted){setReading(false);flight.current=false;}}
  },[key,entry.cursor,focusId]);
  const latest=useRef(load);latest.current=load;
  useEffect(()=>{const timer=setTimeout(()=>void load(),200);return()=>{clearTimeout(timer);generation.current++;active.current?.abort();};},[load]);
  useEffect(()=>{const visible=()=>{if(document.visibilityState==="visible")void latest.current(true);};const timer=setInterval(visible,30000);document.addEventListener("visibilitychange",visible);return()=>{clearInterval(timer);document.removeEventListener("visibilitychange",visible);};},[]);
  const current=result?.key===readKey?result:null,loading=reading||settled!==readKey;
  return {products:current?.products??null,original:current?.original??null,total:current?.total??null,nextCursor:current?.next??null,offset:entry.offset,pageNumber:history.length,hasPrevious:history.length>1,error:settled===readKey?error:null,loading,refresh:load,
    next:()=>{if(current?.next&&!loading)setPosition({key,history:[...history,{cursor:current.next,offset:entry.offset+current.products.length}]});},previous:()=>{if(history.length>1&&!loading)setPosition({key,history:history.slice(0,-1)});},first:()=>{if(history.length>1)setPosition({key,history:[{cursor:null,offset:0}]});else void load();}};
}
