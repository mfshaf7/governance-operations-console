"use client";
import { useWorkspaceViewState } from "../../console-integration/registers/workspace-view-state.ts";
import {readRegisterOffsetWindow} from '../../console-integration/registers/read-register-offset-window.ts';
import {useRegisterPageSize} from '../../console-integration/registers/use-register-page-size.ts';
import { useCallback, useEffect, useRef, useState } from "react";
import type { DevIntegrationProfileFilters } from "../read-model/dev-integration-profile-selectors.ts";
import type { DevIntegrationProfileRequest } from "../model/dev-integration-profile-request.ts";
import { assertOwnerProfileProjection, assertProfileRequestRecord, type OwnerProfileProjection, type ProfileRequestRecord } from "./dev-integration-profile-contract.ts";

async function json(path: string, init: RequestInit = {}) {
  const response = await fetch(path, { cache: "no-store", ...init });
  const body = await response.json();
  if (!response.ok) throw Object.assign(new Error(typeof body.error === "string" ? body.error : "The profile workflow could not be read."), {status:response.status, code:body.code});
  return body;
}
const defaults: DevIntegrationProfileFilters = { query: "", ownerRepo: "all", laneClass: "all", lifecycle: "all" };
export function useDevIntegrationProfiles(enabled: boolean) {
  const {pageSize}=useRegisterPageSize("Dev Integration profiles");
  const {pageSize:historyPageSize}=useRegisterPageSize("Integration request history");
  const [projection, setProjection] = useState<OwnerProfileProjection | null>(null);
  const [current, setCurrent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useWorkspaceViewState('dev-integration:filters', defaults);
  const [requests, setRequests] = useState<ProfileRequestRecord[]>([]);
  const [requestPage, setRequestPage] = useState<{next_offset:number|null;total:number}>({next_offset:null,total:0});
  const [historyCurrent, setHistoryCurrent] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const historyReads = useRef(0), historyTailOffset = useRef(0);
  const generation = useRef(0), mounted = useRef(true);
  const pending = useRef<{ id: string; key: string; body: unknown } | null>(null);
  const upsert = useCallback((record: ProfileRequestRecord) => {
    setRequests(rows => [record, ...rows.filter(row => row.request_id !== record.request_id)]);
    if (pending.current?.id === record.request_id && ["recorded", "failed"].includes(record.state)) pending.current = null;
  }, []);
  const loadHistory = useCallback(async (offset = 0, background = false) => {
    if (!background) { historyReads.current++; setHistoryLoading(true); }
    try {
      const window=await readRegisterOffsetWindow<ProfileRequestRecord,{offset:number;limit:number;total:number;next_offset:number|null}>({offset,pageSize:historyPageSize,readPage:async nativeOffset=>{
        const body=await json(`/api/dev-integration/requests?offset=${nativeOffset}&limit=25`);
        if(body.schema_version!==1||!Array.isArray(body.requests)||body.requests.length>25||!body.page||body.page.offset!==nativeOffset||!Number.isSafeInteger(body.page.total))throw Error("Invalid request history.");
        return {rows:body.requests.map(assertProfileRequestRecord),total:body.page.total,nextOffset:body.page.next_offset,version:"profile-requests",metadata:body.page};
      }});
      const rows=window.rows,body={page:window.page};
      if (!mounted.current) return false;
      setRequests(previous => offset ? [...previous, ...rows.filter((row:ProfileRequestRecord) => !previous.some(old => old.request_id === row.request_id))] : [...rows, ...previous.filter(old => !rows.some((row:ProfileRequestRecord) => row.request_id === old.request_id))]);
      setRequestPage(previous=>offset===0 && historyTailOffset.current>0 ? {...body.page,next_offset:previous.next_offset} : body.page);
      historyTailOffset.current=Math.max(historyTailOffset.current,offset);setHistoryCurrent(true);return true;
    } catch { if (mounted.current) setHistoryCurrent(false);return false; }
    finally { if (!background) historyReads.current--; if (mounted.current && historyReads.current === 0) setHistoryLoading(false); }
  }, [historyPageSize]);
  useEffect(()=>{historyTailOffset.current=0;},[historyPageSize]);
  const filterKey = JSON.stringify([filters,pageSize]);
  const [position,setPosition]=useState({key:filterKey,offset:0});
  if(position.key!==filterKey)setPosition({key:filterKey,offset:0});
  const offset=position.key===filterKey?position.offset:0;
  const scopeKey=`${filterKey}:${offset}`;
  const [projectionScope,setProjectionScope]=useState<string|null>(null),[settledScope,setSettledScope]=useState<string|null>(null);
  const epoch=useRef<{key:string;version:string}|null>(null);
  const sourceRequest=useRef<{key:string;controller:AbortController}|null>(null);
  const load = useCallback(async (background=false) => {
    if(!enabled)return;
    const readKey=`${filterKey}:${offset}`;
    if(sourceRequest.current?.key===readKey&&!sourceRequest.current.controller.signal.aborted)return;
    sourceRequest.current?.controller.abort();const controller=new AbortController();sourceRequest.current={key:readKey,controller};
    const expected = ++generation.current;
    setLoading(!background); if(!background)setCurrent(false);
    try {
      const window=await readRegisterOffsetWindow({offset,pageSize,signal:controller.signal,readPage:async nativeOffset=>{
    const query = new URLSearchParams({ limit: "25", offset: String(nativeOffset) });
    if (filters.query) query.set("q", filters.query);
    if (filters.ownerRepo !== "all") query.set("owner", filters.ownerRepo);
    if (filters.lifecycle !== "all") query.set("lifecycle", filters.lifecycle);
    if (filters.laneClass !== "all") query.set("lane", filters.laneClass);
      const body = await json(`/api/dev-integration/profiles?${query}`,{signal:controller.signal});
      if (body.mode !== "live") throw new Error("Live profile integration is unavailable.");
      const native = assertOwnerProfileProjection(body.projection);
      if(native.page.offset!==nativeOffset)throw new Error("The profile source returned a different page. Refresh to retry.");
        return {rows:native.profiles,total:native.page.total,nextOffset:native.page.next_offset,version:JSON.stringify([native.source_version,native.owner_versions]),metadata:native};
      }});
      const result={...window.metadata,profiles:window.rows,page:window.page};
      if (!mounted.current || generation.current !== expected) return;
      const version=JSON.stringify([result.source_version,result.owner_versions,result.page.total]);
      if(offset>0&&(epoch.current?.key!==filterKey||epoch.current.version!==version))throw new Error("The profile register changed. Refresh the first page.");
      if(offset===0)epoch.current={key:filterKey,version};
      setProjectionScope(readKey);setSettledScope(readKey);setProjection(result);
      setCurrent(true); setError(null);
    } catch (error) { if (mounted.current && generation.current === expected) { setSettledScope(readKey);setCurrent(false); setError(error instanceof Error ? error.message : "Profile source unavailable."); } }
    finally { if (mounted.current && generation.current === expected) {setLoading(false);if(sourceRequest.current?.controller===controller)sourceRequest.current=null;} }
  }, [enabled,filters, filterKey, offset]);
  const loadRef = useRef(load); loadRef.current = load;
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; generation.current++;sourceRequest.current?.controller.abort();sourceRequest.current=null; };
  }, []);
  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(() => { void loadRef.current(true); void loadHistory(); }, 250);
    return () => clearTimeout(timer);
  }, [enabled, filters, filterKey, offset, loadHistory]);
  useEffect(() => {
    if (!enabled) return;
    const refresh = () => { if (document.visibilityState === "visible") { void loadRef.current(true); void loadHistory(0, true); } };
    const timer = window.setInterval(refresh, 30000);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [enabled, loadHistory]);
  const read = useCallback(async (id: string) => {
    const result = assertProfileRequestRecord(await json(`/api/dev-integration/requests/${encodeURIComponent(id)}`));
    if (result.request_id !== id) throw new Error("The owner returned a different original request.");
    upsert(result); return result;
  }, [upsert]);
  async function submit(request: DevIntegrationProfileRequest, reviewedSourceVersion: string) {
    if (!projection || !current || projectionScope!==scopeKey) throw new Error("Refresh current profile source before submitting.");
    if (reviewedSourceVersion !== projection.source_version) throw new Error("The reviewed registry source changed. Review the current request again.");
    const {requestedAt:_time, requestedBy:_actor, ...intent} = request;
    const key = JSON.stringify({ source: projection.source_version, request: intent });
    if (pending.current && pending.current.key !== key) throw new Error(`Resolve original request ${pending.current.id} before changing the intent.`);
    const retryingUnconfirmed = Boolean(pending.current);
    if (!pending.current) {
      const id = `devint-request:${crypto.randomUUID()}`;
      pending.current = { id, key, body: { requestId: id, reviewedSourceVersion: projection.source_version, request: intent, approved: true } };
    }
    try {
      const result = assertProfileRequestRecord(await json("/api/dev-integration/requests", { method: "POST",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(pending.current.body) }));
      if (result.request_id !== pending.current.id) throw new Error("The owner returned a different request.");
      upsert(result); void loadHistory(); return result;
    } catch(error) {
      const status = (error as {status?:number}).status;
      const code = (error as {code?:string}).code;
      // The native owner checks existing identity under its lock before source
      // admission. These exact refusals prove this intent has no recorded request.
      const refusedBeforeRecording = status === 409 && ["dev_integration_source_stale","dev_integration_choice_unavailable","dev_integration_profile_exists","dev_integration_related_profile_unavailable"].includes(code ?? "");
      if (refusedBeforeRecording || (!retryingUnconfirmed && status && [400,401,403,409,422].includes(status))) pending.current = null;
      throw error;
    }
  }
  return { projection:projectionScope===scopeKey?projection:null, current:projectionScope===scopeKey&&current, error:settledScope===scopeKey?error:null, loading:enabled&&(loading||settledScope!==scopeKey), filters, setFilters, requests, historyCurrent, historyLoading, requestPage,
    pageSize,offset, first:()=>{if(offset)setPosition({key:filterKey,offset:0});else void load();},next:()=>{if(projectionScope===scopeKey&&current&&projection?.page.next_offset!=null)setPosition({key:filterKey,offset:projection.page.next_offset});},
    previous:()=>setPosition({key:filterKey,offset:Math.max(0,offset-pageSize)}),
    load, loadHistory, read, submit, pendingId: () => pending.current?.id ?? null };
}
export type DevIntegrationProfilesRuntime = ReturnType<typeof useDevIntegrationProfiles>;
