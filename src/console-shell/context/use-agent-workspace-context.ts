"use client";
import { useEffect, useMemo, useState } from "react";
import { agentContextSources, buildAgentWorkspaceContext, projectAgentOwnerSnapshot, type AgentContextSource, type AgentOwnerSnapshots, type ConsoleOwnerPage } from "./agent-workspace-context";
import type { ConsoleWorkspaceId } from "../../console-architecture";
import type { ConsoleOwnerReads } from "../../console-integration/live-attention";
import type { LifecycleTransitionLiveSnapshot } from "../../lifecycle-transitions";
import { readRepositoryCustodyRegister } from "../../domain-workspaces/repository";
import { readRepositoryRegistrationLookups } from "../../workspace-registry/workspace-repository-status";
import { useProposalCollectionRead } from "../../domain-workspaces/proposal";

export function useAgentWorkspaceContext(
  workspaceId: ConsoleWorkspaceId | null,
  lifecycle: LifecycleTransitionLiveSnapshot | null,
) {
  const proposals = useProposalCollectionRead();
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
      await Promise.all(Object.entries(agentContextSources).map(async ([key, path]) => {
        if (key === "lifecycle" || key === "proposals") return;
        const source = key as AgentContextSource;
        try {
          const boundedFetch: typeof fetch = (input, init) => fetch(input, { ...init, signal: deadline });
          if (key === "repositories") {
            // Global attention reads one current record per repository, never
            // every creation/link request. The existing lifetime bounds this read.
            const records: Awaited<ReturnType<typeof readRepositoryCustodyRegister>>["records"] = [];
            const seen = new Set<string>();
            let cursor: string | null = null;
            do {
              const page = await readRepositoryCustodyRegister(boundedFetch, {view: "register", cursor, signal: deadline});
              records.push(...page.records);
              cursor = page.next_cursor;
              if (cursor && seen.has(cursor)) throw new Error("Repository pagination did not advance");
              if (cursor) seen.add(cursor);
            } while (cursor);
            const capturedAt = new Date().toISOString();
            if (!stopped) {
              setSnapshots(current => ({ ...current, repositories: projectAgentOwnerSnapshot("repositories", { mode: "live", status: "current", records }, capturedAt) }));
            }
            const repositoryRead = { state: "current" as const, payload: records, capturedAt };
            try {
              const names = records.map(record => record.request.requested_custody.workspace_owner_ref)
                .filter(value => value?.startsWith("repo:")).map(value => value!.slice(5));
              const lookup = await readRepositoryRegistrationLookups(names, { fetchImpl: boundedFetch, signal: deadline });
              // This read informs attention only; it is not an automatic model
              // context source or permission to export private project records.
              if (!stopped) setOwnerReads(current => ({ ...current, repositories: repositoryRead,
                repositoryRegistrations: { state: "current", payload: lookup, capturedAt: new Date().toISOString() } }));
            } catch {
              if (!stopped) setOwnerReads(current => ({ ...current, repositories: repositoryRead,
                repositoryRegistrations: { state: "unavailable", payload: null, capturedAt: new Date().toISOString() } }));
            }
            return;
          }
          const response = await boundedFetch(path, { cache: "no-store" });
          if (!response.ok) throw new Error("Owner read unavailable");
          const payload: unknown = await response.json();
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
  const proposalSnapshot = useMemo(() => {
    if (!proposals.collection) return undefined;
    const capturedAt = proposals.collection.observedAt;
    try { return projectAgentOwnerSnapshot("proposals", proposals.collection, capturedAt); }
    catch { return {state:"unavailable" as const,detail:"Owner read unavailable",revision:null,capturedAt}; }
  }, [proposals.collection]);
  return useMemo(() => {
    const lifecycleSnapshot = !lifecycle ? undefined : lifecycle.status === "current" && !lifecycle.error
      ? projectAgentOwnerSnapshot("lifecycle", lifecycle, lifecycle.observedAt)
      : { state: "unavailable" as const, detail: "Owner read unavailable", revision: null, capturedAt: lifecycle.observedAt };
    const combined = { ...snapshots, proposals: proposalSnapshot, lifecycle: lifecycleSnapshot };
    const reads = proposalSnapshot ? { ...ownerReads, proposals: {
      state: proposalSnapshot.state, capturedAt: proposalSnapshot.capturedAt,
      payload: proposalSnapshot.state === "current" ? proposals.collection : null,
    } } : ownerReads;
    const projectedAt = new Date().toISOString();
    return {
      workspace: buildAgentWorkspaceContext(combined, projectedAt),
      page: workspaceId ? buildAgentWorkspaceContext(combined, projectedAt, workspaceId) : null,
      pageFor: (page: ConsoleOwnerPage) => buildAgentWorkspaceContext(combined, projectedAt, page),
      proposals,
      ownerReads: lifecycleSnapshot ? { ...reads, lifecycle: {
        state: lifecycleSnapshot.state,
        capturedAt: lifecycleSnapshot.capturedAt,
        payload: lifecycleSnapshot.state === "unavailable" ? null : lifecycle,
      } } : reads,
      ownerReadAt: now,
    };
  }, [snapshots, now, workspaceId, ownerReads, lifecycle, proposals, proposalSnapshot]);
}
