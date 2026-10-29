"use client";
import { useEffect, useState } from "react";
import type { GovernanceActivitySnapshot } from "./governance-activity-types.ts";
const refreshIntervalMs = 20000;
const loadingSnapshot: GovernanceActivitySnapshot = { error: null, events: [], mode: "live", observedAt: new Date(0).toISOString(), sources: [], status: "partial", truncated: false };
export function useGovernanceActivityRuntime() {
    const [snapshot, setSnapshot] = useState<GovernanceActivitySnapshot>(loadingSnapshot);
    useEffect(() => {
        let stopped = false, busy = false, timer: ReturnType<typeof setTimeout> | undefined;
        const lifetime = new AbortController();
        async function refresh() {
            if (stopped || busy || document.visibilityState === "hidden")
                return;
            busy = true;
            if (timer)
                clearTimeout(timer);
            try {
                const response = await fetch("/api/governance-activity", { cache: "no-store", headers: { Accept: "application/json" }, signal: AbortSignal.any([lifetime.signal, AbortSignal.timeout(15000)]) });
                const body = await response.json().catch(() => null);
                if (!stopped)
                    setSnapshot(parseRuntimeSnapshot(body, response.ok));
            }
            catch {
                if (!stopped)
                    setSnapshot(previous => ({ ...previous, error: "Governance Activity refresh is unavailable. Retained events are not a current observation.", observedAt: new Date().toISOString(), status: "offline", sources: previous.sources.map(source => ({ ...source, state: "stale" })) }));
            }
            finally {
                busy = false;
                if (!stopped)
                    timer = setTimeout(refresh, refreshIntervalMs);
            }
        }
        const onVisibility = () => { if (document.visibilityState === "visible")
            void refresh(); };
        void refresh();
        document.addEventListener("visibilitychange", onVisibility);
        return () => { stopped = true; lifetime.abort(); if (timer)
            clearTimeout(timer); document.removeEventListener("visibilitychange", onVisibility); };
    }, []);
    return snapshot;
}
function parseRuntimeSnapshot(value: unknown, responseOk: boolean): GovernanceActivitySnapshot {
    if (typeof value !== "object" || value === null || Array.isArray(value))
        return invalidSnapshot("Governance Activity returned an invalid response.");
    const result = value as Partial<GovernanceActivitySnapshot>;
    if (!["disconnected-preview", "live"].includes(String(result.mode)) || !["current", "partial", "offline"].includes(String(result.status)) || !Array.isArray(result.events) || result.events.length > 200 || !Array.isArray(result.sources) || typeof result.observedAt !== "string" || Number.isNaN(Date.parse(result.observedAt)) || typeof result.truncated !== "boolean")
        return invalidSnapshot("Governance Activity returned an invalid response.");
    if (result.continuations !== undefined && (!Array.isArray(result.continuations) || result.continuations.length > 2 || result.continuations.some(next => !["oos", "wgcf"].includes(next.owner) || typeof next.cursor !== "string" || next.cursor.length > 4096)))
        return invalidSnapshot("Governance Activity returned an invalid continuation.");
    if (!responseOk || result.status === "offline")
        return { error: typeof result.error === "string" ? result.error : "Governance Activity is unavailable.", events: [], mode: "live", observedAt: result.observedAt, sources: result.sources, status: "offline", truncated: result.truncated };
    return result as GovernanceActivitySnapshot;
}
function invalidSnapshot(error: string): GovernanceActivitySnapshot { return { ...loadingSnapshot, error, observedAt: new Date().toISOString(), status: "offline" }; }
