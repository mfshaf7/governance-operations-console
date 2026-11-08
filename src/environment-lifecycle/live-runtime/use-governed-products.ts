"use client";
import { useWorkspaceViewState } from "../../console-integration/registers/workspace-view-state.ts";
import {readRegisterOffsetWindow} from '../../console-integration/registers/read-register-offset-window.ts';
import {useRegisterPageSize} from '../../console-integration/registers/use-register-page-size.ts';
import {useCallback,useEffect,useRef,useState} from "react";
import {assertGovernedProductProjection,type GovernedProductProjection} from "./governed-product-contract.ts";
import type {ProductReleaseFilters} from "../read-model/product-release-selectors.ts";
const initialFilters:ProductReleaseFilters={query:"",maturity:"all",endpoint:"all"};
export function useGovernedProducts(enabled:boolean){
 const {pageSize}=useRegisterPageSize("Governed products");
 const [projection,setProjection]=useState<GovernedProductProjection|null>(null);
 const [filters,setFilters]=useWorkspaceViewState('governed-releases:filters', initialFilters),[error,setError]=useState<string|null>(null),[current,setCurrent]=useState(false),[loading,setLoading]=useState(false);
 const generation=useRef(0),mounted=useRef(true);const key=JSON.stringify([filters,pageSize]);
 const [position,setPosition]=useState({key,offset:0});
 if(position.key!==key)setPosition({key:key,offset:0});
  const offset=position.key===key?position.offset:0;
 const scopeKey=`${key}:${offset}`;
 const [projectionScope,setProjectionScope]=useState<string|null>(null),[settledScope,setSettledScope]=useState<string|null>(null);
 const epoch=useRef<{key:string;version:string}|null>(null);
 const request=useRef<{key:string;controller:AbortController}|null>(null);
 const load=useCallback(async(background=false)=>{
  if(!enabled)return;const readKey=`${key}:${offset}`;
  if(request.current?.key===readKey&&!request.current.controller.signal.aborted)return;
  request.current?.controller.abort();const controller=new AbortController();request.current={key:readKey,controller};
  const run=++generation.current;setLoading(!background);if(!background)setCurrent(false);
  try{
   const window=await readRegisterOffsetWindow({offset,pageSize,signal:controller.signal,readPage:async nativeOffset=>{
   const query=new URLSearchParams({limit:"25",offset:String(nativeOffset),q:filters.query,maturity:filters.maturity,endpoint:filters.endpoint});
   const response=await fetch(`/api/governed-products?${query}`,{cache:"no-store",signal:controller.signal});const body=await response.json();
   if(!response.ok||body.mode!=="live")throw new Error(body.error??"Owner product records are unavailable.");
   const native=assertGovernedProductProjection(body.projection);
   if(native.page.offset!==nativeOffset)throw new Error("The product source returned a different page. Refresh to retry.");
    return {rows:native.products,total:native.page.total,nextOffset:native.page.next_offset,version:native.source_version,metadata:native};
   }});
   const next={...window.metadata,products:window.rows,page:window.page};if(!mounted.current||run!==generation.current)return;
   const version=JSON.stringify([next.source_version,next.page.total]);
   if(offset>0&&(epoch.current?.key!==key||epoch.current.version!==version))throw new Error("The product register changed. Refresh the first page.");
   if(offset===0)epoch.current={key,version};
   setProjectionScope(readKey);setSettledScope(readKey);setProjection(next);setCurrent(next.source_posture===undefined||next.source_posture==="owner-main");setError(null);
  }catch(e){if(mounted.current&&run===generation.current){setSettledScope(readKey);setCurrent(false);setError(e instanceof Error?e.message:"Owner product records are unavailable.");}}
  finally{if(mounted.current&&run===generation.current){setLoading(false);if(request.current?.controller===controller)request.current=null;}}
 },[enabled,key,filters,offset]);
 const loadRef=useRef(load);loadRef.current=load;
 useEffect(()=>{mounted.current=true;if(enabled)void loadRef.current();else{generation.current++;setCurrent(false);}
  return()=>{mounted.current=false;generation.current++;request.current?.controller.abort();request.current=null;};},[enabled,key,offset]);
 useEffect(()=>{if(!enabled)return;const refresh=()=>{if(document.visibilityState==="visible")void loadRef.current(true);};const timer=setInterval(refresh,30000);document.addEventListener("visibilitychange",refresh);return()=>{clearInterval(timer);document.removeEventListener("visibilitychange",refresh);};},[enabled]);
 return {pageSize,projection:projectionScope===scopeKey?projection:null,filters,setFilters,error:settledScope===scopeKey?error:null,current:projectionScope===scopeKey&&current,loading:enabled&&(loading||settledScope!==scopeKey),first:()=>{if(offset)setPosition({key,offset:0});else void loadRef.current();},load:()=>loadRef.current(),loadMore:()=>{if(projectionScope===scopeKey&&current&&projection?.page.next_offset!=null)setPosition({key,offset:projection.page.next_offset});},previous:()=>setPosition({key,offset:Math.max(0,offset-pageSize)}),offset};
}
