"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createBrowserOperationDraftStore } from "../../operation-runtime/browser-draft-store.ts";
import {modelConnectionsPreview} from "../read-model/fixtures/model-review-preview.fixture.ts";
import { modelIdentifier, modelRecord } from "../work-model/model-runtime-contract.ts";
import {
  assertProviderConnections, assertSafeConnectionCommand, assertConnectionOperation, assertConnectionReceipt, safeCredentialCommand,
  type SafeConnectionCommand, type ConnectionAction, type ConnectionOperation, type ConnectionReceipt, type ProviderConnections,
} from "../work-model/provider-connections-contract.ts";

const recoveryKey = "console:model-operations:connection-command";
const store = createBrowserOperationDraftStore();
const base = "/api/model-operations/runtime/connections";
async function request(path: string, body?: unknown) {
  const response = await fetch(base + path, { cache: "no-store", redirect: "error", ...(body === undefined ? {} : {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  }) });
  const value: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const row = value && typeof value === "object" ? modelRecord(value) : {};
    const rejectedBeforeEffect = ["revision-conflict", "connection-in-use", "connection-limit"].includes(String(row.code).replace(/^model_operations_/, ""));
    throw Object.assign(new Error("The connection owner could not confirm this action."), { rejectedBeforeEffect });
  }
  return value;
}
export function useProviderConnections(onChanged: () => Promise<unknown>, enabled = true, preview = false) {
  const [snapshot, setSnapshot] = useState<ProviderConnections | null>(null), [fresh, setFresh] = useState(false);
  const [readError,setReadError]=useState<string|null>(null),[registryError,setRegistryError]=useState<string|null>(null);
  const receiptKnown=useRef(false);
  const [rejected, setRejected] = useState(false);
  const [error, setError] = useState<string | null>(null), [pending, setPending] = useState(false);
  const [command, setCommand] = useState<SafeConnectionCommand | null>(null), [originalId, setOriginalId] = useState<string | null>(null);
  const [operation, setOperation] = useState<ConnectionOperation | null>(null), [receipt, setReceipt] = useState<ConnectionReceipt | null>(null);
  const alive = useRef(true), inFlight = useRef(false), version = useRef(0), selected = useRef<string | null>(null);
  const remember = useCallback((safe: SafeConnectionCommand | null) => {
    setCommand(safe); setOriginalId(safe?.command_id ?? null); selected.current = safe?.command_id ?? null;
    try { if (safe) store.writeJson(recoveryKey, assertSafeConnectionCommand(safe)); else store.remove(recoveryKey); } catch { /* Canonical pending_operation remains recoverable. */ }
  }, []);
  const fail = useCallback(() => { if (alive.current) setError(receiptKnown.current?"The original operation could not be read again. Its last confirmed receipt is retained.":"Connection completion is unconfirmed. Check or reconcile the original operation; a key is never retried automatically."); }, []);
  const refresh = useCallback(async () => {
    if (!enabled) return null;
    const current = ++version.current;
    try {
      const next = assertProviderConnections(await request(""));
      if (alive.current && version.current === current) { setSnapshot(next); setFresh(true); setReadError(null); }
      return next;
    } catch (cause) { if (alive.current && version.current === current) {setFresh(false);setReadError("Current connection state could not be refreshed. Retry the read before changing connections.");} throw cause; }
  }, [enabled]);
  const check = useCallback(async (id: string, reconcile = false) => {
    if (!enabled || !modelIdentifier(id) || inFlight.current) return;
    inFlight.current = true; setPending(true);
    // A canonical pending reference may be recovered without any browser draft.
    if (selected.current !== id) { remember(null); selected.current = id; setOriginalId(id); setOperation(null); setReceipt(null);receiptKnown.current=false; }
    try {
      const next = assertConnectionOperation(await request(reconcile ? "/reconcile" : "/operations/" + encodeURIComponent(id), reconcile ? { command_id: id } : undefined), id);
      if (alive.current && selected.current === id) { setOperation(next); setReceipt(next.receipt); receiptKnown.current=Boolean(next.receipt); setError(null); }
      await refresh().catch(()=>undefined);
      if (next.state !== "pending") await onChanged().then(()=>setRegistryError(null)).catch(()=>setRegistryError("The operation is confirmed, but the model register could not be refreshed."));
    } catch { fail(); }
    finally { inFlight.current = false; if (alive.current) setPending(false); }
  }, [enabled, fail, onChanged, refresh, remember]);
  useEffect(() => {
    alive.current = true;
    if (!enabled) {setSnapshot(preview?modelConnectionsPreview():null);setFresh(false);setError(null);return () => { alive.current = false; version.current++; };}
    const safe = store.readJson(recoveryKey, value => { try { return assertSafeConnectionCommand(value); } catch { return null; } });
    if (safe) { remember(safe); void check(safe.command_id); }
    void refresh().catch(()=>undefined);
    const timer = window.setInterval(() => { if (document.visibilityState === "visible" && !inFlight.current) void refresh().catch(()=>undefined); }, 15_000);
    return () => { alive.current = false; version.current++; window.clearInterval(timer); };
  }, [check, enabled, preview, fail, refresh, remember]);
  const dispatch = useCallback(async (safe: SafeConnectionCommand, ingress?: unknown) => {
    if (!enabled || inFlight.current) return;
    inFlight.current = true; setPending(true); remember(safe); setOperation(null); setReceipt(null); receiptKnown.current=false;setError(null); setRegistryError(null);setRejected(false);
    try {
      // Raw ingress is sent once, outside the generic queued model-request store.
      const next = assertConnectionReceipt(await request(safe.action === "connection.credentials" ? "/credentials" : "/commands", ingress ?? safe));
      if (next.command_id !== safe.command_id || next.action !== safe.action) throw new Error("Connection receipt does not match its original command.");
      if (alive.current) {setReceipt(next);receiptKnown.current=true;}
      await refresh().catch(()=>undefined); await onChanged().then(()=>setRegistryError(null)).catch(()=>setRegistryError("The operation is confirmed, but the model register could not be refreshed."));
    } catch (cause) {
      if (cause && typeof cause === "object" && modelRecord(cause).rejectedBeforeEffect === true) {
        if (alive.current) { setRejected(true); setError("The owner rejected this command before applying it. Refresh, clear the rejected command and review current settings."); }
        await refresh().catch(() => undefined);
      } else fail();
    }
    finally { inFlight.current = false; if (alive.current) setPending(false); }
  }, [enabled, fail, onChanged, refresh, remember]);
  const submit = useCallback(async (action: ConnectionAction, input: SafeConnectionCommand["input"]) => {
    if (!enabled || !fresh || !snapshot) return;
    await dispatch(assertSafeConnectionCommand({ command_id: "connection:console-" + crypto.randomUUID(), expected_revision: snapshot.revision, action, input }));
  }, [dispatch, enabled, fresh, snapshot]);
  const credentials = useCallback(async (connectionId: string, apiKey: string) => {
    if (!enabled || !fresh || !snapshot) return;
    const ingress = { command_id: "connection:console-" + crypto.randomUUID(), expected_revision: snapshot.revision, connection_id: connectionId, api_key: apiKey };
    await dispatch(safeCredentialCommand(ingress), ingress);
  }, [dispatch, enabled, fresh, snapshot]);
  return {
    snapshot, fresh, error, readError, registryError, pending, rejected, command, originalId, operation, receipt, refresh, submit, credentials, check,
    replayMetadata: async () => { if (command && command.action !== "connection.credentials" && !receipt && !operation) await dispatch(command); },
    clearCompleted: () => { if (receipt || rejected || operation?.state === "cancelled") { setRejected(false); remember(null); setReceipt(null);receiptKnown.current=false; setOperation(null); setError(null); } },
  };
}
