"use client";
import {readRegisterWindow} from '../../../console-integration/registers/read-register-window.ts';
import {useRegisterPageSize} from '../../../console-integration/registers/use-register-page-size.ts';
import { useCallback, useEffect, useRef, useState } from "react";
import { assertModelProfileRequestPage, profileRequestSummary, type ModelProfileRequestPage } from "../work-model/profile-requests/model-profile-history-contract.ts";
import type { ModelProfileRequestProjection } from "./model-operations-live-types.ts";
import { modelProfileRequestsPreview, modelProfilePolicyReviewPreview } from "../read-model/fixtures/model-review-preview.fixture.ts";

type Position = { cursor: string | null; offset: number };
export function useModelProfileRequestHistory(open: boolean, preview: boolean) {
  const {pageSize}=useRegisterPageSize("Profile requests");
  const [page,setPage]=useState<ModelProfileRequestPage|null>(null),[status,setStatus]=useState<"idle"|"loading"|"current"|"unavailable">("idle"),[error,setError]=useState<string|null>(null);
  const [position,setPosition]=useState<Position>({cursor:null,offset:0}),[previous,setPrevious]=useState<Position[]>([]);
  const sequence=useRef(0),active=useRef<AbortController|null>(null);
  const read=useCallback(async(target:Position,trail:Position[])=>{
    const token=++sequence.current;active.current?.abort();const controller=new AbortController();active.current=controller;setStatus("loading");setError(null);
    try {
      let next:ModelProfileRequestPage;
      if(preview)next={schema_version:1,requests:modelProfileRequestsPreview().map(profileRequestSummary).sort((a,b)=>a.request_id.localeCompare(b.request_id)),next_cursor:null};
      else {
        const signal=AbortSignal.any([controller.signal,AbortSignal.timeout(15000)]);
        const window=await readRegisterWindow({cursor:target.cursor,pageSize,scope:"Profile requests",signal,identity:(row:ModelProfileRequestPage["requests"][number])=>row.request_id,readPage:async cursor=>{
          const query=new URLSearchParams();if(cursor)query.set("cursor",cursor);
          const response=await fetch("/api/model-operations/requests"+(query.size?"?"+query:""),{cache:"no-store",signal});
          if(!response.ok)throw Error("Request history could not be loaded. Retry this page; the profile register remains available.");
          const page=assertModelProfileRequestPage(await response.json(),cursor);return {rows:page.requests,nextCursor:page.next_cursor};
        }});
        next={schema_version:1,requests:window.rows,next_cursor:window.nextCursor};
      }
      if(sequence.current===token){setPage(next);setPosition(target);setPrevious(trail);setStatus("current");}
    }catch(cause){if(sequence.current===token&&!controller.signal.aborted){setPage(null);setPosition(target);setPrevious(trail);setStatus("unavailable");setError(cause instanceof Error?cause.message:"Request history is unavailable.");}}
  },[preview,pageSize]);
  useEffect(()=>{if(open)void read({cursor:null,offset:0},[]);return()=>{sequence.current++;active.current?.abort();};},[open,read]);
  return {previewPolicy:(request:ModelProfileRequestProjection)=>preview?modelProfilePolicyReviewPreview(request):null,page,status,error,offset:position.offset,pageNumber:previous.length+1,
    refresh:()=>read(position,previous),restart:()=>read({cursor:null,offset:0},[]),
    next:()=>page?.next_cursor?read({cursor:page.next_cursor,offset:position.offset+page.requests.length},[...previous,position]):Promise.resolve(),
    back:()=>previous.length?read(previous.at(-1)!,previous.slice(0,-1)):Promise.resolve(),hasPrevious:previous.length>0};
}
