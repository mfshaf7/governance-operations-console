"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  readSavedProjectOverview, readSavedProjectRun, readSavedProjectRunIntent,
  type SavedProjectOverview, type SavedProjectRun, type SavedProjectRunIntent,
} from "../saved-project-runtime-contract.ts";
import type { SourceDraft } from "../source-editor-contract.ts";

const activePhases = new Set(["acknowledged", "preparing", "building", "starting"]);
const definiteRejections = new Set(["project_runtime_command_invalid", "project_runtime_selection_changed",
  "project_runtime_revision_stale", "project_runtime_setup_unavailable"]);

class RuntimeResponseError extends Error {
  constructor(message: string, readonly code: string | undefined, readonly status: number) { super(message); }
}

async function callRuntime(endpoint: string, signal: AbortSignal, body?: unknown) {
  const response = await fetch(endpoint, { cache: "no-store", signal, headers: { Accept: "application/json",
    ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
  ...(body === undefined ? {} : { method: "POST", body: JSON.stringify(body) }) });
  const payload = await response.json();
  if (!response.ok) throw new RuntimeResponseError(payload.error || "The runtime result is unavailable.", payload.code, response.status);
  return payload.projection as unknown;
}

export function useSavedProjectRuntime(endpoint: string | undefined) {
  const [overview, setOverview] = useState<SavedProjectOverview | null>(null);
  const [latest, setLatest] = useState<SavedProjectRun | null>(null);
  const [original, setOriginal] = useState<SavedProjectRunIntent | null>(null);
  const [fault, setFault] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [showRetry, setShowRetry] = useState(false);
  const active = useRef<AbortController | null>(null), reading = useRef(false), submitting = useRef(false);
  const storageKey = `saved-project-runtime:${endpoint}`;

  const remember = useCallback((value: SavedProjectRunIntent | null) => {
    setOriginal(value);
    try {
      if (value) sessionStorage.setItem(storageKey, JSON.stringify(value));
      else sessionStorage.removeItem(storageKey);
    } catch { /* The exact command remains in this editor when tab storage is unavailable. */ }
  }, [storageKey]);

  const refresh = useCallback(async (earlier: number | null = null) => {
    const signal = active.current?.signal;
    if (!endpoint || !signal || signal.aborted || reading.current) return;
    reading.current = true;
    setChecking(true);
    if (!earlier) setConfirmed(false);
    try {
      const data = readSavedProjectOverview(await callRuntime(`${endpoint}${earlier ? `?before=${earlier}` : ""}`, signal));
      if (signal.aborted) return;
      setOverview(current => {
        if (!earlier || !current || current.project_ref !== data.project_ref || data.revision !== current.revision) return data;
        const seen = new Set(current.records.map(run => run.acknowledgement.command_id));
        return { ...data, records: [...current.records, ...data.records.filter(run => !seen.has(run.acknowledgement.command_id))] };
      });
      if (!earlier && !submitting.current) setLatest(data.records[0] ?? null);
    } catch (failure) {
      if (signal.aborted) return;
      setOverview(null);
      setFault(failure instanceof Error ? failure.message : "The shared runtime could not be read.");
    } finally {
      if (!signal.aborted) { reading.current = false; setChecking(false); }
    }
  }, [endpoint]);

  useEffect(() => {
    if (!endpoint) return;
    active.current = new AbortController();
    reading.current = false; submitting.current = false;
    setOverview(null); setLatest(null); setFault(null); setOriginal(null);
    try {
      const pending = sessionStorage.getItem(storageKey);
      if (pending) setOriginal(readSavedProjectRunIntent(JSON.parse(pending)));
    } catch { /* Retained owner history is still available. */ }
    void refresh();
    return () => { active.current?.abort(); };
  }, [endpoint, refresh, storageKey]);

  const act = useCallback(async (command: SavedProjectRunIntent, action: "run" | "read") => {
    const signal = active.current?.signal;
    if (!endpoint || !signal || signal.aborted || submitting.current) return;
    submitting.current = true;
    setBusy(true); setConfirmed(false); setFault(null); setShowRetry(false);
    try {
      const path = action === "run" ? `${endpoint}/run` : `${endpoint}/commands/${encodeURIComponent(command.command_id)}`;
      const result = readSavedProjectRun(await callRuntime(path, signal, action === "run" ? command : {}));
      if (result.acknowledgement.command_id !== command.command_id || result.source_revision !== command.source_revision ||
          result.source_digest !== command.source_digest || result.configuration_revision !== command.configuration_revision) {
        throw Error("The owner returned a result for different saved source.");
      }
      if (signal.aborted) return;
      setLatest(result);
      setConfirmed(result.status === "ready" && !!result.observation);
      if (!activePhases.has(result.status) && result.status !== "unknown") remember(null);
      if (result.status === "unknown") setFault("The owner has not confirmed the outcome. Check this original run before starting another.");
      setOverview(current => current ? { ...current,
        revision: Math.max(current.revision, result.acknowledgement.scope_revision),
        records: [result, ...current.records.filter(run => run.acknowledgement.command_id !== command.command_id)]
          .sort((left, right) => right.acknowledgement.scope_revision - left.acknowledgement.scope_revision),
      } : current);
    } catch (failure) {
      if (signal.aborted) return;
      if (failure instanceof RuntimeResponseError && action === "run" && (failure.status === 403 || definiteRejections.has(failure.code ?? ""))) {
        remember(null);
      }
      if (failure instanceof RuntimeResponseError && action === "read" && failure.status === 404) setShowRetry(true);
      setFault(failure instanceof Error ? failure.message : "The original run has not been confirmed.");
    } finally {
      if (!signal.aborted) { submitting.current = false; setBusy(false); }
    }
  }, [endpoint, remember]);

  useEffect(() => {
    if (!original || !latest || busy || fault || !activePhases.has(latest.status) ||
        latest.acknowledgement.command_id !== original.command_id) return;
    const timer = setTimeout(() => void act(original, "read"), 3500);
    return () => clearTimeout(timer);
  }, [act, busy, fault, latest, original]);

  function run(draft: SourceDraft) {
    if (!overview || busy || submitting.current || original || draft.accepted || !draft.provenance) return;
    const command = { command_id: `saved-run:${crypto.randomUUID()}`, expected_revision: overview.revision,
      source_revision: draft.revision, source_digest: draft.digest, configuration_revision: overview.setup.configuration_revision };
    remember(command);
    void act(command, "run");
  }

  function check() {
    const command = original ?? (latest && {
      command_id: latest.acknowledgement.command_id, expected_revision: latest.acknowledgement.scope_revision - 1,
      source_revision: latest.source_revision, source_digest: latest.source_digest,
      configuration_revision: latest.configuration_revision,
    });
    if (command) void act(command, "read");
  }

  return { overview, latest, busy, checking, confirmed, fault, original, showRetry, run,
    refresh, check,
    retry: () => original && void act(original, "run"),
    loadOlder: () => overview?.before && void refresh(overview.before) };
}
