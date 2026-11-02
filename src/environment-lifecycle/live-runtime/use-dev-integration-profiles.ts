"use client";
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
  const [projection, setProjection] = useState<OwnerProfileProjection | null>(null);
  const [current, setCurrent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState(defaults);
  const [requests, setRequests] = useState<ProfileRequestRecord[]>([]);
  const [requestPage, setRequestPage] = useState<{next_offset:number|null;total:number}>({next_offset:null,total:0});
  const [historyCurrent, setHistoryCurrent] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const historyReads = useRef(0);
  const generation = useRef(0), mounted = useRef(true);
  const sourceFilterKey = useRef<string | null>(null);
  const pending = useRef<{ id: string; key: string; body: unknown } | null>(null);
  const upsert = useCallback((record: ProfileRequestRecord) => {
    setRequests(rows => [record, ...rows.filter(row => row.request_id !== record.request_id)]);
    if (pending.current?.id === record.request_id && ["recorded", "failed"].includes(record.state)) pending.current = null;
  }, []);
  const loadHistory = useCallback(async (offset = 0) => {
    historyReads.current++; setHistoryLoading(true);
    try {
      const body = await json(`/api/dev-integration/requests?offset=${offset}&limit=20`);
      if (body.schema_version !== 1 || !Array.isArray(body.requests) || body.requests.length > 25 || !body.page) throw new Error("Invalid request history.");
      const rows = body.requests.map(assertProfileRequestRecord);
      if (!mounted.current) return;
      setRequests(previous => offset ? [...previous, ...rows.filter((row:ProfileRequestRecord) => !previous.some(old => old.request_id === row.request_id))] : [...rows, ...previous.filter(old => !rows.some((row:ProfileRequestRecord) => row.request_id === old.request_id))]);
      setRequestPage(body.page); setHistoryCurrent(true);
    } catch { if (mounted.current) setHistoryCurrent(false); }
    finally { historyReads.current--; if (mounted.current && historyReads.current === 0) setHistoryLoading(false); }
  }, []);
  const load = useCallback(async (append = false) => {
    const expected = ++generation.current;
    setLoading(true);
    const filterKey = JSON.stringify(filters);
    const query = new URLSearchParams({ limit: "20", offset: String(append ? projection?.page.next_offset ?? 0 : 0) });
    if (filters.query) query.set("q", filters.query);
    if (filters.ownerRepo !== "all") query.set("owner", filters.ownerRepo);
    if (filters.lifecycle !== "all") query.set("lifecycle", filters.lifecycle);
    if (filters.laneClass !== "all") query.set("lane", filters.laneClass);
    try {
      const body = await json(`/api/dev-integration/profiles?${query}`);
      if (body.mode !== "live") throw new Error("Live profile integration is unavailable.");
      const result = assertOwnerProfileProjection(body.projection);
      if (!mounted.current || generation.current !== expected) return;
      const sameFilter = sourceFilterKey.current === filterKey;
      sourceFilterKey.current = filterKey;
      setProjection(previous => sameFilter && previous?.source_version === result.source_version ? { ...result,
        profiles: append ? [...previous.profiles, ...result.profiles.filter(row => !previous.profiles.some(old => old.profile_id === row.profile_id))]
          : [...result.profiles, ...previous.profiles.filter(old => !result.profiles.some(row => row.profile_id === old.profile_id))],
        page: !append && previous.profiles.length > result.profiles.length ? {...result.page,next_offset:previous.page.next_offset} : result.page } : result);
      setCurrent(true); setError(null);
    } catch (error) { if (mounted.current && generation.current === expected) { setCurrent(false); setError(error instanceof Error ? error.message : "Profile source unavailable."); } }
    finally { if (mounted.current && generation.current === expected) setLoading(false); }
  }, [filters, projection?.page.next_offset]);
  const loadRef = useRef(load); loadRef.current = load;
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; generation.current++; };
  }, []);
  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(() => { void loadRef.current(); void loadHistory(); }, 250);
    return () => clearTimeout(timer);
  }, [enabled, filters, loadHistory]);
  useEffect(() => {
    if (!enabled) return;
    const refresh = () => { if (document.visibilityState === "visible") { void loadRef.current(); void loadHistory(); } };
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
    if (!projection || !current) throw new Error("Refresh current profile source before submitting.");
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
  return { projection, current, error, loading, filters, setFilters, requests, historyCurrent, historyLoading, requestPage,
    load, loadHistory, read, submit, pendingId: () => pending.current?.id ?? null };
}
export type DevIntegrationProfilesRuntime = ReturnType<typeof useDevIntegrationProfiles>;
