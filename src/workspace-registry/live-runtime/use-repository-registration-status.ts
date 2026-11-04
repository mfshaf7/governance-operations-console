"use client";
import { useEffect, useState } from "react";
import { readRepositoryRegistrationLookups, type RepositoryRegistrationLookup } from "../workspace-repository-status.ts";

// Indexed, finite current-state reads. No project/history scan or per-row fanout.
export function useRepositoryRegistrationStatus(names: readonly string[], enabled: boolean) {
  const key = JSON.stringify([...new Set(names)].sort());
  const [state, setState] = useState<{ key: string; value: RepositoryRegistrationLookup | null; error: string | null }>({ key: "", value: null, error: null });
  useEffect(() => {
    if (!enabled) return;
    let active = true, pending = false;
    const lifetime = new AbortController();
    const targets = JSON.parse(key) as string[];
    const refresh = async () => {
      if (pending) return; pending = true;
      try {
        const value = await readRepositoryRegistrationLookups(targets, { signal: lifetime.signal });
        if (active) setState({ key, value, error: null });
      } catch { if (active) setState({ key, value: null, error: "Current repository registration is unavailable. Refresh before deciding its next action." }); }
      finally { pending = false; }
    };
    void refresh();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 15000);
    return () => { active = false; lifetime.abort(); window.clearInterval(timer); };
  }, [key, enabled]);
  return enabled && state.key === key ? state : { value: null, error: null };
}
