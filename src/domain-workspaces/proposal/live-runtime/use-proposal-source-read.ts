"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { assertProposalLiveSnapshot, assertProposalOosHistory, assertProposalOosProjection, isProposalLiveApiError } from "./proposal-live-contract.ts";
import type { ProposalLiveRecord, ProposalLiveSnapshot, ProposalRegisterSelection } from "./proposal-live-types.ts";

const proposalPollIntervalMs = 15_000;

function message(value: unknown) { return isProposalLiveApiError(value) ? value.error : value instanceof Error ? value.message : "Proposal source is unavailable."; }
function eventIdentity(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(eventIdentity).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>`${JSON.stringify(key)}:${eventIdentity(item)}`).join(",")}}`;
  return JSON.stringify(value) ?? "undefined";
}
function denied(error: unknown) { return [401,403].includes(Number((error as {status?:number})?.status)); }
function mergeHistory(previous: ProposalLiveRecord, next: ProposalLiveRecord) {
  if (previous.projection.record_version !== next.projection.record_version) return next;
  const events = new Map(previous.history.events.map(event => [event.event_id, event]));
  if (next.history.events.every(event => eventIdentity(events.get(event.event_id)) === eventIdentity(event))) return {...next, history:previous.history};
  return next;
}
export function useProposalSourceRead(selection: ProposalRegisterSelection, selectedId: string, pinnedId: string | null) {
  const [snapshot, setSnapshot] = useState<ProposalLiveSnapshot | null>(null);
  const [details, setDetails] = useState<ProposalLiveRecord | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const pageBusyRef = useRef(false), historyBusyRef = useRef(false);
  const cursorRef = useRef<string | null>(null);
  const [previousCursors, setPreviousCursors] = useState<(string|null)[]>([]);
  const [pagePending, setPagePending] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [historyPending, setHistoryPending] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const key = JSON.stringify(selection), keyRef = useRef(key), selectionRef = useRef(selection), sequence = useRef(0), detailSequence = useRef(0);
  const snapshotRef = useRef(snapshot), detailsRef = useRef(details), mounted = useRef(true);
  const reading = useRef<{key:string;promise:Promise<ProposalLiveSnapshot>} | null>(null);
  keyRef.current = key; selectionRef.current = selection; snapshotRef.current = snapshot; detailsRef.current = details;

  const readPage = useCallback(async (cursor: string | null = null) => {
    const q = selectionRef.current, params = new URLSearchParams();
    if (q.query) params.set("query", q.query);
    if (q.status !== "all") params.set("status", q.status);
    if (q.ingress !== "all") params.set("ingress", q.ingress);
    if (cursor) params.set("cursor", cursor);
    const response = await fetch(`/api/proposals${params.size ? `?${params}` : ""}`, {cache:"no-store"});
    const body:unknown = await response.json().catch(()=>null);
    if (!response.ok) throw Object.assign(new Error(message(body)),{status:response.status});
    const next = assertProposalLiveSnapshot(body);
    if (next.page && (next.page.selector.query !== q.query.trim().toLowerCase() || next.page.selector.status !== q.status || next.page.selector.ingress !== q.ingress)) throw new Error("Proposal search response belongs to another selection.");
    return next;
  }, []);

  const refresh = useCallback(async (afterMutation = false): Promise<ProposalLiveSnapshot> => {
    const boundKey = keyRef.current;
    if(pageBusyRef.current && snapshotRef.current)return snapshotRef.current;
    if (reading.current?.key === boundKey) {
      if (!afterMutation) return reading.current.promise;
      await reading.current.promise;
    }
    const token = ++sequence.current;
    const operation = (async () => {
      try {
        if(afterMutation){cursorRef.current=null;setPreviousCursors([]);}
        const next = await readPage(cursorRef.current);
        if (mounted.current && token === sequence.current && boundKey === keyRef.current) { setSnapshot(next); setPageError(null); }
        return next;
      } catch(error) {
        const offline:ProposalLiveSnapshot = {mode:"live",status:"offline",observedAt:new Date().toISOString(),records:[],error:message(error)};
        if (mounted.current && token === sequence.current && boundKey === keyRef.current) {
          if([401,403].includes(Number((error as {status?:number}).status))){setDetails(null);detailSequence.current++;}
          setSnapshot(previous => ![401,403].includes(Number((error as {status?:number}).status)) && previous?.mode === "live" ? {...offline,
          observedAt:previous.observedAt,records:previous.records.map(row=>({...row,projection:{...row.projection,projection_state:"stale"}}))} : offline);
        }
        return offline;
      }
    })();
    reading.current = {key:boundKey,promise:operation};
    try { return await operation; } finally { if (reading.current?.promise === operation) reading.current = null; }
  }, [readPage]);

  useEffect(() => {
    mounted.current = true; cursorRef.current=null;setPreviousCursors([]);setSnapshot(null); setDetails(null); setDetailError(null); setPageError(null);
    const debounce = window.setTimeout(()=>void refresh(), selection.query ? 350 : 0);
    const timer = window.setInterval(()=>{if(document.visibilityState === "visible")void refresh();},proposalPollIntervalMs);
    return ()=>{window.clearTimeout(debounce);window.clearInterval(timer);sequence.current++;detailSequence.current++;};
  }, [key,refresh]);
  useEffect(()=>()=>{mounted.current=false;},[]);

  const selected = snapshot?.records.find(row=>row.projection.proposal_id === selectedId) ?? snapshot?.records[0];
  const currentId = pinnedId ?? (/^idea-[1-9][0-9]*$/.test(selectedId) ? selectedId : selected?.projection.proposal_id) ?? null, currentVersion = selected?.projection.record_version;
  const refreshSelected = useCallback(async () => {
    const id = pinnedId ?? (/^idea-[1-9][0-9]*$/.test(selectedId) ? selectedId : snapshotRef.current?.records[0]?.projection.proposal_id);
    const row = snapshotRef.current?.records.find(item=>item.projection.proposal_id === id) ?? (detailsRef.current?.projection.proposal_id===id ? detailsRef.current : null);
    if (!id || (row && row.summaryOnly !== true && !snapshotRef.current?.page) || snapshotRef.current?.mode !== "live" || snapshotRef.current.status !== "current") return;
    const token = ++detailSequence.current, boundKey = keyRef.current;
    setDetailLoading(true);setDetailError(null);
    try {
      const response = await fetch(`/api/proposals/${encodeURIComponent(id)}`,{cache:"no-store"});
      const body:unknown = await response.json().catch(()=>null);
      if (!response.ok) throw Object.assign(new Error(message(body)),{status:response.status});
      const next = body as ProposalLiveRecord;
      assertProposalOosProjection(next.projection);assertProposalOosHistory(next.history);
      if (next.projection.proposal_id !== id || next.history.proposal_id !== id || next.history.record_version !== next.projection.record_version || next.summaryOnly !== false) throw new Error("Proposal details could not be matched to the selected record.");
      if (mounted.current && token === detailSequence.current && boundKey === keyRef.current) {
        setSnapshot(current=>current ? {...current,records:current.records.map(item=>item.projection.proposal_id===id && item.projection.record_version!==next.projection.record_version ? {...item,projection:next.projection} : item)} : current);
        setDetails(previous=> previous?.projection.proposal_id === id ? mergeHistory(previous,{...next,createdAt:next.creationKnown ? next.createdAt : (row?.createdAt ?? next.createdAt),creationKnown:Boolean(next.creationKnown || row?.creationKnown===true),deliveryLink:row?.deliveryLink}) : {...next,createdAt:next.creationKnown ? next.createdAt : (row?.createdAt ?? next.createdAt),creationKnown:Boolean(next.creationKnown || row?.creationKnown===true),deliveryLink:row?.deliveryLink});setHistoryError(null);
      }
    } catch(error) { if (mounted.current && token === detailSequence.current) {setDetailError(message(error));if([401,403].includes(Number((error as {status?:number}).status))){setDetails(null);setSnapshot({mode:"live",status:"offline",records:[],observedAt:new Date().toISOString(),error:message(error)});}} }
    finally {if(mounted.current && token === detailSequence.current)setDetailLoading(false);}
  }, [selectedId,pinnedId]);
  useEffect(()=>{void refreshSelected();},[currentId,currentVersion,snapshot?.observedAt,refreshSelected]);

  const clearDeniedSource = useCallback((error: unknown) => {
    if (!denied(error)) return;
    detailSequence.current++; setDetails(null); setDetailLoading(false);
    setSnapshot({mode:"live",status:"offline",records:[],observedAt:new Date().toISOString(),error:message(error)});
  }, []);

  const loadMore = useCallback(async () => {
    const cursor = snapshotRef.current?.page?.next_cursor, boundKey = keyRef.current;
    if (!cursor || pageBusyRef.current) return;
    pageBusyRef.current=true;const token=++sequence.current;
    setPagePending(true);setPageError(null);
    try {
      const next = await readPage(cursor);
      if (mounted.current && boundKey === keyRef.current && token===sequence.current) {
        const previousCursor=cursorRef.current;
        setPreviousCursors(previous=>[...previous,previousCursor]);cursorRef.current=cursor;setSnapshot(next);
      }
    } catch(error) {if(mounted.current && boundKey===keyRef.current && token===sequence.current){clearDeniedSource(error);setPageError(message(error));}}
    finally {pageBusyRef.current=false;if(mounted.current)setPagePending(false);}
  }, [readPage,clearDeniedSource]);

  const previousPage = useCallback(async()=>{
    if(!previousCursors.length || pageBusyRef.current)return;
    pageBusyRef.current=true;const token=++sequence.current;
    const target=previousCursors.at(-1) ?? null,boundKey=keyRef.current;
    setPagePending(true);setPageError(null);
    try{const next=await readPage(target);if(mounted.current && boundKey===keyRef.current && token===sequence.current){cursorRef.current=target;setPreviousCursors(values=>values.slice(0,-1));setSnapshot(next);}}
    catch(error){if(mounted.current && boundKey===keyRef.current && token===sequence.current){clearDeniedSource(error);setPageError(message(error));}}finally{pageBusyRef.current=false;if(mounted.current)setPagePending(false);}
  },[previousCursors,readPage,clearDeniedSource]);

  const loadHistory = useCallback(async () => {
    const previous = detailsRef.current, cursor = previous?.history.next_cursor;
    if (!previous || !cursor || historyBusyRef.current) return;
    historyBusyRef.current=true;
    const id = previous.projection.proposal_id, version=previous.projection.record_version;
    setHistoryPending(true);setHistoryError(null);
    try {
      const response=await fetch(`/api/proposals/${id}/history?cursor=${encodeURIComponent(cursor)}`,{cache:"no-store"});
      const value:unknown=await response.json().catch(()=>null);
      if(!response.ok)throw Object.assign(new Error(message(value)),{status:response.status});
      const next=assertProposalOosHistory(value);
      if(next.proposal_id!==id || next.record_version!==version)throw new Error("This proposal changed. Refresh its details before loading more history.");
      const latest=detailsRef.current;
      if(!latest || latest.projection.proposal_id!==id || latest.projection.record_version!==version)return;
      const seen=new Map(latest.history.events.map(event=>[event.event_id,event]));
      for(const event of next.events){if(seen.has(event.event_id) && eventIdentity(seen.get(event.event_id))!==eventIdentity(event))throw new Error("An original event changed; history was not combined.");seen.set(event.event_id,event);}
      const merged={...latest,history:{...next,events:[...seen.values()].sort((a,b)=>a.occurred_at.localeCompare(b.occurred_at)||a.event_id.localeCompare(b.event_id))}};
      setDetails(current=>current===latest?merged:current);
    }catch(error){if(mounted.current && detailsRef.current?.projection.proposal_id===id){clearDeniedSource(error);setHistoryError(message(error));}}finally{historyBusyRef.current=false;if(mounted.current)setHistoryPending(false);}
  }, [clearDeniedSource]);

  const effectiveSnapshot = useMemo(()=>{
    if(!snapshot || !details)return snapshot;
    if(snapshot.status!=="current")return currentId===details.projection.proposal_id && snapshot.records.length>0 ? {...snapshot,records:[...snapshot.records.filter(row=>row.projection.proposal_id!==currentId),{...details,selectedOnly:true,projection:{...details.projection,projection_state:"stale" as const}}]} : snapshot;
    const row=snapshot.records.find(item=>item.projection.proposal_id===details.projection.proposal_id);
    if(row && row.projection.record_version===details.projection.record_version)return {...snapshot,records:snapshot.records.map(item=>item===row?{...details,createdAt:details.createdAt,deliveryLink:row.deliveryLink}:item)};
    if(!row && currentId===details.projection.proposal_id)return {...snapshot,records:[...snapshot.records,{...details,selectedOnly:true}]};
    return snapshot;
  },[snapshot,details,currentId]);
  return {snapshot:effectiveSnapshot,refresh,refreshSelected,detailLoading,detailError,loadMore,previousPage,hasPrevious:previousCursors.length>0,pagePending,pageError,loadHistory,historyPending,historyError};
}
