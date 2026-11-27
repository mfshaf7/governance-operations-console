"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { assertSourceOperationPreparation as assertSourceAuthorizationPreparation, type SourceAuthorizationPreparation, type SourceAuthorizationSelector } from "./source-authorization-contract.ts";
import { assertPlatformOperationRecord } from "./platform-operation-contract.ts";
import type { PlatformOperationRecord } from "./platform-operation-types.ts";

const base = "/api/platform-operations/source-authorizations";
export type ActiveSourceSession = { sessionId: string; landingUnitId: string | null; predecessorIntentRef?: string };

function hasConfirmedAccess(value: SourceAuthorizationPreparation | null) {
  const receipt = value?.authorization.credential_receipt;
  return value?.authorization.state === "approved" && !!receipt && receipt.action !== "agent-source.revoke";
}

export function useSourceAuthorization(subject: SourceAuthorizationSelector, sourceStartDigest: string | null, decision: Record<string, unknown> | null = null, boundIntentRef: string | null = null, activeSession: ActiveSourceSession | null = null, closureSessionId: string | null = null) {
  const [preparation, setPreparation] = useState<SourceAuthorizationPreparation | null>(null), [error, setError] = useState<string | null>(null), [pending, setPending] = useState(false);
  const [operation, setOperation] = useState<PlatformOperationRecord | null>(null);
  const [candidates, setCandidates] = useState<SourceAuthorizationPreparation[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<"prepare" | "issue" | "revoke" | null>(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [previousAccess, setPreviousAccess] = useState(false);
  const retained = useRef(new Map<string, Record<string, unknown>>());
  const loadingRef = useRef(true), readyKey = useRef<string | null>(null), completedKey = useRef<string | null>(null);
  const selectedIntent = useRef<string | null>(null), refreshVersion = useRef(0);
  const selected = useRef({ subject, sourceStartDigest, decision, boundIntentRef, activeSession, closureSessionId });
  selected.current = { subject, sourceStartDigest, decision, boundIntentRef, activeSession, closureSessionId };
  const pinnedDigest = useRef<string | null>(null);
  const key = `${JSON.stringify(subject)}:${sourceStartDigest ?? stableJson(decision)}:${boundIntentRef ?? ""}:${activeSession?.sessionId ?? ""}:${activeSession?.predecessorIntentRef ?? ""}:${closureSessionId ?? ""}`;
  const activeKey = useRef(key), inFlight = useRef(false); activeKey.current = key;
  const refresh = useCallback(async () => {
    const expectedKey = activeKey.current, selection = selected.current;
    const version = ++refreshVersion.current;
    loadingRef.current = true; readyKey.current = null; setLoading(true);
    try {
      const listPath = selection.subject.kind === "delivery"
        ? `${base}?work_item_ref=${encodeURIComponent(selection.subject.work_item_ref)}` : base;
      const closure = selection.closureSessionId;
      if (closure && !selection.boundIntentRef) throw new Error("The completed session has no retained source intent.");
      const values: unknown = closure
        ? [await request(`${base}/${encodeURIComponent(selection.boundIntentRef!)}`)]
        : await request(listPath);
      if (!Array.isArray(values)) throw new Error("Source scope list unavailable.");
      const matchesSubject = (value: SourceAuthorizationPreparation) => {
        const actual = value.source_intent.subject;
        if (closure) return actual.kind === "delivery" && value.intent_id === selection.boundIntentRef && value.session_id === closure;
        return selection.subject.kind === "delivery" ? actual.kind === "delivery" && actual.work_item_ref === selection.subject.work_item_ref
          : selection.subject.kind === "repository-bootstrap" ? actual.kind === "repository-bootstrap" && actual.owner_repo === selection.subject.owner_repo && value.source_intent.source_start_digest === selection.sourceStartDigest
            : actual.kind === "prototype" && actual.prototype_id === selection.subject.prototype_id && value.source_intent.source_start_digest === selection.sourceStartDigest;
      };
      const sameSubject = values.map(assertSourceAuthorizationPreparation).filter(matchesSubject);
      if (closure && !sameSubject.length) throw new Error("The retained authorization belongs to another session.");
      const session = selection.activeSession;
      const previousRef = session?.predecessorIntentRef;
      if (session) {
        const missingRefs = [...new Set([selection.boundIntentRef, previousRef])].filter(
          (ref): ref is string => !!ref && !sameSubject.some(value => value.intent_id === ref),
        );
        const retained = await Promise.all(missingRefs.map(async ref => {
          const value = assertSourceAuthorizationPreparation(await request(`${base}/${encodeURIComponent(ref)}`));
          if (value.intent_id !== ref || !matchesSubject(value)) throw new Error("Retained access belongs to another work item.");
          return value;
        }));
        sameSubject.push(...retained);
      }
      sameSubject.sort((a, b) => b.created_at.localeCompare(a.created_at));
      const bound = sameSubject.find(value => value.intent_id === selection.boundIntentRef);
      const predecessor = sameSubject.find(value => value.intent_id === previousRef);
      const isCurrent = (value: SourceAuthorizationPreparation) => session
        ? value.intent_id !== previousRef && (
            (value.intent_id === bound?.intent_id && (value.session_id === session.sessionId || value.session_id === null) && hasConfirmedAccess(value)) ||
            (value.session_id === session.sessionId && value.source_intent.source_start_digest === selection.sourceStartDigest)
          ) : true;
      const knownDigest = selection.sourceStartDigest ?? sameSubject.find(value => value.intent_id === selection.boundIntentRef)?.source_intent.source_start_digest ?? pinnedDigest.current;
      const matching = sameSubject.filter(value => session ? isCurrent(value) : knownDigest ? value.source_intent.source_start_digest === knownDigest : selection.decision !== null && stableJson(value.start_decision) === stableJson(selection.decision));
      const prior = bound && !isCurrent(bound) ? bound : predecessor;
      const awaitingClosure = prior && prior.authorization.state !== "revoked";
      let current: SourceAuthorizationPreparation | null = matching[0] ?? prior ?? null;
      if (session && awaitingClosure) current = prior;
      if (session && bound && isCurrent(bound) && hasConfirmedAccess(bound)) current = bound;
      if (!session && selectedIntent.current) current = matching.find(value => value.intent_id === selectedIntent.current) ?? null;
      if (!session && selectedIntent.current && !current) throw new Error("The selected authorization is not in the current canonical scope.");
      const ref = current?.operation_refs.revoke ?? current?.operation_refs.issue;
      const selectedId = current?.intent_id;
      let ownerOperation: PlatformOperationRecord | null = null;
      if (ref && current) {
        const response = await fetch(`/api/environment-operations/${encodeURIComponent(ref)}`, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
        if (!response.ok) throw new Error("The original source operation is unavailable.");
        ownerOperation = assertPlatformOperationRecord(await response.json());
        const input = ownerOperation.command.input.source_intent as { intent_id?: string } | undefined;
        if (ownerOperation.operation_id !== ref || input?.intent_id !== current.intent_id) throw new Error("The original operation does not match the selected source intent.");
        current = assertSourceAuthorizationPreparation(await request(`${base}/${encodeURIComponent(current.intent_id)}`));
        if (current.intent_id !== selectedId || !matchesSubject(current)) throw new Error("The selected source authorization changed during reconciliation.");
        if (!session && selection.sourceStartDigest && current.source_intent.source_start_digest !== selection.sourceStartDigest) throw new Error("The source-start binding changed during reconciliation.");
      }
      if (activeKey.current === expectedKey && version === refreshVersion.current) {
        readyKey.current = expectedKey;
        setPreparation(current);
        setPreviousAccess(!!current && !isCurrent(current));
        setOperation(ownerOperation);
        setCandidates(session || closure ? [] : sameSubject);
        setError(null);
        setNeedsRefresh(false);
      }
    } catch { if (activeKey.current === expectedKey && version === refreshVersion.current) { setPreparation(null); setOperation(null); setCandidates([]); setError("Canonical source authorizations are unavailable; no ambient credential is used."); } }
    finally { if (activeKey.current === expectedKey && version === refreshVersion.current) { completedKey.current = expectedKey; loadingRef.current = false; setLoading(false); } }
  }, []);
  useEffect(() => { pinnedDigest.current = null; selectedIntent.current = null; readyKey.current = null; setPreparation(null); setOperation(null); setCandidates([]); setError(null); setNeedsRefresh(false); setPending(false); setPendingAction(null); void refresh(); }, [key, refresh]);
  async function run(action: "prepare" | "issue" | "revoke", operation: () => Promise<unknown>) {
    if (inFlight.current || loadingRef.current || needsRefresh || readyKey.current !== activeKey.current) return; inFlight.current = true; const expectedKey = activeKey.current; setPending(true); setPendingAction(action); setError(null);
    try { const result = assertSourceAuthorizationPreparation(await operation()); if (activeKey.current === expectedKey) { pinnedDigest.current = result.source_intent.source_start_digest; selectedIntent.current = result.intent_id; setPreparation(result); setOperation(null); await refresh(); } }
    catch (error) { if (activeKey.current === expectedKey) { readyKey.current = null; setError(error instanceof Error ? error.message : "Source authorization was not confirmed."); setNeedsRefresh(true); } }
    finally { inFlight.current = false; if (activeKey.current === expectedKey) { setPending(false); setPendingAction(null); } }
  }
  const ready = readyKey.current === key && !loading && !error && !needsRefresh;
  return { preparation: ready ? preparation : null, operation: ready ? operation : null, candidates: ready ? candidates : [], error,
    previousAccess: ready && previousAccess,
    approvedIntent: ready && !closureSessionId && !previousAccess && (activeSession ? hasConfirmedAccess(preparation) : preparation?.authorization.state === "approved") ? preparation?.intent_id ?? null : null,
    ready, pending: pending || loading || completedKey.current !== key, pendingAction, needsRefresh, refresh,
    select: (value: SourceAuthorizationPreparation) => {
      if (inFlight.current || loadingRef.current || !ready || !candidates.some(candidate => candidate.intent_id === value.intent_id)) return;
      pinnedDigest.current = value.source_intent.source_start_digest; selectedIntent.current = value.intent_id; setPreparation(value); setOperation(null); void refresh();
    },
    prepare: () => run("prepare", () => {
      if (preparation && preparation.authorization.state !== "revoked") throw new Error("Select a fully revoked predecessor before preparing a successor scope.");
      const requestKey = `${activeKey.current}:prepare:${preparation?.intent_id ?? "new"}`;
      const supersedesIntentDigest = preparation && (!activeSession || activeSession.landingUnitId === preparation.source_intent.landing_unit_id)
        ? preparation.source_intent_digest : null;
      const input = retained.current.get(requestKey) ?? { preparationId: `console-source:${crypto.randomUUID()}`, subject: selected.current.subject, decision: selected.current.decision,
        expiresAt: new Date(Date.now() + 4 * 3600_000).toISOString(), supersedesIntentDigest };
      retained.current.set(requestKey, input);
      return request(base, input);
    }),
    command: (action: "issue" | "revoke") => run(action, () => {
      if (!preparation) throw new Error("Prepare and review an exact source scope first.");
      if (action === "issue" && (previousAccess || closureSessionId)) throw new Error("This source access can only be closed.");
      const requestKey = `${preparation.intent_id}:${action}`;
      const input = retained.current.get(requestKey) ?? { action, commandId: `source-approval:${crypto.randomUUID()}`, requestedAt: new Date().toISOString(), expectedIntentDigest: preparation.source_intent_digest };
      retained.current.set(requestKey, input);
      return request(`${base}/${encodeURIComponent(preparation.intent_id)}`, input);
    }),
  };
}
function stableJson(value: unknown): string { if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`; if (value && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`).join(",")}}`; return JSON.stringify(value); }
async function request(path: string, value?: unknown): Promise<unknown> {
  try {
    const response = await fetch(path, { cache: "no-store", signal: AbortSignal.timeout(value === undefined ? 15_000 : 135_000), ...(value === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) }) });
    const body = await response.json(); if (!response.ok || body.mode !== "live" || body.error) throw new Error(body.error ?? "Source access was not confirmed. Check its recorded status before continuing."); return body.projection;
  } catch (error) {
    if (error instanceof Error && error.name !== "TypeError" && error.name !== "TimeoutError" && error.name !== "AbortError") throw error;
    throw new Error(value === undefined ? "Source access could not be loaded. Retry loading its status." : "The response was interrupted. Access may still be changing. Check the original access request before continuing.");
  }
}
