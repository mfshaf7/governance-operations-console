"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {assertGovernedProductProjection,type GovernedProductProjection} from "./governed-product-contract.ts";
import type {ProductReleaseFilters} from "../read-model/product-release-selectors.ts";
const initialFilters:ProductReleaseFilters={query:"",maturity:"all",endpoint:"all"};
export function useGovernedProducts(enabled:boolean){
 const [projection,setProjection]=useState<GovernedProductProjection|null>(null);
 const [filters,setFilters]=useState(initialFilters),[error,setError]=useState<string|null>(null),[current,setCurrent]=useState(false),[loading,setLoading]=useState(false);
 const generation=useRef(0),mounted=useRef(true);const key=JSON.stringify(filters),lastFilter=useRef(key);
 const load=useCallback(async(more=false)=>{
  if(!enabled)return;const run=++generation.current;setLoading(true);
  const offset=more?projection?.page.next_offset:null;
  if(more&&offset==null){setLoading(false);return;}
  try{
   const query=new URLSearchParams({limit:"20",offset:String(offset??0),q:filters.query,maturity:filters.maturity,endpoint:filters.endpoint});
   const response=await fetch(`/api/governed-products?${query}`,{cache:"no-store"});const body=await response.json();
   if(!response.ok||body.mode!=="live")throw new Error(body.error??"Owner product records are unavailable.");
   const next=assertGovernedProductProjection(body.projection);
   if(!mounted.current||run!==generation.current)return;
   if(more&&projection?.source_version!==next.source_version)throw new Error("Owner source changed. Refresh the register before loading more products.");
   const sameFilter=lastFilter.current===key;lastFilter.current=key;
   setProjection(previous=>{
    if(!previous||!sameFilter||previous.source_version!==next.source_version)return next;
    const merged=more?[...previous.products,...next.products]:[...next.products,...previous.products.filter(old=>!next.products.some(item=>item.product_id===old.product_id))];
    return {...next,products:merged,page:more?next.page:{...next.page,next_offset:previous.page.next_offset}};
   });setCurrent(next.source_posture===undefined||next.source_posture==="owner-main");setError(null);
  }catch(e){if(mounted.current&&run===generation.current){setCurrent(false);setError(e instanceof Error?e.message:"Owner product records are unavailable.");}}
  finally{if(mounted.current&&run===generation.current)setLoading(false);}
 },[enabled,key,filters,projection]);
 const loadRef=useRef(load);loadRef.current=load;
 useEffect(()=>{mounted.current=true;if(enabled)void loadRef.current();else{generation.current++;setCurrent(false);}
  return()=>{mounted.current=false;generation.current++;};},[enabled,key]);
 useEffect(()=>{if(!enabled)return;const refresh=()=>{if(document.visibilityState==="visible")void loadRef.current();};const timer=setInterval(refresh,30000);document.addEventListener("visibilitychange",refresh);return()=>{clearInterval(timer);document.removeEventListener("visibilitychange",refresh);};},[enabled]);
 return {projection,filters,setFilters,error,current,loading,load:()=>loadRef.current(),loadMore:()=>loadRef.current(true)};
}
