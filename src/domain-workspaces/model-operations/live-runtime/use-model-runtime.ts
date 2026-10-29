"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createBrowserOperationDraftStore } from "../../operation-runtime/browser-draft-store.ts";
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
    throw Object.assign(new Error(typeof row.error === "string" ? row.error : "The model owner could not confirm this request."), { status: response.status });
  }
  return value;
}
function remember(id: string | null) {
  try { if (id) recoveryStore.writeJson(recoveryKey, id); else recoveryStore.remove(recoveryKey); } catch { /* Page-only recovery remains available. */ }
}
export function useModelRuntime() {
  const [registry, setRegistry] = useState<ModelRegistry | null>(null);
  const [catalogue, setCatalogue] = useState<ModelCatalogue | null>(null);
  const [operation, setOperation] = useState<ModelRuntimeOperation | null>(null);
  const [records, setRecords] = useState<ModelRuntimeOperation[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState(false), [error, setError] = useState<string | null>(null);
  const [fresh, setFresh] = useState(false);
  const [lookupMissing, setLookupMissing] = useState(false);
  const sequence = useRef(0), backendSequence = useRef(0), selected = useRef<string | null>(null), alive = useRef(true);
  const unconfirmedControl = useRef<{ requestId: string; input: ModelRuntimeControl } | null>(null);
  selected.current = selectedId;
  const showError = useCallback((cause: unknown) => { if (alive.current) { setFresh(false); setError(cause instanceof Error ? cause.message : "Model operation unavailable."); } }, []);
  const refresh = useCallback(async () => {
    const current = ++sequence.current;
    try {
      const [rawRegistry, rawList] = await Promise.all([request("/registry"), request("/requests")]);
      const next = assertModelRegistry(rawRegistry), list = modelRecord(rawList);
      if (!Array.isArray(list.requests)) throw new Error("Model-operation history is unavailable.");
      const page = list.requests.map(value => assertModelRuntimeOperation(value));
      if (alive.current && current === sequence.current) {
        setRegistry(next); setRecords(page); setCursor(typeof list.next_cursor === "string" ? list.next_cursor : null);
        setFresh(true); setError(null);
      }
      return next;
    } catch (cause) { if (alive.current && current === sequence.current) setFresh(false); showError(cause); throw cause; }
  }, [showError]);
  const loadOperation = useCallback(async (id: string) => {
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
      setRecords(current => [next, ...current.filter(item => item.request_id !== id)]);
    }
    if (terminalModelStates.has(next.state)) void refresh().catch(() => undefined);
    return next;
  }, [refresh]);
  const selectOperation = useCallback(async (id: string) => {
    selected.current = id; setSelectedId(id); setOperation(null); setLookupMissing(false); remember(id);
    try { return await loadOperation(id); } catch (cause) { showError(cause); return null; }
  }, [loadOperation, showError]);
  useEffect(() => {
    alive.current = true;
    void refresh().catch(() => undefined);
    const id = recoveryStore.readJson(recoveryKey, value => modelIdentifier(value) ? value : null);
    if (id) void selectOperation(id);
    return () => { alive.current = false; sequence.current++; backendSequence.current++; };
  }, [refresh, selectOperation]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const current = ++sequence.current;
      void request("/registry").then(raw => {
        const next = assertModelRegistry(raw);
        if (alive.current && current === sequence.current) { setRegistry(next); setFresh(true); setError(null); }
      }).catch(showError);
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [showError]);
  useEffect(() => {
    if (!operation || !["queued", "running", "awaiting-account"].includes(operation.state)) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadOperation(operation.request_id).catch(showError);
    }, 2_000);
    return () => window.clearInterval(timer);
  }, [operation, loadOperation, showError]);
  const discover = useCallback(async (backend: string) => {
    const version = ++backendSequence.current; setPending(true); setCatalogue(null);
    try {
      const next = assertModelCatalogue(await request("/catalogue?" + new URLSearchParams({ backend_id: backend })), backend);
      if (alive.current && version === backendSequence.current) { setCatalogue(next); setError(null); }
    } catch (cause) { showError(cause); }
    finally { if (alive.current) setPending(false); }
  }, [showError]);
  const submit = useCallback(async (action: ModelAction, input: Record<string, unknown>, revision: number) => {
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
        if (!sameModelRuntimeRequest(confirmed.request, intent)) throw cause;
        return confirmed;
      } catch { throw cause; }
    } finally { if (alive.current) setPending(false); }
  }, [loadOperation, refresh, showError]);
  const control = useCallback(async (action: "retry" | "reconcile" | "cancel") => {
    if (!operation) return;
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
  }, [operation, refresh, showError]);
  const loadMore = useCallback(async () => {
    if (!cursor) return;
    try {
      const raw = modelRecord(await request("/requests?" + new URLSearchParams({ cursor })));
      if (!Array.isArray(raw.requests)) throw new Error("Model-operation history is unavailable.");
      const next = raw.requests.map(value => assertModelRuntimeOperation(value));
      setRecords(current => [...current, ...next.filter(item => !current.some(existing => existing.request_id === item.request_id))]);
      setCursor(typeof raw.next_cursor === "string" ? raw.next_cursor : null);
    } catch (cause) { showError(cause); }
  }, [cursor, showError]);
  return {
    registry, catalogue, operation, records, cursor, selectedId, pending, fresh, error, lookupMissing,
    refresh, discover, submit, control, selectOperation, loadMore,
    checkOriginal: () => selectedId ? loadOperation(selectedId).catch(showError) : Promise.resolve(),
    clearSelection: () => { remember(null); selected.current = null; setSelectedId(null); setOperation(null); setError(null); },
    clearCatalogue: () => { backendSequence.current++; setCatalogue(null); },
  };
}
