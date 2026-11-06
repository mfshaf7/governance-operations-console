'use client';
import{useCallback,useEffect,useRef,useState}from'react';
import{assertModelProfileRequestPage,profileRequestSummary,type ModelProfileRequestPage}from'../work-model/profile-requests/model-profile-history-contract.ts';
import type{ModelProfileRequestProjection}from'./model-operations-live-types.ts';
import{modelProfileRequestsPreview,modelProfilePolicyReviewPreview}from'../read-model/fixtures/model-review-preview.fixture.ts';
export function useModelProfileRequestHistory(open:boolean,preview:boolean){
 const[page,setPage]=useState<ModelProfileRequestPage|null>(null),[status,setStatus]=useState<'idle'|'loading'|'current'|'unavailable'>('idle'),[error,setError]=useState<string|null>(null),[cursor,setCursor]=useState<string|null>(null),[previous,setPrevious]=useState<(string|null)[]>([]);const sequence=useRef(0);
 const read=useCallback(async(target:string|null,trail:(string|null)[])=>{const token=++sequence.current;setStatus('loading');setError(null);
 try{let next:ModelProfileRequestPage;if(preview){next={schema_version:1,requests:modelProfileRequestsPreview().map(profileRequestSummary).sort((a,b)=>a.request_id.localeCompare(b.request_id)),next_cursor:null};}else{const query=new URLSearchParams();if(target)query.set('cursor',target);const response=await fetch('/api/model-operations/requests'+(query.size?'?'+query:''),{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Request history could not be loaded. Retry this page; the profile register remains available.');next=assertModelProfileRequestPage(await response.json(),target);}if(sequence.current===token){setPage(next);setCursor(target);setPrevious(trail);setStatus('current');}}
 catch(cause){if(sequence.current===token){setPage(null);setCursor(target);setPrevious(trail);setStatus('unavailable');setError(cause instanceof Error?cause.message:'Request history is unavailable.');}}
 },[preview]);
 useEffect(()=>{if(open)void read(null,[]);return()=>{sequence.current++;};},[open,read]);
 return{previewPolicy:(request:ModelProfileRequestProjection)=>preview?modelProfilePolicyReviewPreview(request):null,page,status,error,refresh:()=>read(cursor,previous),restart:()=>read(null,[]),next:()=>page?.next_cursor?read(page.next_cursor,[...previous,cursor]):Promise.resolve(),back:()=>previous.length?read(previous.at(-1)??null,previous.slice(0,-1)):Promise.resolve(),hasPrevious:previous.length>0};
}
