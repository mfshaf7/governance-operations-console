'use client';
import{useCallback,useEffect,useRef,useState}from'react';
import{assertModelProfileRequestOptions,type ModelProfileRequestOptions}from'../work-model/profile-requests/model-profile-preparation-contract.ts';
import{modelProfileOptionsPreview}from'../read-model/fixtures/model-review-preview.fixture.ts';
export function useModelProfileRequestOptions(open:boolean,preview:boolean){
 const[options,setOptions]=useState<ModelProfileRequestOptions|null>(null),[status,setStatus]=useState<'idle'|'loading'|'current'|'unavailable'>('idle'),[error,setError]=useState<string|null>(null);const sequence=useRef(0);
 const refresh=useCallback(async()=>{const token=++sequence.current;setStatus('loading');setError(null);if(preview){setOptions(modelProfileOptionsPreview());setStatus('current');return;}
 try{const response=await fetch('/api/model-operations/request-options',{cache:'no-store',signal:AbortSignal.timeout(15000)});const body:unknown=await response.json().catch(()=>null);if(!response.ok)throw Error('Registered workflow setup could not be loaded. Retry the connection before submitting.');const next=assertModelProfileRequestOptions(body);if(sequence.current===token){setOptions(next);setStatus('current');}}
 catch(cause){if(sequence.current===token){setOptions(null);setStatus('unavailable');setError(cause instanceof Error?cause.message:'Workflow setup is unavailable.');}}
 },[preview]);
 useEffect(()=>{if(open)void refresh();return()=>{sequence.current++;};},[open,refresh]);
 return{options,status,error,refresh};
}
