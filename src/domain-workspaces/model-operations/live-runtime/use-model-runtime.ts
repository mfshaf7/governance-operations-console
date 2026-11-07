"use client";
import {readRegisterWindow} from '../../../console-integration/registers/read-register-window.ts';
import {useRegisterPageSize} from '../../../console-integration/registers/use-register-page-size.ts';
import { useCallback, useEffect, useRef, useState } from "react";
import { createBrowserOperationDraftStore } from "../../operation-runtime/browser-draft-store.ts";
import { useConsoleRuntimeCapabilities } from "../../../console-integration/configuration/use-console-runtime-capabilities.ts";
import {modelOperationsPreview} from "../read-model/fixtures/model-review-preview.fixture.ts";
import { modelRuntimePreviewRegistry } from "../read-model/fixtures/model-runtime.fixture.ts";
import {
  assertModelCatalogue, assertModelRegistry, assertModelRuntimeOperation, modelIdentifier, modelRecord,
  sameModelRuntimeRequest, terminalModelStates, type ModelAction, type ModelCatalogue, type ModelRegistry,
  type ModelRuntimeControl, type ModelRuntimeOperation, type ModelRuntimeRequest,
} from "../work-model/model-runtime-contract.ts";

const recoveryKey = "console:model-operations:request-reference";
const recoveryStore = createBrowserOperationDraftStore();
const base = "/api/model-operations/runtime";
async function request(path: string, body?: unknown) {
  const response = await fetch(base + path, { cache: "no-store", ...(body === undefined ? {} : {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  }) });
  const value: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const row = value && typeof value === "object" ? modelRecord(value) : {};
    throw Object.assign(new Error(typeof row.error === "string" ? row.error : "The model service could not confirm this request."), { status: response.status });
  }
  return value;
}
function remember(id: string | null) {
  try { if (id) recoveryStore.writeJson(recoveryKey, id); else recoveryStore.remove(recoveryKey); } catch { /* Page-only recovery remains available. */ }
}
export function useModelRuntime() {
  const {pageSize}=useRegisterPageSize("Model operation history");
  const capabilities = useConsoleRuntimeCapabilities();
  const dataMode = capabilities.status === "current" ? capabilities.projection?.mode : capabilities.status === "unavailable" ? "invalid" : null;
  const preview = dataMode === "disconnected-preview";
  const [registry, setRegistry] = useState<ModelRegistry | null>(null);
  const [catalogue, setCatalogue] = useState<ModelCatalogue | null>(null);
  const [operation, setOperation] = useState<ModelRuntimeOperation | null>(null);
  const [records, setRecords] = useState<ModelRuntimeOperation[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  type HistoryPosition = {cursor: string | null; offset: number};
  const [historyPosition,setHistoryPosition]=useState<HistoryPosition>({cursor:null,offset:0});
  const [historyTrail,setHistoryTrail]=useState<HistoryPosition[]>([]);
  const [historySize,setHistorySize]=useState(pageSize);
  if(historySize!==pageSize){setHistorySize(pageSize);setHistoryPosition({cursor:null,offset:0});setHistoryTrail([]);}
  const historyPositionRef=useRef(historyPosition);historyPositionRef.current=historyPosition;
  const historyFlight=useRef<Promise<void>|null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState(false), [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false), [readingMore, setReadingMore] = useState(false);
  const refreshReads = useRef(0);
  const [fresh, setFresh] = useState(false);
  const [lookupMissing, setLookupMissing] = useState(false);
  const sequence = useRef(0), backendSequence = useRef(0), selected = useRef<string | null>(null), alive = useRef(true);
  const unconfirmedControl = useRef<{ requestId: string; input: ModelRuntimeControl } | null>(null);
  selected.current = selectedId;
  const showError = useCallback((cause: unknown) => { if (alive.current) { setFresh(false); setError(cause instanceof Error ? cause.message : "Model operation unavailable."); } }, []);
  const readWindow=useCallback((cursor:string|null)=>readRegisterWindow({cursor,pageSize,scope:"Model operation history",identity:(row:ModelRuntimeOperation)=>row.request_id,readPage:async nativeCursor=>{
    const list=modelRecord(await request("/requests"+(nativeCursor?"?"+new URLSearchParams({cursor:nativeCursor}):"")));
    if(!Array.isArray(list.requests)||list.requests.length>100||list.next_cursor!==null&&typeof list.next_cursor!=="string")throw Error("Model-operation history is unavailable.");
    return {rows:list.requests.map(value=>assertModelRuntimeOperation(value)),nextCursor:list.next_cursor as string|null};
  }}),[pageSize]);
  const refresh = useCallback(async () => {
    if(historyFlight.current)await historyFlight.current;
    const current = ++sequence.current;
    if (dataMode !== "live") {
      setRegistry(dataMode === "disconnected-preview" ? modelRuntimePreviewRegistry() : null);
      setRecords(dataMode === "disconnected-preview" ? modelOperationsPreview() : []);
      setFresh(false);
      setError(dataMode === "invalid" ? "Model service configuration is unavailable." : null);
      return null;
    }
    refreshReads.current++; setRefreshing(true);
    try {
      const [rawRegistry, window] = await Promise.all([request("/registry"), readWindow(historyPositionRef.current.cursor)]);
      const next=assertModelRegistry(rawRegistry),page=window.rows;
      if (alive.current && current === sequence.current) {
        setRegistry(next); setRecords(page); setCursor(window.nextCursor);
        setFresh(true); setError(null);
      }
      return next;
    } catch (cause) { if (alive.current && current === sequence.current) setFresh(false); showError(cause); throw cause; }
    finally { refreshReads.current--; if (alive.current && refreshReads.current === 0) setRefreshing(false); }
  }, [dataMode, showError,readWindow]);
  const loadOperation = useCallback(async (id: string) => {
    if(dataMode === "disconnected-preview"){const sample=modelOperationsPreview().find(item=>item.request_id===id);if(!sample)return null;if(alive.current&&selected.current===id)setOperation(sample);return sample;}
    if(dataMode !== "live")return null;
    let next: ModelRuntimeOperation;
    try {
      next = assertModelRuntimeOperation(await request("/requests/" + encodeURIComponent(id)), id);
      if (alive.current && selected.current === id) setLookupMissing(false);
    } catch (cause) {
      if (alive.current && selected.current === id) setLookupMissing(Boolean(cause && typeof cause === "object" && modelRecord(cause).status === 404));
      throw cause;
    }
    if (unconfirmedControl.current?.requestId === id && unconfirmedControl.current.input.expected_revision !== next.revision) unconfirmedControl.current = null;
    if (alive.current && selected.current === id) {
      setOperation(next); setError(null);
      setRecords(current => current.map(item => item.request_id === id ? next : item));
    }
    if (terminalModelStates.has(next.state)) void refresh().catch(() => undefined);
    return next;
  }, [dataMode, refresh]);
  const selectOperation = useCallback(async (id: string) => {
    selected.current = id; setSelectedId(id); setOperation(null); setLookupMissing(false); if(dataMode === "live")remember(id);
    try { return await loadOperation(id); } catch (cause) { showError(cause); return null; }
  }, [dataMode, loadOperation, showError]);
  useEffect(() => {
    alive.current = true;
    void refresh().catch(() => undefined);
    if (dataMode !== "live") return () => { alive.current = false; sequence.current++; };
    const id = recoveryStore.readJson(recoveryKey, value => modelIdentifier(value) ? value : null);
    if (id) void selectOperation(id);
    return () => { alive.current = false; sequence.current++; backendSequence.current++; };
  }, [dataMode, refresh, selectOperation]);
  useEffect(() => {
    if (dataMode !== "live") return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const current = ++sequence.current;
      void request("/registry").then(raw => {
        const next = assertModelRegistry(raw);
        if (alive.current && current === sequence.current) { setRegistry(next); setFresh(true); setError(null); }
      }).catch(showError);
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [dataMode, showError]);
  useEffect(() => {
    if (!operation || !["queued", "running", "awaiting-account"].includes(operation.state)) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadOperation(operation.request_id).catch(showError);
    }, 2_000);
    return () => window.clearInterval(timer);
  }, [operation, loadOperation, showError]);
  const discover = useCallback(async (backend: string) => {
    if(dataMode === "disconnected-preview"){setCatalogue({backend_id:backend,models:[{model:"Sample new model",supported_efforts:["medium","high"],model_digest:null,runtime_version:"Sample runtime"}]});return;}
    if (dataMode !== "live") return;
    const version = ++backendSequence.current; setPending(true); setCatalogue(null);
    try {
      const next = assertModelCatalogue(await request("/catalogue?" + new URLSearchParams({ backend_id: backend })), backend);
      if (alive.current && version === backendSequence.current) { setCatalogue(next); setError(null); }
    } catch (cause) { showError(cause); }
    finally { if (alive.current) setPending(false); }
  }, [dataMode, showError]);
  const submit = useCallback(async (action: ModelAction, input: Record<string, unknown>, revision: number) => {
    if (dataMode !== "live") throw new Error("Model changes require a current owner connection.");
    const id = "model-operation:console-" + crypto.randomUUID();
    const intent: ModelRuntimeRequest = { schema_version: 1, request_id: id, idempotency_key: id + ":submit", expected_configuration_revision: revision, action, input };
    selected.current = id; setSelectedId(id); setOperation(null); setLookupMissing(false); remember(id); setPending(true); setError(null);
    try {
      const result = assertModelRuntimeOperation(await request("/requests", intent), id);
      if (alive.current) setOperation(result);
      if (terminalModelStates.has(result.state)) await refresh();
      return result;
    } catch (cause) {
      showError(cause);
      // Read the original ID once after a lost acknowledgement. Never retry
      // the mutation with a new ID or silently change its expected revision.
      try {
        const confirmed = await loadOperation(id);
        if (!confirmed || !sameModelRuntimeRequest(confirmed.request, intent)) throw cause;
        return confirmed;
      } catch { throw cause; }
    } finally { if (alive.current) setPending(false); }
  }, [dataMode, loadOperation, refresh, showError]);
  const control = useCallback(async (action: "retry" | "reconcile" | "cancel") => {
    if (dataMode !== "live" || !operation) return;
    const id = operation.request_id; setPending(true);
    try {
      const retained = unconfirmedControl.current;
      if (retained && retained.requestId === id && retained.input.action !== action) throw new Error("Check the original control before choosing a different action.");
      const input = retained?.requestId === id ? retained.input : {
        control_id: "model-control:" + crypto.randomUUID(), expected_revision: operation.revision, action,
      };
      unconfirmedControl.current = { requestId: id, input };
      const result = assertModelRuntimeOperation(await request("/requests/" + encodeURIComponent(id) + "/controls", input), id);
      unconfirmedControl.current = null;
      if (alive.current && selected.current === id) { setOperation(result); setError(null); }
      if (terminalModelStates.has(result.state)) await refresh();
    } catch (cause) { showError(cause); }
    finally { if (alive.current) setPending(false); }
  }, [dataMode, operation, refresh, showError]);
  const readHistoryPage = useCallback(async (target: HistoryPosition, trail: HistoryPosition[]) => {
    if(dataMode!=="live")return;
    if(historyFlight.current)return historyFlight.current;
    const task=(async()=>{const ticket=++sequence.current;setReadingMore(true);
    try {
      const window=await readWindow(target.cursor),rows=window.rows;
      if(alive.current&&ticket===sequence.current){setRecords(rows);setCursor(window.nextCursor);setHistoryPosition(target);setHistoryTrail(trail);setError(null);}
    }catch(cause){if(ticket===sequence.current)showError(cause);}
    finally{if(alive.current)setReadingMore(false);}})();
    historyFlight.current=task;try{await task;}finally{if(historyFlight.current===task)historyFlight.current=null;}
  },[dataMode,showError,readWindow]);
  const loadMore=()=>cursor?readHistoryPage({cursor,offset:historyPosition.offset+records.length},[...historyTrail,historyPosition]):Promise.resolve();
  const previousHistory=()=>historyTrail.length?readHistoryPage(historyTrail.at(-1)!,historyTrail.slice(0,-1)):Promise.resolve();
  const clearCatalogue=useCallback(()=>{backendSequence.current++;setCatalogue(null);},[]);
  return {
    registry, catalogue, operation, records, cursor, selectedId, pending, refreshing, readingMore, fresh, error, lookupMissing, preview, dataMode,
    refresh, discover, submit, control, selectOperation, loadMore, previousHistory,
    restartHistory:()=>{const first={cursor:null,offset:0};historyPositionRef.current=first;setHistoryPosition(first);setHistoryTrail([]);return refresh();}, historyOffset:historyPosition.offset, historyPage:historyTrail.length+1, hasPreviousHistory:historyTrail.length>0,
    checkOriginal: () => selectedId ? loadOperation(selectedId).catch(showError) : Promise.resolve(),
    clearSelection: () => { if(dataMode === "live")remember(null); selected.current = null; setSelectedId(null); setOperation(null); setError(null); },
    clearCatalogue,
  };
}
