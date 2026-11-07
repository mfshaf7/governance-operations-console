"use client";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import type {ProposalLiveRecord,ProposalLiveSnapshot} from "./proposal-live-types.ts";
import {readProposalCollection} from "./proposal-collection-read.ts";
import {assertProposalOosProjection,assertProposalOosHistory} from "./proposal-live-contract.ts";

export function useProposalCollectionRead() {
  const [source,setSnapshot]=useState<ProposalLiveSnapshot|null>(null),[reading,setReading]=useState(false);
  const [details,setDetails]=useState<Record<string,ProposalLiveRecord>>({});
  const [inspection,setInspection]=useState<{id:string;state:"loading"|"current"|"unavailable";version?:string;error:string|null}|null>(null);
  const sourceRef=useRef(source),inspectionSequence=useRef(0);sourceRef.current=source;
  const alive=useRef(false),flight=useRef<Promise<ProposalLiveSnapshot>|null>(null),lifetime=useRef<AbortController|null>(null);
  const generation=useRef(0);
  const inspect=useCallback(async(id:string)=>{
    const token=++inspectionSequence.current,ticket=generation.current;
    const valid=()=>alive.current&&ticket===generation.current&&token===inspectionSequence.current;
    setInspection({id,state:"loading",error:null});
    try {
      const existing=sourceRef.current?.records.find(row=>row.projection.proposal_id===id);
      let record=existing;
      if(!existing || existing.summaryOnly===true){
        const response=await fetch(`/api/proposals/${encodeURIComponent(id)}`,{cache:"no-store",signal:AbortSignal.any([lifetime.current!.signal,AbortSignal.timeout(15000)])});
        if(!response.ok)throw Object.assign(new Error("The original Proposal request could not be read. Retry before confirming its repository."),{status:response.status});
        record=await response.json() as ProposalLiveRecord;
        assertProposalOosProjection(record.projection);assertProposalOosHistory(record.history);
        if(record.summaryOnly!==false || record.projection.proposal_id!==id || record.history.proposal_id!==id || record.history.record_version!==record.projection.record_version)throw Error("The original Proposal source did not match this request.");
      }
      if(valid()&&record){
        const selected=record;
        setDetails(rows=>({...rows,[id]:selected}));
        setSnapshot(snapshot=>snapshot?{...snapshot,records:snapshot.records.map(row=>row.projection.proposal_id===id?selected:row)}:snapshot);
        setInspection({id,state:"current",version:selected.projection.record_version,error:null});
      }
    }catch(error){if(valid()){
      if([401,403].includes(Number((error as {status?:number}).status))){setDetails({});setSnapshot(null);}
      setInspection({id,state:"unavailable",error:error instanceof Error?error.message:"Original Proposal source unavailable."});
    }}
  },[]);
  const refresh=useCallback(async(afterMutation=false):Promise<ProposalLiveSnapshot>=>{
    if(flight.current){if(!afterMutation)return flight.current;await flight.current;}
    const ticket=generation.current,current=()=>alive.current&&ticket===generation.current;
    setReading(true);
    const operation=(async()=>{
      try {
        const next=await readProposalCollection(fetch,{signal:lifetime.current?.signal,onProgress:value=>{if(current())setSnapshot(value);}});
        if(current())setSnapshot(next);return next;
      } catch {
        const next:ProposalLiveSnapshot={mode:"live",status:"offline",records:[],observedAt:new Date().toISOString(),error:"Proposal requests could not be confirmed. Refresh to retry."};
        if(current()){setDetails({});setInspection(null);setSnapshot(next);}return next;
      } finally {if(current())setReading(false);}
    })();
    flight.current=operation;
    try{return await operation;}finally{if(flight.current===operation)flight.current=null;}
  },[]);
  useEffect(()=>{
    alive.current=true;generation.current++;lifetime.current=new AbortController();void refresh();
    const timer=setInterval(()=>{if(document.visibilityState==="visible")void refresh();},15_000);
    return()=>{alive.current=false;generation.current++;inspectionSequence.current++;flight.current=null;lifetime.current?.abort();clearInterval(timer);};
  },[refresh]);
  const snapshot=useMemo(()=>{
    if(!source || source.mode!=="live" || source.status!=="current")return source;
    const selected=inspection?.state==="current"?details[inspection.id]:undefined;
    const extra=selected&&!source.records.some(row=>row.projection.proposal_id===selected.projection.proposal_id)?[{...selected,selectedOnly:true}]:[];
    const records=[...source.records.map(row=>{
      const original=details[row.projection.proposal_id];
      return original&&original.projection.record_version===row.projection.record_version?{...original,deliveryLink:row.deliveryLink}:row;
    }),...extra];
    return {...source,records,...(extra.length?{coverage:{...(source.coverage??{loaded:source.records.length,total:source.records.length,next_cursor:null}),complete:false,detail:"The selected original was read separately. Refresh the collection to confirm its complete coverage."}}:{})};
  },[source,details,inspection]);
  return {snapshot,reading,refresh,inspect,inspection};
}
