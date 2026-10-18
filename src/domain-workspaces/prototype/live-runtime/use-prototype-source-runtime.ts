"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PrototypeSourceAction, PrototypeSourceDraft, PrototypeSourceProjection, PrototypeSourceSummary } from "./prototype-source-types.ts";

const base = "/api/prototypes/source-requests";
export function usePrototypeSourceRuntime(prototypeId: string) {
  const [requests, setRequests] = useState<PrototypeSourceSummary[]>([]), [projection, setProjection] = useState<PrototypeSourceProjection | null>(null);
  const [draft, setDraft] = useState<PrototypeSourceDraft | null>(null), [error, setError] = useState<string | null>(null), [pending, setPending] = useState(false);
  const identity = useRef(prototypeId), selectedId = useRef<string | null>(null), busy = useRef(false); identity.current = prototypeId;
  const refresh = useCallback(async (requestId: string | null = selectedId.current) => {
    const expected = identity.current;
    try {
      const all = await read<PrototypeSourceSummary[]>(base);
      if (!Array.isArray(all)) throw new Error("Source request list is unavailable.");
      const matches = all.filter(value => value.prototype_id === expected).sort((a, b) => b.created_at.localeCompare(a.created_at));
      const selected = requestId ?? matches[0]?.request_id ?? null;
      const current = selected ? await read<PrototypeSourceProjection>(`${base}/${encodeURIComponent(selected)}`) : null;
      if (current && (current.prototype_id !== expected || current.request_id !== selected)) throw new Error("Another Prototype source request was returned.");
      if (identity.current !== expected) return;
      selectedId.current = selected; setRequests(matches); setProjection(current); setError(null);
      setDraft(previous => previous && previous.request_id === current?.request_id && previous.revision === current.realization?.revision ? previous : null);
    } catch (caught) { if (identity.current === expected) { setProjection(null); setDraft(null); setError(caught instanceof Error ? caught.message : "Canonical source state unavailable."); } }
  }, []);
  useEffect(() => { selectedId.current = null; setProjection(null); setDraft(null); setRequests([]); void refresh(null); }, [prototypeId, refresh]);
  async function run(operation: () => Promise<void>) {
    if (busy.current) return; busy.current = true; setPending(true); setError(null); const expected = identity.current;
    try { await operation(); }
    catch (caught) { if (identity.current === expected) setError(caught instanceof Error ? caught.message : "The retained source operation was not confirmed."); }
    finally { busy.current = false; if (identity.current === expected) setPending(false); }
  }
  return { requests, projection, draft, error, pending, refresh,
    create: (objective: string, sourceRevision: string) => run(async () => {
      const expected = identity.current;
      const value = await read<PrototypeSourceProjection>(base, { schema_version: 1, request_id: `prototype-source-request:console:${crypto.randomUUID()}`, prototype_id: expected,
        expected_registry_revision: sourceRevision, expected_source_revision: sourceRevision, objective, requested_at: new Date().toISOString() });
      if (identity.current === expected) await refresh(value.request_id);
    }),
    inspectDraft: () => run(async () => {
      if (!projection) throw new Error("Select the retained source request first.");
      const value = await read<PrototypeSourceDraft>(`${base}/${encodeURIComponent(projection.request_id)}/draft`);
      if (value.request_id !== projection.request_id || value.revision !== projection.realization?.revision || value.digest !== projection.realization.attempt?.change_set?.digest) throw new Error("The draft changed; refresh before exact inspection and acceptance.");
      if (identity.current === projection.prototype_id) setDraft(value);
    }),
    command: (action: PrototypeSourceAction, sourceIntentRef: string | null, reason?: string) => run(async () => {
      if (!projection) throw new Error("Select the retained source request first.");
      if (action === "accept" && (!draft || draft.digest !== projection.realization?.attempt?.change_set?.digest || draft.revision !== projection.realization.revision)) throw new Error("Inspect this exact current source draft before accepting it.");
      const value = { action, commandId: `console-source:${crypto.randomUUID()}`, requestedAt: new Date().toISOString(), sourceIntentRef,
        expectedRevision: projection.realization?.revision ?? projection.updated_at,
        ...(action === "accept" ? { acceptedChangeSetDigest: draft!.digest } : {}), ...(action === "cancel-attempt" ? { reason } : {}) };
      await read(`${base}/${encodeURIComponent(projection.request_id)}/${action}`, value);
      if (identity.current === projection.prototype_id) await refresh(projection.request_id);
    }),
  };
}
async function read<T>(path: string, input?: unknown): Promise<T> {
  const response = await fetch(path, { cache: "no-store", ...(input === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }) });
  const value = await response.json(); if (!response.ok || value.mode !== "live" || value.error) throw new Error(value.error ?? "The canonical source owner did not confirm this operation."); return value.projection as T;
}
