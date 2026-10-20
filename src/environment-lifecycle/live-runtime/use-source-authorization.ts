"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { assertSourceOperationPreparation as assertSourceAuthorizationPreparation, type SourceAuthorizationPreparation, type SourceAuthorizationSelector } from "./source-authorization-contract.ts";
import { assertPlatformOperationRecord } from "./platform-operation-contract.ts";
import type { PlatformOperationRecord } from "./platform-operation-types.ts";

const base = "/api/platform-operations/source-authorizations";
export function useSourceAuthorization(subject: SourceAuthorizationSelector, sourceStartDigest: string | null, decision: Record<string, unknown> | null = null, boundIntentRef: string | null = null) {
  const [preparation, setPreparation] = useState<SourceAuthorizationPreparation | null>(null), [error, setError] = useState<string | null>(null), [pending, setPending] = useState(false);
  const [operation, setOperation] = useState<PlatformOperationRecord | null>(null);
  const [candidates, setCandidates] = useState<SourceAuthorizationPreparation[]>([]);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(true), readyKey = useRef<string | null>(null), completedKey = useRef<string | null>(null);
  const selectedIntent = useRef<string | null>(null), refreshVersion = useRef(0);
  const selected = useRef({ subject, sourceStartDigest, decision, boundIntentRef }); selected.current = { subject, sourceStartDigest, decision, boundIntentRef };
  const pinnedDigest = useRef<string | null>(null);
  const key = `${JSON.stringify(subject)}:${sourceStartDigest ?? stableJson(decision)}:${boundIntentRef ?? ""}`;
  const activeKey = useRef(key), inFlight = useRef(false); activeKey.current = key;
  const refresh = useCallback(async () => {
    const expectedKey = activeKey.current, selection = selected.current;
    const version = ++refreshVersion.current;
    loadingRef.current = true; readyKey.current = null; setLoading(true);
    try {
      const values: unknown = await request(base);
      if (!Array.isArray(values)) throw new Error("Source scope list unavailable.");
      const sameSubject = values.map(assertSourceAuthorizationPreparation).filter(value => {
        const actual = value.source_intent.subject;
        return selection.subject.kind === "delivery" ? actual.kind === "delivery" && actual.work_item_ref === selection.subject.work_item_ref
          : selection.subject.kind === "repository-bootstrap" ? actual.kind === "repository-bootstrap" && actual.owner_repo === selection.subject.owner_repo && value.source_intent.source_start_digest === selection.sourceStartDigest
            : actual.kind === "prototype" && actual.prototype_id === selection.subject.prototype_id && value.source_intent.source_start_digest === selection.sourceStartDigest;
      }).sort((a, b) => b.created_at.localeCompare(a.created_at));
      const knownDigest = selection.sourceStartDigest ?? sameSubject.find(value => value.intent_id === selection.boundIntentRef)?.source_intent.source_start_digest ?? pinnedDigest.current;
      const matching = sameSubject.filter(value => knownDigest ? value.source_intent.source_start_digest === knownDigest : selection.decision !== null && stableJson(value.start_decision) === stableJson(selection.decision));
      let current = selectedIntent.current ? matching.find(value => value.intent_id === selectedIntent.current) ?? null : matching[0] ?? null;
      if (selectedIntent.current && !current) throw new Error("The selected authorization is not in the current canonical scope.");
      const ref = current?.operation_refs.revoke ?? current?.operation_refs.issue;
      const selectedId = current?.intent_id;
      let ownerOperation: PlatformOperationRecord | null = null;
      if (ref && current) {
        const response = await fetch(`/api/environment-operations/${encodeURIComponent(ref)}`, { cache: "no-store" });
        if (!response.ok) throw new Error("The original source operation is unavailable.");
        ownerOperation = assertPlatformOperationRecord(await response.json());
        const input = ownerOperation.command.input.source_intent as { intent_id?: string } | undefined;
        if (ownerOperation.operation_id !== ref || input?.intent_id !== current.intent_id) throw new Error("The original operation does not match the selected source intent.");
        current = assertSourceAuthorizationPreparation(await request(`${base}/${encodeURIComponent(current.intent_id)}`));
        if (current.intent_id !== selectedId) throw new Error("The selected source authorization changed during reconciliation.");
        if (selection.sourceStartDigest && current.source_intent.source_start_digest !== selection.sourceStartDigest) throw new Error("The source-start binding changed during reconciliation.");
      }
      if (activeKey.current === expectedKey && version === refreshVersion.current) { readyKey.current = expectedKey; setPreparation(current); setOperation(ownerOperation); setCandidates(sameSubject); setError(null); }
    } catch { if (activeKey.current === expectedKey && version === refreshVersion.current) { setPreparation(null); setOperation(null); setCandidates([]); setError("Canonical source authorizations are unavailable; no ambient credential is used."); } }
    finally { if (activeKey.current === expectedKey && version === refreshVersion.current) { completedKey.current = expectedKey; loadingRef.current = false; setLoading(false); } }
  }, []);
  useEffect(() => { pinnedDigest.current = null; selectedIntent.current = null; readyKey.current = null; setPreparation(null); setOperation(null); setCandidates([]); setError(null); void refresh(); }, [key, refresh]);
  async function run(operation: () => Promise<unknown>) {
    if (inFlight.current || loadingRef.current || readyKey.current !== activeKey.current) return; inFlight.current = true; const expectedKey = activeKey.current; setPending(true); setError(null);
    try { const result = assertSourceAuthorizationPreparation(await operation()); if (activeKey.current === expectedKey) { pinnedDigest.current = result.source_intent.source_start_digest; selectedIntent.current = result.intent_id; setPreparation(result); setOperation(null); await refresh(); } }
    catch (error) { if (activeKey.current === expectedKey) setError(error instanceof Error ? error.message : "Source authorization was not confirmed."); }
    finally { inFlight.current = false; setPending(false); }
  }
  const ready = readyKey.current === key && !loading && !error;
  return { preparation: ready ? preparation : null, operation: ready ? operation : null, candidates: ready ? candidates : [], error,
    ready, pending: pending || loading || completedKey.current !== key, refresh,
    select: (value: SourceAuthorizationPreparation) => {
      if (inFlight.current || loadingRef.current || !ready || !candidates.some(candidate => candidate.intent_id === value.intent_id)) return;
      pinnedDigest.current = value.source_intent.source_start_digest; selectedIntent.current = value.intent_id; setPreparation(value); setOperation(null); void refresh();
    },
    prepare: () => run(() => {
      if (preparation && preparation.authorization.state !== "revoked") throw new Error("Select a fully revoked predecessor before preparing a successor scope.");
      return request(base, { preparationId: `console-source:${crypto.randomUUID()}`, subject: selected.current.subject, decision: selected.current.decision,
        expiresAt: new Date(Date.now() + 4 * 3600_000).toISOString(), supersedesIntentDigest: preparation?.source_intent_digest ?? null });
    }),
    command: (action: "issue" | "revoke") => run(() => {
      if (!preparation) throw new Error("Prepare and review an exact source scope first.");
      return request(`${base}/${encodeURIComponent(preparation.intent_id)}`, { action, commandId: `source-approval:${crypto.randomUUID()}`, requestedAt: new Date().toISOString(), expectedIntentDigest: preparation.source_intent_digest });
    }),
  };
}
function stableJson(value: unknown): string { if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`; if (value && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`).join(",")}}`; return JSON.stringify(value); }
async function request(path: string, value?: unknown): Promise<unknown> {
  const response = await fetch(path, { cache: "no-store", ...(value === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) }) });
  const body = await response.json(); if (!response.ok || body.mode !== "live" || body.error) throw new Error(body.error ?? "Source authority did not confirm this operation."); return body.projection;
}
