"use client";
import { useEffect, useState } from "react";
import { assertRepositoryConnections, type RepositoryConnections } from "./repository-connections.ts";

export function useRepositoryConnections(enabled: boolean) {
  const [value, setValue] = useState<RepositoryConnections | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled) { setValue(null); setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true); setError(null);
    void fetch("/api/repositories/custody/connections", {cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12_000)])})
      .then(async response => {
        if (!response.ok) throw new Error("GitHub connections could not be loaded. Reopen this workspace to retry.");
        return assertRepositoryConnections(await response.json());
      }).then(result => { if (!controller.signal.aborted) setValue(result); })
      .catch(failure => { if (!controller.signal.aborted) { setValue(null); setError(failure instanceof Error ? failure.message : "GitHub connections are unavailable."); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [enabled, attempt]);
  return {value, loading, error, retry: () => setAttempt(current => current + 1)};
}
