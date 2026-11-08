"use client";
import {preparedModelProfileRejectedBeforeCreate,modelProfileRequestSubmission} from "../work-model/profile-requests/model-profile-preparation-contract.ts";
import {useCallback,useEffect,useRef,useState} from "react";
import {createBrowserOperationDraftStore} from "../../operation-runtime/browser-draft-store.ts";
import {assertModelOperationsLiveSnapshot,assertModelProfileRequestId,assertModelProfileRequestProjection,isModelOperationsLiveApiError} from "./model-operations-live-contract.ts";
import type {ModelOperationsLiveSnapshot,ModelProfileRequestDraft,ModelProfileRequestProjection} from "./model-operations-live-types.ts";

const pollIntervalMs=15_000;
const recoveryKey="console:model-profiles:original-request";
const recoveryStore=createBrowserOperationDraftStore();
export function useModelOperationsLiveRuntime(enabled = true) {
  const [snapshot,setSnapshot]=useState<ModelOperationsLiveSnapshot|null>(null);
  const [current,setCurrent]=useState(false);
  const [pending,setPending]=useState(false),[error,setError]=useState<string|null>(null);
  const [recoveryId,setRecoveryId]=useState<string|null>(null);
  const alive=useRef(true),sequence=useRef(0),recoveryRef=useRef<string|null>(null);
  const reading=useRef<Promise<ModelOperationsLiveSnapshot>|null>(null);
  const submitting=useRef<Promise<ModelProfileRequestProjection>|null>(null);
  useEffect(()=>{
    const id=recoveryStore.readJson(recoveryKey,value=>{try{if(typeof value!=="string")return null;assertModelProfileRequestId(value);return value;}catch{return null;}});
    recoveryRef.current=id;setRecoveryId(id);
  },[]);
  const clearRecovery=useCallback((id:string)=>{
    if(recoveryRef.current!==id)return;
    recoveryRef.current=null;setRecoveryId(null);try{recoveryStore.remove(recoveryKey);}catch{/* Browser storage may be unavailable. The source result remains authoritative. */}
  },[]);
  const refresh=useCallback(async(afterMutation=false):Promise<ModelOperationsLiveSnapshot>=>{
    if(reading.current){if(!afterMutation)return reading.current;await reading.current;}
    const token=++sequence.current;
    const operation=(async()=>{
      let next:ModelOperationsLiveSnapshot;
      try{
        const response=await fetch("/api/model-operations",{cache:"no-store",signal:AbortSignal.timeout(30_000)});
        const body:unknown=await response.json().catch(()=>null);
        next=response.ok?assertModelOperationsLiveSnapshot(body):offlineSnapshot(body);
      }catch(cause){next=offlineSnapshot(cause);}
      if(alive.current&&token===sequence.current){setSnapshot(next);setCurrent(next.status==="current");}
      return next;
    })();
    reading.current=operation;
    try{return await operation;}finally{if(reading.current===operation)reading.current=null;}
  },[]);
  useEffect(()=>{
    alive.current=true;
    setCurrent(false);
    if (!enabled) return () => { alive.current=false; };
    void refresh();
    const timer=window.setInterval(()=>{if(document.visibilityState==="visible")void refresh();},pollIntervalMs);
    return()=>{alive.current=false;window.clearInterval(timer);};
  },[enabled,refresh]);
  const submitCreate=useCallback((draft:ModelProfileRequestDraft):Promise<ModelProfileRequestProjection>=>{
    if(submitting.current)return submitting.current;
    setPending(true);setError(null);setRecoveryId(draft.requestId);recoveryRef.current=draft.requestId;try{recoveryStore.writeJson(recoveryKey,draft.requestId);}catch{/* Keep in-memory original-request recovery when browser storage is denied. */}
    const operation=(async()=>{
      try{
        const response=await fetch("/api/model-operations",{body:JSON.stringify(modelProfileRequestSubmission(draft)),headers:{"Content-Type":"application/json"},method:"POST",signal:AbortSignal.timeout(30_000)});
        const body:unknown=await response.json().catch(()=>null);
        if(!response.ok){if(draft.workflowId&&isModelOperationsLiveApiError(body)&&preparedModelProfileRejectedBeforeCreate(body.code))clearRecovery(draft.requestId);throw clientError(body);}
        const result=assertModelProfileRequestProjection(body);
        if(result.request_id!==draft.requestId)throw new Error("The saved result belongs to another request. Check the original request.");
        clearRecovery(draft.requestId);
        // A recorded submission remains successful when a separate register refresh fails.
        await refresh(true);return result;
      }catch(cause){setError(cause instanceof Error?cause.message:"Request result could not be confirmed.");throw cause;}
      finally{setPending(false);}
    })();
    submitting.current=operation;
    void operation.finally(()=>{if(submitting.current===operation)submitting.current=null;}).catch(()=>undefined);
    return operation;
  },[clearRecovery,refresh]);
  return {error,pending,refresh,snapshot,current:enabled&&current,submitCreate,recoveryId,clearRecovery};
}
function offlineSnapshot(value:unknown):ModelOperationsLiveSnapshot {
  return {error:isModelOperationsLiveApiError(value)?value.error:value instanceof Error?value.message:"Purpose profiles are unavailable. Retry the source read.",
    mode:"live",observedAt:new Date().toISOString(),readModel:null,requests:[],source:null,status:"offline"};
}
function clientError(value:unknown) {
  return new Error(isModelOperationsLiveApiError(value)?value.error:"Request result was not confirmed. Check the original request before sending again.");
}
