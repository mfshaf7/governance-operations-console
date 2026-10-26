"use client";
import { useEffect, useMemo, useState } from "react";
import { agentContextSources, buildAgentWorkspaceContext, projectAgentOwnerSnapshot, type AgentContextSource, type AgentOwnerSnapshots, type ConsoleOwnerPage } from "./agent-workspace-context";
import type { ConsoleWorkspaceId } from "../../console-architecture";
import type { ConsoleOwnerReads } from "../../console-integration/live-attention";
import { readRepositoryCustodyRegister } from "../../domain-workspaces/repository";

export function useAgentWorkspaceContext(workspaceId: ConsoleWorkspaceId | null) {
  const [snapshots, setSnapshots] = useState<AgentOwnerSnapshots>({});
  const [ownerReads, setOwnerReads] = useState<ConsoleOwnerReads>({});
  const [now, setNow] = useState(() => new Date().toISOString());
  useEffect(() => {
    let stopped = false; let refreshing = false; let lastRefresh = 0;
    const lifetime = new AbortController();
    async function refresh() {
      if (stopped) return;
      setNow(new Date().toISOString());
      if (refreshing || document.visibilityState === "hidden" || Date.now() - lastRefresh < 90_000) return;
      lastRefresh = Date.now();
      refreshing = true;
      const deadline = AbortSignal.any([lifetime.signal, AbortSignal.timeout(80_000)]);
      await Promise.all(Object.entries({ ...agentContextSources, repositories: "/api/repositories/custody/requests" }).map(async ([key, path]) => {
        const source = key as AgentContextSource;
        try {
          const boundedFetch: typeof fetch = (input, init) => fetch(input, { ...init, signal: deadline });
          if (key === "repositories") {
            const records = await readRepositoryCustodyRegister(boundedFetch);
            if (!stopped) {
              const capturedAt = new Date().toISOString();
              setOwnerReads(current => ({ ...current, repositories: { state: "current", payload: records, capturedAt } }));
              setSnapshots(current => ({ ...current, repositories: projectAgentOwnerSnapshot("repositories", { mode: "live", status: "current", records }, capturedAt) }));
            }
            return;
          }
          const response = await boundedFetch(path, { cache: "no-store" });
          if (!response.ok) throw new Error("Owner read unavailable");
          const payload = await response.json();
          const capturedAt = new Date().toISOString();
          const snapshot = projectAgentOwnerSnapshot(source, payload, capturedAt);
          if (!stopped) { setSnapshots(current => ({ ...current, [source]: snapshot })); setOwnerReads(current => ({ ...current, [source]: { state: snapshot.state, payload, capturedAt } })); setNow(capturedAt); }
        } catch {
          if (!stopped) { setSnapshots(current => ({ ...current, [source]: { state: "unavailable", detail: "Owner read unavailable", revision: null, capturedAt: new Date().toISOString() } })); setOwnerReads(current => ({ ...current, [key]: { state: "unavailable", payload: null, capturedAt: new Date().toISOString() } })); }
        }
      }));
      refreshing = false;
      if (!stopped) setNow(new Date().toISOString());
    }
    void refresh();
    const interval = setInterval(() => { setNow(new Date().toISOString()); void refresh(); }, 15_000);
    document.addEventListener("visibilitychange", refresh); window.addEventListener("focus", refresh);
    return () => { stopped = true; lifetime.abort(); clearInterval(interval); document.removeEventListener("visibilitychange", refresh); window.removeEventListener("focus", refresh); };
  }, []);
  return useMemo(() => ({ workspace: buildAgentWorkspaceContext(snapshots, now), page: workspaceId ? buildAgentWorkspaceContext(snapshots, now, workspaceId) : null, pageFor: (page: ConsoleOwnerPage) => buildAgentWorkspaceContext(snapshots, now, page), ownerReads, ownerReadAt: now }), [snapshots, now, workspaceId, ownerReads]);
}
