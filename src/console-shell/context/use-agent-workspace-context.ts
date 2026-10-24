"use client";
import { useEffect, useMemo, useState } from "react";
import { agentContextSources, buildAgentWorkspaceContext, projectAgentOwnerSnapshot, type AgentContextSource, type AgentOwnerSnapshots } from "./agent-workspace-context";
import type { ConsoleWorkspaceId } from "../../console-architecture";

export function useAgentWorkspaceContext(workspaceId: ConsoleWorkspaceId | null) {
  const [snapshots, setSnapshots] = useState<AgentOwnerSnapshots>({});
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
      await Promise.all(Object.entries(agentContextSources).map(async ([key, path]) => {
        const source = key as AgentContextSource;
        try {
          const response = await fetch(path, { cache: "no-store", signal: AbortSignal.any([lifetime.signal, AbortSignal.timeout(80_000)]) });
          if (!response.ok) throw new Error("Owner read unavailable");
          const snapshot = projectAgentOwnerSnapshot(source, await response.json(), new Date().toISOString());
          if (!stopped) { setSnapshots(current => ({ ...current, [source]: snapshot })); setNow(new Date().toISOString()); }
        } catch {
          if (!stopped) setSnapshots(current => ({ ...current, [source]: { state: "unavailable", detail: "Owner read unavailable", revision: null, capturedAt: new Date().toISOString() } }));
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
  return useMemo(() => ({ workspace: buildAgentWorkspaceContext(snapshots, now), page: workspaceId ? buildAgentWorkspaceContext(snapshots, now, workspaceId) : null }), [snapshots, now, workspaceId]);
}
