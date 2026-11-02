"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { assertPlatformOperationCatalog, assertPlatformOperationList, assertPlatformOperationRecord, assertPlatformHistoryPage } from "./platform-operation-contract.ts";
import type { PlatformOperationRecord, PlatformOperationsLiveSnapshot } from "./platform-operation-types.ts";

const initialSnapshot: PlatformOperationsLiveSnapshot = { catalog: null, error: null, mode: "unavailable", observedAt: new Date(0).toISOString(), operations: [], status: "loading" };
const refreshIntervalMs = 15_000;
const reconcileIntervalMs = 2_000;
const reconcileAttempts = 10;
const terminalStates = new Set(["blocked", "cancelled", "failed", "succeeded"]);

export function usePlatformOperationsRuntime(workspace?:"dev-integration"|"governed-releases") {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const scope=useRef(workspace);scope.current=workspace;
  const pendingRequestIds = useRef(new Map<string, string>());
  const mounted = useRef(true);
  const reconciling = useRef(new Set<string>());
  const load = useCallback(async () => {
    try {
      const body = record(await jsonRequest(`/api/environment-operations${workspace ? `?workspace=${workspace}` : ""}`, { cache: "no-store" }));
      if(scope.current!==workspace)return initialSnapshot;
      if (body.mode === "disconnected-preview") {
        const next = { ...initialSnapshot, mode: "disconnected-preview" as const, observedAt: text(body.observedAt), status: "current" as const };
        setSnapshot(next);
        return next;
      }
      const operations = assertPlatformOperationList({ workflow_id: "platform-operation-list", operations: body.operations });
      if (body.status === "partial") {
        const sourceError = record(body.error);
        const catalog = body.catalog === null ? null : assertPlatformOperationCatalog(body.catalog);
        const next: PlatformOperationsLiveSnapshot = {
          catalog,
          error: { code: typeof sourceError.code === "string" ? sourceError.code : "platform_operation_projection_partial", message: typeof sourceError.message === "string" ? sourceError.message : "Part of the Platform operation projection is unavailable." },
          mode: "live",
          observedAt: text(body.observedAt),
          operations,
          status: "degraded",
        };
        setSnapshot((current) => ({
          ...next,
          catalog: catalog ?? current.catalog,
          operations: catalog ? current.operations : operations,
        }));
        return next;
      }
      const next: PlatformOperationsLiveSnapshot = {
        catalog: assertPlatformOperationCatalog(body.catalog),
        error: null,
        mode: "live",
        observedAt: text(body.observedAt),
        operations,
        historyPage: assertPlatformHistoryPage(body.historyPage,workspace),
        status: "current",
      };
      setSnapshot(current=>({...next,operations:workspace ? [...operations,...current.operations.filter(old=>!operations.some(item=>item.operation_id===old.operation_id))] : operations,historyPage:workspace&&current.historyPage&&current.operations.length>operations.length ? {...next.historyPage!,next_cursor:current.historyPage.next_cursor} : next.historyPage}));
      return next;
    } catch (caught) {
      if(scope.current!==workspace)return initialSnapshot;
      const error = normalizeError(caught);
      const next: PlatformOperationsLiveSnapshot = { ...initialSnapshot, error, mode: "unavailable", observedAt: new Date().toISOString(), status: "offline" };
      setSnapshot((current) => ({ ...current, error, mode: "unavailable", observedAt: next.observedAt, status: "offline" }));
      return next;
    }
  }, [workspace]);

  useEffect(() => {
    mounted.current = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let active = true;
    const tick = async () => {
      if (!document.hidden) await load();
      if (active) timer = setTimeout(tick, refreshIntervalMs);
    };
    const visible = () => { if (!document.hidden) void load(); };
    void tick();
    document.addEventListener("visibilitychange", visible);
    return () => {
      active = false;
      mounted.current = false;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [load]);

  const reconcile = useCallback(async (initial: PlatformOperationRecord) => {
    if (terminalStates.has(initial.state) || reconciling.current.has(initial.operation_id)) return;
    reconciling.current.add(initial.operation_id);
    try {
      for (let attempt = 0; attempt < reconcileAttempts && mounted.current; attempt += 1) {
        await delay(reconcileIntervalMs);
        if (!mounted.current) return;
        try {
          const operation = assertPlatformOperationRecord(await jsonRequest(`/api/environment-operations/${encodeURIComponent(initial.operation_id)}`));
          upsert(setSnapshot, operation);
          if (terminalStates.has(operation.state)) return;
        } catch {
          return;
        }
      }
    } finally {
      reconciling.current.delete(initial.operation_id);
    }
  }, []);

  const submit = useCallback(async (subjectRef: string, capabilityId: string, input: Record<string, unknown> = {}, reviewedSourceVersion?: string, explicitRequestId?: string) => {
    const requestKey = `submit:${subjectRef}:${capabilityId}:${reviewedSourceVersion ?? ""}:${stableJson(input)}`;
    const requestId = explicitRequestId ?? retainedRequestId(pendingRequestIds.current, requestKey);
    const operation = assertPlatformOperationRecord(await jsonRequest("/api/environment-operations", {
      body: JSON.stringify({ capabilityId, input, requestId, subjectRef, ...(reviewedSourceVersion ? { reviewedSourceVersion } : {}) }),
      headers: { "Content-Type": "application/json" }, method: "POST",
    }));
    pendingRequestIds.current.delete(requestKey);
    upsert(setSnapshot, operation);
    void reconcile(operation);
    return operation;
  }, [reconcile]);

  const control = useCallback(async (operationId: string, action: "cancel" | "retry", reason: string) => {
    const requestKey = `control:${operationId}:${action}:${reason}`;
    const requestId = retainedRequestId(pendingRequestIds.current, requestKey);
    const operation = assertPlatformOperationRecord(await jsonRequest(`/api/environment-operations/${encodeURIComponent(operationId)}/controls`, {
      body: JSON.stringify({ action, reason, requestId }),
      headers: { "Content-Type": "application/json" }, method: "POST",
    }));
    pendingRequestIds.current.delete(requestKey);
    upsert(setSnapshot, operation);
    void reconcile(operation);
    return operation;
  }, [reconcile]);

  const read = useCallback(async (operationId: string) => {
    const operation = assertPlatformOperationRecord(await jsonRequest(`/api/environment-operations/${encodeURIComponent(operationId)}`, {cache: "no-store", method: "GET"}));
    if (operation.operation_id !== operationId) throw new Error("The owner returned a different operation.");
    upsert(setSnapshot, operation);
    return operation;
  }, []);
  async function loadMore(){
    if(!workspace||!snapshot.historyPage?.next_cursor)return;
    const body=record(await jsonRequest(`/api/environment-operations?${new URLSearchParams({workspace,cursor:snapshot.historyPage.next_cursor})}`));
    if(body.status!=="current")throw new Error("Older history could not be read. Existing records are retained.");
    const operations=assertPlatformOperationList({workflow_id:"platform-operation-list",operations:body.operations});
    setSnapshot(current=>({...current,operations:[...current.operations,...operations.filter(item=>!current.operations.some(old=>old.operation_id===item.operation_id))],historyPage:assertPlatformHistoryPage(body.historyPage,workspace)}));
  }
  return { control, load, loadMore, read, snapshot, submit };
}

function upsert(setSnapshot: React.Dispatch<React.SetStateAction<PlatformOperationsLiveSnapshot>>, operation: PlatformOperationRecord) {
  setSnapshot((current) => ({ ...current, operations: [operation, ...current.operations.filter((candidate) => candidate.operation_id !== operation.operation_id)] }));
}
async function jsonRequest(url: string, init: RequestInit = {}) {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const source = record(body);
    throw Object.assign(new Error(typeof source.error === "string" ? source.error : "Platform operation request failed."), { status: response.status, code: typeof source.code === "string" ? source.code : null });
  }
  return body;
}
function record(value: unknown): Record<string, unknown> { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Platform operation response is malformed."); return value as Record<string, unknown>; }
function text(value: unknown) { if (typeof value !== "string" || Number.isNaN(Date.parse(value))) throw new Error("Platform operation observation time is malformed."); return value; }
function normalizeError(value: unknown) { return { code: "platform_operation_unavailable", message: value instanceof Error ? value.message : "Platform operations are unavailable." }; }
function retainedRequestId(requests: Map<string, string>, key: string) { const existing = requests.get(key); if (existing) return existing; const created = crypto.randomUUID(); requests.set(key, created); return created; }
function stableJson(value: unknown): string { if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`; if (value && typeof value === "object") return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`).join(",")}}`; return JSON.stringify(value); }
function delay(milliseconds: number) { return new Promise((resolve) => setTimeout(resolve, milliseconds)); }
